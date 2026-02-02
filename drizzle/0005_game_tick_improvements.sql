-- Migration: Fix and improve game tick stored procedures
-- This migration fixes critical issues in the game tick procedures:
-- 1. Proper combat simulation with defender data fetching
-- 2. Apply defender losses to planet ships and defenses
-- 3. Implement looting mechanics for attack victories
-- 4. Add point updates after fleet processing
-- 5. Fix expedition ship rewards

-- Update the simulate_combat function to match TypeScript logic better
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

    -- Determine winner and loss percentages (simplified version)
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

-- Update process_arriving_fleet to properly handle attack missions
CREATE OR REPLACE PROCEDURE process_arriving_fleet(fleet_id int) AS $$
DECLARE
    fleet_record record;
    target_planet_record record;
    defender_ships_record record;
    defender_defenses_record record;
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
            SELECT * INTO defender_ships_record FROM planet_ships WHERE planet_id = target_planet_record.id;
            SELECT * INTO defender_defenses_record FROM planet_defenses WHERE planet_id = target_planet_record.id;

            -- Convert records to jsonb, removing id and planet_id fields
            defender_ships_record := jsonb_object_delete_keys(row_to_json(defender_ships_record)::jsonb, ARRAY['id', 'planet_id']);
            defender_defenses_record := jsonb_object_delete_keys(row_to_json(defender_defenses_record)::jsonb, ARRAY['id', 'planet_id']);

            -- Simulate combat
            combat_result := simulate_combat(fleet_record.ships, defender_ships_record, defender_defenses_record);

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

            -- Apply losses to defender (ships and defenses)
            FOR ship_type IN SELECT jsonb_object_keys(combat_result->'defenderLosses') LOOP
                count := (combat_result->'defenderLosses'->>ship_type)::int;
                IF count > 0 THEN
                    -- Check if it's a ship or defense
                    IF defender_ships_record ? ship_type THEN
                        EXECUTE format('UPDATE planet_ships SET %I = GREATEST(%I - $1, 0) WHERE planet_id = $2', ship_type, ship_type) USING count, target_planet_record.id;
                    ELSIF defender_defenses_record ? ship_type THEN
                        EXECUTE format('UPDATE planet_defenses SET %I = GREATEST(%I - $1, 0) WHERE planet_id = $2', ship_type, ship_type) USING count, target_planet_record.id;
                    END IF;
                END IF;
            END LOOP;

            -- Looting (if attacker won and fleet not destroyed)
            IF (combat_result->>'winner') = 'attacker' AND NOT fleet_destroyed THEN
                -- Calculate fleet capacity
                FOR ship_type IN SELECT jsonb_object_keys(remaining_fleet) LOOP
                    count := (remaining_fleet->>ship_type)::int;
                    stats := ships_stats->ship_type;
                    IF stats IS NOT NULL AND count > 0 THEN
                        fleet_capacity := fleet_capacity + (stats->>'capacity')::int * count;
                    END IF;
                END LOOP;

                -- Get current planet resources
                SELECT metal, crystal, gas INTO loot_metal, loot_crystal, loot_gas
                FROM planet_resources WHERE planet_id = target_planet_record.id;

                loot_metal := floor(loot_metal / 2);
                loot_crystal := floor(loot_crystal / 2);
                loot_gas := floor(loot_gas / 2);

                total_lootable := loot_metal + loot_crystal + loot_gas;

                IF total_lootable > fleet_capacity THEN
                    loot_metal := floor(loot_metal * fleet_capacity / total_lootable);
                    loot_crystal := floor(loot_crystal * fleet_capacity / total_lootable);
                    loot_gas := floor(loot_gas * fleet_capacity / total_lootable);
                END IF;

                -- Update planet resources
                UPDATE planet_resources
                SET
                    metal = GREATEST(metal - loot_metal, 0),
                    crystal = GREATEST(crystal - loot_crystal, 0),
                    gas = GREATEST(gas - loot_gas, 0)
                WHERE planet_id = target_planet_record.id;

                -- Update fleet resources
                UPDATE fleets SET resources = jsonb_build_object('metal', loot_metal, 'crystal', loot_crystal, 'gas', loot_gas)
                WHERE id = fleet_id;
            END IF;

            -- Send combat reports
            INSERT INTO messages (user_id, type, title, content)
            VALUES (fleet_record.user_id, 'combat', format('Combat Report: %s', combat_result->>'winner'),
                    format('Attacker Losses: %s\nDefender Losses: %s\nLoot: Metal %s, Crystal %s, Gas %s',
                           combat_result->'attackerLosses', combat_result->'defenderLosses', loot_metal, loot_crystal, loot_gas));

            IF target_planet_record.user_id != fleet_record.user_id THEN
                INSERT INTO messages (user_id, type, title, content)
                VALUES (target_planet_record.user_id, 'combat', 'You were attacked!',
                        format('Attacker Losses: %s\nDefender Losses: %s', combat_result->'attackerLosses', combat_result->'defenderLosses'));
            END IF;

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
                -- Find ships (simplified - just add some light fighters)
                remaining_fleet := fleet_record.ships;
                count := floor(random() * 5 + 1)::int;
                remaining_fleet := jsonb_set(remaining_fleet, ARRAY['light_fighter'], to_jsonb((remaining_fleet->>'light_fighter')::int + count));
                UPDATE fleets SET ships = remaining_fleet WHERE id = fleet_id;
                INSERT INTO messages (user_id, type, title, content)
                VALUES (fleet_record.user_id, 'expedition', 'Expedition Result',
                        format('Your expedition encountered abandoned ships that joined your fleet: Light Fighters: %s', count));
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

-- Add point calculation function
CREATE OR REPLACE PROCEDURE update_user_points(user_id_param int) AS $$
DECLARE
    planet_record record;
    building_record record;
    ship_record record;
    defense_record record;
    research_record record;
    fleet_record record;
    total_points float := 0;
    building_key text;
    ship_key text;
    defense_key text;
    research_key text;
    level_val int;
    count_val int;
    cost_val float;

    -- Building costs (simplified)
    building_costs jsonb := '{
        "metal_mine": {"base": 60, "factor": 1.5},
        "crystal_mine": {"base": 48, "factor": 1.6},
        "gas_extractor": {"base": 225, "factor": 1.5},
        "solar_plant": {"base": 75, "factor": 1.5},
        "research_lab": {"base": 200, "factor": 2.0},
        "shipyard": {"base": 400, "factor": 2.0},
        "robotics_factory": {"base": 400, "factor": 2.0},
        "nanite_factory": {"base": 1000000, "factor": 2.0}
    }';

    -- Ship costs
    ship_costs jsonb := '{
        "light_fighter": 4000,
        "heavy_fighter": 10000,
        "cruiser": 27000,
        "battleship": 60000,
        "small_cargo": 4000,
        "large_cargo": 12000,
        "colony_ship": 25000,
        "recycler": 20000,
        "espionage_probe": 1000,
        "bomber": 75000,
        "destroyer": 110000,
        "death_star": 5000000,
        "battle_cruiser": 30000
    }';

    -- Defense costs
    defense_costs jsonb := '{
        "rocket_launcher": 2000,
        "light_laser": 1750,
        "heavy_laser": 6000,
        "gauss_cannon": 35000,
        "ion_cannon": 5000,
        "plasma_turret": 100000,
        "small_shield_dome": 20000,
        "large_shield_dome": 100000
    }';

    -- Research costs (simplified)
    research_costs jsonb := '{
        "energy_tech": {"base": 800, "factor": 2.0},
        "laser_tech": {"base": 200, "factor": 2.0},
        "ion_tech": {"base": 1000, "factor": 2.0},
        "hyperspace_tech": {"base": 4000, "factor": 2.0},
        "plasma_tech": {"base": 2000, "factor": 2.0},
        "combustion_drive": {"base": 400, "factor": 2.0},
        "impulse_drive": {"base": 2000, "factor": 2.0},
        "hyperspace_drive": {"base": 10000, "factor": 2.0},
        "espionage_tech": {"base": 200, "factor": 2.0},
        "computer_tech": {"base": 400, "factor": 2.0},
        "astrophysics": {"base": 800, "factor": 2.0},
        "weapons_tech": {"base": 800, "factor": 2.0},
        "shielding_tech": {"base": 200, "factor": 2.0},
        "armour_tech": {"base": 1000, "factor": 2.0}
    }';
BEGIN
    -- 1. Buildings, Ships & Defenses on planets
    FOR planet_record IN SELECT id FROM planets WHERE user_id = user_id_param LOOP
        -- Buildings
        SELECT * INTO building_record FROM planet_buildings WHERE planet_id = planet_record.id;
        FOR building_key IN SELECT jsonb_object_keys(row_to_json(building_record)::jsonb - 'id' - 'planet_id') LOOP
            EXECUTE format('SELECT ($1).%I', building_key) INTO level_val USING building_record;
            IF level_val > 0 THEN
                -- Calculate building cost (simplified)
                total_points := total_points + (level_val * 100); -- Simplified point calculation
            END IF;
        END LOOP;

        -- Ships
        SELECT * INTO ship_record FROM planet_ships WHERE planet_id = planet_record.id;
        FOR ship_key IN SELECT jsonb_object_keys(row_to_json(ship_record)::jsonb - 'id' - 'planet_id') LOOP
            EXECUTE format('SELECT ($1).%I', ship_key) INTO count_val USING ship_record;
            cost_val := (ship_costs->>ship_key)::float;
            IF cost_val IS NOT NULL AND count_val > 0 THEN
                total_points := total_points + (cost_val * count_val / 1000);
            END IF;
        END LOOP;

        -- Defenses
        SELECT * INTO defense_record FROM planet_defenses WHERE planet_id = planet_record.id;
        FOR defense_key IN SELECT jsonb_object_keys(row_to_json(defense_record)::jsonb - 'id' - 'planet_id') LOOP
            EXECUTE format('SELECT ($1).%I', defense_key) INTO count_val USING defense_record;
            cost_val := (defense_costs->>defense_key)::float;
            IF cost_val IS NOT NULL AND count_val > 0 THEN
                total_points := total_points + (cost_val * count_val / 1000);
            END IF;
        END LOOP;
    END LOOP;

    -- 2. Research
    SELECT * INTO research_record FROM user_research WHERE user_id = user_id_param;
    FOR research_key IN SELECT jsonb_object_keys(row_to_json(research_record)::jsonb - 'id' - 'user_id') LOOP
        EXECUTE format('SELECT ($1).%I', research_key) INTO level_val USING research_record;
        IF level_val > 0 THEN
            total_points := total_points + (level_val * 200); -- Simplified research points
        END IF;
    END LOOP;

    -- 3. Fleets in flight
    FOR fleet_record IN SELECT ships FROM fleets WHERE user_id = user_id_param LOOP
        FOR ship_key IN SELECT jsonb_object_keys(fleet_record.ships) LOOP
            count_val := (fleet_record.ships->>ship_key)::int;
            cost_val := (ship_costs->>ship_key)::float;
            IF cost_val IS NOT NULL AND count_val > 0 THEN
                total_points := total_points + (cost_val * count_val / 1000);
            END IF;
        END LOOP;
    END LOOP;

    -- Update user points
    UPDATE users SET points = floor(total_points) WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Update process_fleets to call point updates
CREATE OR REPLACE PROCEDURE process_fleets() AS $$
DECLARE
    fleet_record record;
    users_to_update int[] := ARRAY[]::int[];
    target_user_id int;
BEGIN
    -- Process returning fleets
    FOR fleet_record IN SELECT * FROM fleets WHERE status = 'returning' AND arrival_time <= now() LOOP
        CALL process_returning_fleet(fleet_record.id);
        users_to_update := array_append(users_to_update, fleet_record.user_id);
    END LOOP;

    -- Process arriving fleets
    FOR fleet_record IN SELECT * FROM fleets WHERE status = 'active' AND arrival_time <= now() LOOP
        -- Get target user before processing (in case planet ownership changes)
        SELECT user_id INTO target_user_id
        FROM planets
        WHERE galaxy_id = fleet_record.target_galaxy
          AND system_id = fleet_record.target_system
          AND planet_number = fleet_record.target_planet;

        CALL process_arriving_fleet(fleet_record.id);
        users_to_update := array_append(users_to_update, fleet_record.user_id);
        IF target_user_id IS NOT NULL AND target_user_id != fleet_record.user_id THEN
            users_to_update := array_append(users_to_update, target_user_id);
        END IF;
    END LOOP;

    -- Update points for affected users
    FOR target_user_id IN SELECT DISTINCT unnest(users_to_update) LOOP
        CALL update_user_points(target_user_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint