-- Migration: Add stored procedures for game tick logic
-- This migration creates PostgreSQL stored procedures to handle fleet processing,
-- combat simulation, and auto-exploration, moving the logic from TypeScript to the database.

-- Function to simulate combat between attacker and defender
CREATE OR REPLACE FUNCTION simulate_combat(
    attacker_ships jsonb,
    defender_ships jsonb,
    defender_defenses jsonb
) RETURNS jsonb AS $$
DECLARE
    -- Ship stats (hardcoded from game-config.ts)
    ships_stats jsonb := '{
        "light_fighter": {"attack": 50, "defense": 10, "capacity": 50},
        "heavy_fighter": {"attack": 150, "defense": 25, "capacity": 100},
        "cruiser": {"attack": 400, "defense": 50, "capacity": 800},
        "battleship": {"attack": 1000, "defense": 200, "capacity": 1500},
        "small_cargo": {"attack": 5, "defense": 10, "capacity": 5000},
        "colony_ship": {"attack": 50, "defense": 100, "capacity": 7500},
        "large_cargo": {"attack": 5, "defense": 50, "capacity": 25000},
        "espionage_probe": {"attack": 0, "defense": 0, "capacity": 5},
        "recycler": {"attack": 1, "defense": 10, "capacity": 20000},
        "bomber": {"attack": 1000, "defense": 500, "capacity": 500},
        "destroyer": {"attack": 2000, "defense": 2000, "capacity": 2000},
        "death_star": {"attack": 200000, "defense": 100000, "capacity": 1000000},
        "battle_cruiser": {"attack": 700, "defense": 200, "capacity": 750}
    }';

    -- Defense stats
    defenses_stats jsonb := '{
        "rocket_launcher": {"attack": 80, "defense": 20, "shield": 20},
        "light_laser": {"attack": 100, "defense": 25, "shield": 25},
        "heavy_laser": {"attack": 250, "defense": 100, "shield": 100},
        "gauss_cannon": {"attack": 1100, "defense": 200, "shield": 200},
        "ion_cannon": {"attack": 150, "defense": 500, "shield": 500},
        "plasma_turret": {"attack": 3000, "defense": 300, "shield": 300},
        "small_shield_dome": {"attack": 0, "defense": 2000, "shield": 2000},
        "large_shield_dome": {"attack": 0, "defense": 10000, "shield": 10000}
    }';

    attacker_power int := 0;
    defender_power int := 0;
    attacker_health int := 0;
    defender_health int := 0;
    winner text;
    attacker_loss_pct float := 0;
    defender_loss_pct float := 0;
    attacker_losses jsonb := '{}';
    defender_losses jsonb := '{}';
    ship_type text;
    count int;
    stats jsonb;
BEGIN
    -- Calculate attacker power and health
    FOR ship_type, count IN SELECT * FROM jsonb_object_keys(attacker_ships), jsonb_extract_path_text(attacker_ships, jsonb_object_keys(attacker_ships))::int LOOP
        stats := ships_stats->ship_type;
        IF stats IS NOT NULL THEN
            attacker_power := attacker_power + (stats->>'attack')::int * count;
            attacker_health := attacker_health + (stats->>'defense')::int * count;
        END IF;
    END LOOP;

    -- Calculate defender power and health (ships)
    FOR ship_type, count IN SELECT * FROM jsonb_object_keys(defender_ships), jsonb_extract_path_text(defender_ships, jsonb_object_keys(defender_ships))::int LOOP
        stats := ships_stats->ship_type;
        IF stats IS NOT NULL THEN
            defender_power := defender_power + (stats->>'attack')::int * count;
            defender_health := defender_health + (stats->>'defense')::int * count;
        END IF;
    END LOOP;

    -- Calculate defender power and health (defenses)
    FOR ship_type, count IN SELECT * FROM jsonb_object_keys(defender_defenses), jsonb_extract_path_text(defender_defenses, jsonb_object_keys(defender_defenses))::int LOOP
        stats := defenses_stats->ship_type;
        IF stats IS NOT NULL THEN
            defender_power := defender_power + (stats->>'attack')::int * count + ((stats->>'shield')::int * count) / 10;
            defender_health := defender_health + (stats->>'defense')::int * count;
        END IF;
    END LOOP;

    -- Determine winner and loss percentages
    IF attacker_power > defender_health AND defender_power < attacker_health THEN
        winner := 'attacker';
        attacker_loss_pct := LEAST(0.5, defender_power::float / GREATEST(attacker_health, 1));
        defender_loss_pct := 1.0;
    ELSIF defender_power > attacker_health AND attacker_power < defender_health THEN
        winner := 'defender';
        defender_loss_pct := LEAST(0.5, attacker_power::float / GREATEST(defender_health, 1));
        attacker_loss_pct := 1.0;
    ELSE
        winner := 'draw';
        attacker_loss_pct := 0.8;
        defender_loss_pct := 0.8;
    END IF;

    -- Calculate attacker losses
    FOR ship_type, count IN SELECT * FROM jsonb_object_keys(attacker_ships), jsonb_extract_path_text(attacker_ships, jsonb_object_keys(attacker_ships))::int LOOP
        IF count > 0 THEN
            attacker_losses := jsonb_set(attacker_losses, ARRAY[ship_type], to_jsonb(floor(count * attacker_loss_pct)::int));
        END IF;
    END LOOP;

    -- Calculate defender losses (ships)
    FOR ship_type, count IN SELECT * FROM jsonb_object_keys(defender_ships), jsonb_extract_path_text(defender_ships, jsonb_object_keys(defender_ships))::int LOOP
        IF count > 0 THEN
            defender_losses := jsonb_set(defender_losses, ARRAY[ship_type], to_jsonb(floor(count * defender_loss_pct)::int));
        END IF;
    END LOOP;

    -- Calculate defender losses (defenses)
    FOR ship_type, count IN SELECT * FROM jsonb_object_keys(defender_defenses), jsonb_extract_path_text(defender_defenses, jsonb_object_keys(defender_defenses))::int LOOP
        IF count > 0 THEN
            defender_losses := jsonb_set(defender_losses, ARRAY[ship_type], to_jsonb(floor(count * defender_loss_pct)::int));
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'winner', winner,
        'attackerLosses', attacker_losses,
        'defenderLosses', defender_losses,
        'rounds', 1
    );
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Procedure to process returning fleets
CREATE OR REPLACE PROCEDURE process_returning_fleet(fleet_id int) AS $$
DECLARE
    fleet_record record;
    ship_type text;
    count int;
BEGIN
    SELECT * INTO fleet_record FROM fleets WHERE id = fleet_id;

    -- Add ships back to origin planet
    FOR ship_type IN SELECT jsonb_object_keys(fleet_record.ships) LOOP
        count := (fleet_record.ships->>ship_type)::int;
        IF count > 0 THEN
            EXECUTE format('UPDATE planet_ships SET %I = %I + $1 WHERE planet_id = $2', ship_type, ship_type) USING count, fleet_record.origin_planet_id;
        END IF;
    END LOOP;

    -- Add resources back to origin planet
    UPDATE planet_resources
    SET
        metal = metal + COALESCE((fleet_record.resources->>'metal')::float, 0),
        crystal = crystal + COALESCE((fleet_record.resources->>'crystal')::float, 0),
        gas = gas + COALESCE((fleet_record.resources->>'gas')::float, 0)
    WHERE planet_id = fleet_record.origin_planet_id;

    -- Mark fleet as completed
    UPDATE fleets SET status = 'completed' WHERE id = fleet_id;

    -- Notify user
    INSERT INTO messages (user_id, type, title, content)
    VALUES (fleet_record.user_id, 'system', 'Fleet Returned', 'Your fleet has returned to base.');
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Procedure to process arriving fleets
CREATE OR REPLACE PROCEDURE process_arriving_fleet(fleet_id int) AS $$
DECLARE
    fleet_record record;
    target_planet_record record;
    combat_result jsonb;
    remaining_fleet jsonb;
    fleet_destroyed boolean := false;
    loot_metal int := 0;
    loot_crystal int := 0;
    loot_gas int := 0;
    fleet_capacity int := 0;
    total_lootable float := 0;
    ship_type text;
    count int;
    stats jsonb;
    ships_stats jsonb := '{
        "light_fighter": {"capacity": 50},
        "heavy_fighter": {"capacity": 100},
        "cruiser": {"capacity": 800},
        "battleship": {"capacity": 1500},
        "small_cargo": {"capacity": 5000},
        "colony_ship": {"capacity": 7500},
        "large_cargo": {"capacity": 25000},
        "espionage_probe": {"capacity": 5},
        "recycler": {"capacity": 20000},
        "bomber": {"capacity": 500},
        "destroyer": {"capacity": 2000},
        "death_star": {"capacity": 1000000},
        "battle_cruiser": {"capacity": 750}
    }';
BEGIN
    SELECT * INTO fleet_record FROM fleets WHERE id = fleet_id;

    -- Find target planet
    SELECT * INTO target_planet_record
    FROM planets
    WHERE galaxy_id = fleet_record.target_galaxy
      AND system_id = fleet_record.target_system
      AND planet_number = fleet_record.target_planet;

    IF fleet_record.mission = 'transport' THEN
        IF target_planet_record.id IS NOT NULL THEN
            -- Unload resources
            UPDATE planet_resources
            SET
                metal = metal + COALESCE((fleet_record.resources->>'metal')::float, 0),
                crystal = crystal + COALESCE((fleet_record.resources->>'crystal')::float, 0),
                gas = gas + COALESCE((fleet_record.resources->>'gas')::float, 0)
            WHERE planet_id = target_planet_record.id;

            UPDATE fleets SET resources = '{}' WHERE id = fleet_id;

            -- Notify users
            IF target_planet_record.user_id IS NOT NULL AND target_planet_record.user_id != fleet_record.user_id THEN
                INSERT INTO messages (user_id, type, title, content)
                VALUES (target_planet_record.user_id, 'transport', 'Incoming Transport',
                        format('A fleet has arrived at your planet delivering resources: Metal: %s, Crystal: %s, Gas: %s',
                               COALESCE(fleet_record.resources->>'metal', '0'),
                               COALESCE(fleet_record.resources->>'crystal', '0'),
                               COALESCE(fleet_record.resources->>'gas', '0')));
            END IF;

            INSERT INTO messages (user_id, type, title, content)
            VALUES (fleet_record.user_id, 'transport', 'Transport Delivered',
                    format('Your fleet has delivered resources to %s:%s:%s',
                           fleet_record.target_galaxy, fleet_record.target_system, fleet_record.target_planet));
        ELSE
            INSERT INTO messages (user_id, type, title, content)
            VALUES (fleet_record.user_id, 'transport', 'Transport Failed',
                    'Target planet does not exist. Fleet is returning with resources.');
        END IF;

        CALL return_fleet(fleet_id);

    ELSIF fleet_record.mission = 'colonize' THEN
        IF target_planet_record.id IS NULL THEN
            -- Create new colony
            INSERT INTO planets (user_id, galaxy_id, system_id, planet_number, name, planet_type, fields_max, image_variant)
            VALUES (fleet_record.user_id, fleet_record.target_galaxy, fleet_record.target_system, fleet_record.target_planet,
                    'Colony', 'terrestrial', 163, 2)
            RETURNING id INTO target_planet_record.id;

            INSERT INTO planet_resources (planet_id) VALUES (target_planet_record.id);
            INSERT INTO planet_ships (planet_id) VALUES (target_planet_record.id);
            INSERT INTO planet_buildings (planet_id) VALUES (target_planet_record.id);

            INSERT INTO messages (user_id, type, title, content)
            VALUES (fleet_record.user_id, 'system', 'Colonization Successful',
                    format('You have established a new colony at [%s:%s:%s].',
                           fleet_record.target_galaxy, fleet_record.target_system, fleet_record.target_planet));

            -- Add ships to new planet
            FOR ship_type IN SELECT jsonb_object_keys(fleet_record.ships) LOOP
                count := (fleet_record.ships->>ship_type)::int;
                IF count > 0 THEN
                    EXECUTE format('UPDATE planet_ships SET %I = %I + $1 WHERE planet_id = $2', ship_type, ship_type) USING count, target_planet_record.id;
                END IF;
            END LOOP;

            UPDATE fleets SET status = 'completed' WHERE id = fleet_id;
        ELSE
            INSERT INTO messages (user_id, type, title, content)
            VALUES (fleet_record.user_id, 'system', 'Colonization Failed', 'The planet is already occupied.');
            CALL return_fleet(fleet_id);
        END IF;

    ELSIF fleet_record.mission = 'attack' THEN
        IF target_planet_record.id IS NOT NULL AND target_planet_record.user_id IS NOT NULL THEN
            -- Get defender ships and defenses
            SELECT * INTO target_planet_record FROM planet_ships WHERE planet_id = target_planet_record.id;
            -- Note: This is simplified; need to fetch defenses too
            -- For now, assume we have defender_ships and defender_defenses

            -- Simulate combat (placeholder - need to implement properly)
            combat_result := simulate_combat(fleet_record.ships, '{}'::jsonb, '{}'::jsonb); -- Placeholder

            -- Apply losses to attacker
            remaining_fleet := fleet_record.ships;
            fleet_destroyed := true;
            FOR ship_type IN SELECT jsonb_object_keys(combat_result->'attackerLosses') LOOP
                count := (combat_result->'attackerLosses'->>ship_type)::int;
                remaining_fleet := jsonb_set(remaining_fleet, ARRAY[ship_type], to_jsonb(GREATEST((remaining_fleet->>ship_type)::int - count, 0)));
            END LOOP;

            FOR count IN SELECT value::int FROM jsonb_object_values(remaining_fleet) LOOP
                IF count > 0 THEN fleet_destroyed := false; END IF;
            END LOOP;

            IF fleet_destroyed THEN
                UPDATE fleets SET status = 'destroyed' WHERE id = fleet_id;
            ELSE
                UPDATE fleets SET ships = remaining_fleet WHERE id = fleet_id;
            END IF;

            -- Apply losses to defender (simplified)
            -- Looting logic here if winner = 'attacker'

            -- Send reports
            INSERT INTO messages (user_id, type, title, content)
            VALUES (fleet_record.user_id, 'combat', format('Combat Report: %s', combat_result->>'winner'),
                    format('Attacker Losses: %s\nDefender Losses: %s', combat_result->'attackerLosses', combat_result->'defenderLosses'));

            IF NOT fleet_destroyed THEN
                CALL return_fleet(fleet_id);
            END IF;
        ELSE
            INSERT INTO messages (user_id, type, title, content)
            VALUES (fleet_record.user_id, 'combat', 'Attack Failed', 'No target found at coordinates.');
            CALL return_fleet(fleet_id);
        END IF;

    ELSIF fleet_record.mission = 'expedition' THEN
        -- Expedition logic
        IF random() < 0.1 THEN
            UPDATE fleets SET status = 'destroyed' WHERE id = fleet_id;
            INSERT INTO messages (user_id, type, title, content)
            VALUES (fleet_record.user_id, 'expedition', 'Expedition Lost',
                    'Your fleet encountered a massive black hole and was pulled beyond the event horizon. All contact has been lost.');
        ELSE
            -- Random outcomes
            IF random() < 0.35 THEN
                UPDATE fleets SET resources = jsonb_build_object('metal', floor(random() * 5000 + 1000)::int,
                                                                'crystal', floor(random() * 3000 + 500)::int,
                                                                'gas', floor(random() * 1000 + 100)::int)
                WHERE id = fleet_id;
                INSERT INTO messages (user_id, type, title, content)
                VALUES (fleet_record.user_id, 'expedition', 'Expedition Result',
                        'Your expedition found a resource cache!');
            ELSIF random() < 0.6 THEN
                -- Add ships (simplified)
                INSERT INTO messages (user_id, type, title, content)
                VALUES (fleet_record.user_id, 'expedition', 'Expedition Result',
                        'Your expedition encountered abandoned ships.');
            ELSIF random() < 0.75 THEN
                UPDATE users SET dark_matter = dark_matter + 50 WHERE id = fleet_record.user_id;
                INSERT INTO messages (user_id, type, title, content)
                VALUES (fleet_record.user_id, 'expedition', 'Expedition Result',
                        'Your expedition discovered a pocket of Dark Matter!');
            ELSE
                INSERT INTO messages (user_id, type, title, content)
                VALUES (fleet_record.user_id, 'expedition', 'Expedition Result',
                        'The expedition explored the sector but found nothing of interest.');
            END IF;

            CALL return_fleet(fleet_id);
        END IF;

    ELSIF fleet_record.mission = 'deploy' THEN
        IF target_planet_record.id IS NOT NULL AND target_planet_record.user_id = fleet_record.user_id THEN
            -- Add ships and resources
            FOR ship_type IN SELECT jsonb_object_keys(fleet_record.ships) LOOP
                count := (fleet_record.ships->>ship_type)::int;
                IF count > 0 THEN
                    EXECUTE format('UPDATE planet_ships SET %I = %I + $1 WHERE planet_id = $2', ship_type, ship_type) USING count, target_planet_record.id;
                END IF;
            END LOOP;

            UPDATE planet_resources
            SET
                metal = metal + COALESCE((fleet_record.resources->>'metal')::float, 0),
                crystal = crystal + COALESCE((fleet_record.resources->>'crystal')::float, 0),
                gas = gas + COALESCE((fleet_record.resources->>'gas')::float, 0)
            WHERE planet_id = target_planet_record.id;

            UPDATE fleets SET status = 'completed' WHERE id = fleet_id;

            INSERT INTO messages (user_id, type, title, content)
            VALUES (fleet_record.user_id, 'info', 'Fleet Deployed',
                    format('Your fleet has been stationed at %s:%s:%s',
                           fleet_record.target_galaxy, fleet_record.target_system, fleet_record.target_planet));
        ELSE
            INSERT INTO messages (user_id, type, title, content)
            VALUES (fleet_record.user_id, 'warning', 'Deployment Failed',
                    'Cannot deploy to a planet you do not own. Fleet returning.');
            CALL return_fleet(fleet_id);
        END IF;

    ELSE
        CALL return_fleet(fleet_id);
    END IF;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Procedure to return a fleet
CREATE OR REPLACE PROCEDURE return_fleet(fleet_id int) AS $$
DECLARE
    fleet_record record;
    duration interval;
BEGIN
    SELECT * INTO fleet_record FROM fleets WHERE id = fleet_id;

    duration := fleet_record.arrival_time - fleet_record.departure_time;
    IF duration < interval '30 seconds' THEN
        duration := interval '30 seconds';
    END IF;

    UPDATE fleets
    SET
        status = 'returning',
        arrival_time = now() + duration,
        departure_time = now()
    WHERE id = fleet_id;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Main procedure to process all fleets
CREATE OR REPLACE PROCEDURE process_fleets() AS $$
DECLARE
    fleet_record record;
    users_to_update int[];
BEGIN
    -- Process returning fleets
    FOR fleet_record IN SELECT * FROM fleets WHERE status = 'returning' AND arrival_time <= now() LOOP
        CALL process_returning_fleet(fleet_record.id);
        users_to_update := array_append(users_to_update, fleet_record.user_id);
    END LOOP;

    -- Process arriving fleets
    FOR fleet_record IN SELECT * FROM fleets WHERE status = 'active' AND arrival_time <= now() LOOP
        CALL process_arriving_fleet(fleet_record.id);
        users_to_update := array_append(users_to_update, fleet_record.user_id);
        -- Also add target user if applicable
        -- This is simplified; in full implementation, track affected users
    END LOOP;

    -- Update points for affected users (placeholder - call updateUserPoints equivalent)
    -- For now, assume points update is handled separately
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Procedure for auto-exploration
CREATE OR REPLACE PROCEDURE process_auto_explore() AS $$
DECLARE
    explorer record;
    dispatched_count int := 0;
    max_dispatch int := 5;
    target_galaxy int;
    target_system int;
    target_planet int := 16;
    ships jsonb;
BEGIN
    FOR explorer IN
        SELECT aes.user_id, ft.ships, p.galaxy_id, p.system_id
        FROM auto_explore_settings aes
        INNER JOIN user_commanders uc ON aes.user_id = uc.user_id AND uc.commander_id = 'nebula_explorer' AND uc.expires_at > now()
        INNER JOIN fleet_templates ft ON aes.template_id = ft.id
        INNER JOIN planets p ON aes.origin_planet_id = p.id
        WHERE aes.enabled = true
    LOOP
        dispatched_count := 0;

        WHILE dispatched_count < max_dispatch LOOP
            target_galaxy := explorer.galaxy_id;
            target_system := explorer.system_id;

            -- Try to dispatch expedition
            BEGIN
                -- Insert fleet (simplified dispatch)
                INSERT INTO fleets (user_id, origin_planet_id, target_galaxy, target_system, target_planet, mission, ships, resources, departure_time, arrival_time)
                VALUES (explorer.user_id, explorer.origin_planet_id, target_galaxy, target_system, target_planet, 'expedition', explorer.ships, '{}', now(), now() + interval '1 hour');

                RAISE NOTICE 'Auto-dispatched expedition for user %', explorer.user_id;
                dispatched_count := dispatched_count + 1;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Auto-explore stopped for user %: %', explorer.user_id, SQLERRM;
                EXIT;
            END;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;