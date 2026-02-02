-- Migration: Fix advanced features
-- Correct syntax errors in the advanced features migration

-- Update combat function to use configurable stats
CREATE OR REPLACE FUNCTION simulate_combat(
    attacker_ships jsonb,
    defender_ships jsonb,
    defender_defenses jsonb
) RETURNS jsonb AS $$
DECLARE
    attacker_power int := 0;
    defender_power int := 0;
    attacker_health int := 0;
    defender_health int := 0;
    winner text;
    attacker_loss_pct float := 0.5;
    defender_loss_pct float := 1.0;
    draw_loss_pct float := 0.8;
    attacker_losses jsonb := '{}';
    defender_losses jsonb := '{}';
    ship_type text;
    count int;
    stats record;
    config jsonb;
BEGIN
    -- Get combat configuration
    SELECT config_value INTO config FROM game_config WHERE config_key = 'combat_rules';
    IF config IS NOT NULL THEN
        attacker_loss_pct := (config->>'attacker_loss_multiplier')::float;
        defender_loss_pct := (config->>'defender_loss_multiplier')::float;
        draw_loss_pct := (config->>'draw_loss_multiplier')::float;
    END IF;

    -- Calculate attacker power and health
    FOR ship_type IN SELECT jsonb_object_keys(attacker_ships) LOOP
        count := (attacker_ships->>ship_type)::int;
        IF count > 0 THEN
            SELECT * INTO stats FROM game_ship_stats WHERE ship_type = ship_type AND category = 'ship';
            IF FOUND THEN
                attacker_power := attacker_power + stats.attack * count;
                attacker_health := attacker_health + stats.defense * count;
            END IF;
        END IF;
    END LOOP;

    -- Calculate defender power and health (ships)
    FOR ship_type IN SELECT jsonb_object_keys(defender_ships) LOOP
        count := (defender_ships->>ship_type)::int;
        IF count > 0 THEN
            SELECT * INTO stats FROM game_ship_stats WHERE ship_type = ship_type AND category = 'ship';
            IF FOUND THEN
                defender_power := defender_power + stats.attack * count;
                defender_health := defender_health + stats.defense * count;
            END IF;
        END IF;
    END LOOP;

    -- Calculate defender power and health (defenses)
    FOR ship_type IN SELECT jsonb_object_keys(defender_defenses) LOOP
        count := (defender_defenses->>ship_type)::int;
        IF count > 0 THEN
            SELECT * INTO stats FROM game_ship_stats WHERE ship_type = ship_type AND category = 'defense';
            IF FOUND THEN
                defender_power := defender_power + stats.attack * count + (stats.shield * count) / 10;
                defender_health := defender_health + stats.defense * count;
            END IF;
        END IF;
    END LOOP;

    -- Determine winner and loss percentages
    IF attacker_power > defender_health AND defender_power < attacker_health THEN
        winner := 'attacker';
    ELSIF defender_power > attacker_health AND attacker_power < defender_health THEN
        winner := 'defender';
        defender_loss_pct := LEAST(attacker_loss_pct, defender_power::float / GREATEST(defender_health, 1));
        attacker_loss_pct := defender_loss_pct;
    ELSE
        winner := 'draw';
        attacker_loss_pct := draw_loss_pct;
        defender_loss_pct := draw_loss_pct;
    END IF;

    -- Calculate losses
    FOR ship_type IN SELECT jsonb_object_keys(attacker_ships) LOOP
        count := (attacker_ships->>ship_type)::int;
        IF count > 0 THEN
            attacker_losses := jsonb_set(attacker_losses, ARRAY[ship_type], to_jsonb(floor(count * attacker_loss_pct)::int));
        END IF;
    END LOOP;

    FOR ship_type IN SELECT jsonb_object_keys(defender_ships) LOOP
        count := (defender_ships->>ship_type)::int;
        IF count > 0 THEN
            defender_losses := jsonb_set(defender_losses, ARRAY[ship_type], to_jsonb(floor(count * defender_loss_pct)::int));
        END IF;
    END LOOP;

    FOR ship_type IN SELECT jsonb_object_keys(defender_defenses) LOOP
        count := (defender_defenses->>ship_type)::int;
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

-- Enhanced expedition with configurable rewards
CREATE OR REPLACE PROCEDURE process_arriving_fleet(fleet_id int) AS $$
DECLARE
    fleet_record record;
    target_planet record;
    remaining_fleet jsonb;
    combat_result jsonb;
    loot jsonb := '{}';
    loot_capacity int := 0;
    total_loot_value int := 0;
    defender_ships jsonb;
    defender_defenses jsonb;
    expedition_config jsonb;
    resource_min int;
    resource_max int;
    ship_reward_chance float;
    ship_types text[];
    ship_count_min int;
    ship_count_max int;
    dark_matter_reward int;
    black_hole_chance float;
    outcome float;
    found_ships jsonb := '{}';
    ship_type text;
    ship_count int;
BEGIN
    -- Get fleet details
    SELECT * INTO fleet_record FROM fleets WHERE id = fleet_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fleet % not found', fleet_id;
    END IF;

    -- Get target planet details
    SELECT * INTO target_planet FROM planets WHERE id = fleet_record.target_planet_id;

    -- Handle different mission types
    IF fleet_record.mission = 'attack' THEN
        -- Get defender ships and defenses
        SELECT
            COALESCE(planet_ships.ships, '{}') as ships,
            COALESCE(planet_defenses.defenses, '{}') as defenses
        INTO defender_ships, defender_defenses
        FROM planets
        LEFT JOIN planet_ships ON planets.id = planet_ships.planet_id
        LEFT JOIN planet_defenses ON planets.id = planet_defenses.planet_id
        WHERE planets.id = fleet_record.target_planet_id;

        -- Simulate combat
        combat_result := simulate_combat(fleet_record.ships, defender_ships, defender_defenses);

        -- Apply losses
        remaining_fleet := fleet_record.ships;
        FOR ship_type IN SELECT jsonb_object_keys(combat_result->'attackerLosses') LOOP
            remaining_fleet := jsonb_set(remaining_fleet, ARRAY[ship_type],
                                       to_jsonb((remaining_fleet->>ship_type)::int - (combat_result->'attackerLosses'->>ship_type)::int));
        END LOOP;

        -- Apply defender losses
        IF defender_ships IS NOT NULL AND defender_ships != '{}' THEN
            UPDATE planet_ships SET ships = ships - (combat_result->'defenderLosses') WHERE planet_id = fleet_record.target_planet_id;
        END IF;
        IF defender_defenses IS NOT NULL AND defender_defenses != '{}' THEN
            UPDATE planet_defenses SET defenses = defenses - (combat_result->'defenderLosses') WHERE planet_id = fleet_record.target_planet_id;
        END IF;

        -- Calculate loot if attacker wins
        IF combat_result->>'winner' = 'attacker' THEN
            loot := calculate_loot(fleet_record.ships, target_planet.resources);
            loot_capacity := calculate_fleet_capacity(remaining_fleet);

            -- Limit loot by fleet capacity
            total_loot_value := (loot->>'metal')::int + (loot->>'crystal')::int + (loot->>'gas')::int;
            IF total_loot_value > loot_capacity THEN
                loot := jsonb_build_object(
                    'metal', floor((loot->>'metal')::int * loot_capacity::float / total_loot_value),
                    'crystal', floor((loot->>'crystal')::int * loot_capacity::float / total_loot_value),
                    'gas', floor((loot->>'gas')::int * loot_capacity::float / total_loot_value)
                );
            END IF;

            -- Update planet resources (remove looted resources)
            UPDATE planets SET resources = resources - loot WHERE id = fleet_record.target_planet_id;
        END IF;

        -- Update fleet
        UPDATE fleets SET
            ships = remaining_fleet,
            resources = resources + loot,
            status = CASE WHEN combat_result->>'winner' = 'attacker' THEN 'returning' ELSE 'destroyed' END
        WHERE id = fleet_id;

        -- Create battle report
        INSERT INTO messages (user_id, type, title, content)
        VALUES (fleet_record.user_id, 'combat', 'Battle Report',
                format('Battle result: %s. Losses: %s', combat_result->>'winner', combat_result->>'attackerLosses'));

    ELSIF fleet_record.mission = 'expedition' THEN
        -- Get expedition configuration
        SELECT config_value INTO expedition_config FROM game_config WHERE config_key = 'expedition_rewards';
        IF expedition_config IS NOT NULL THEN
            resource_min := (expedition_config->>'resource_min')::int;
            resource_max := (expedition_config->>'resource_max')::int;
            ship_reward_chance := (expedition_config->>'ship_reward_chance')::float;
            ship_types := ARRAY(SELECT jsonb_array_elements_text(expedition_config->'ship_types'));
            ship_count_min := (expedition_config->>'ship_count_min')::int;
            ship_count_max := (expedition_config->>'ship_count_max')::int;
            dark_matter_reward := (expedition_config->>'dark_matter_reward')::int;
            black_hole_chance := (expedition_config->>'black_hole_chance')::float;
        ELSE
            -- Default values
            resource_min := 1000;
            resource_max := 5000;
            ship_reward_chance := 0.25;
            ship_types := ARRAY['light_fighter'];
            ship_count_min := 1;
            ship_count_max := 5;
            dark_matter_reward := 50;
            black_hole_chance := 0.1;
        END IF;

        outcome := random();

        IF outcome < black_hole_chance THEN
            UPDATE fleets SET status = 'destroyed' WHERE id = fleet_id;
            INSERT INTO messages (user_id, type, title, content)
            VALUES (fleet_record.user_id, 'expedition', 'Expedition Lost',
                    'Your fleet encountered a massive black hole and was pulled beyond the event horizon. All contact has been lost.');
        ELSE
            -- Random outcomes
            IF random() < 0.35 THEN
                UPDATE fleets SET resources = jsonb_build_object('metal', floor(random() * (resource_max - resource_min) + resource_min)::int,
                                                                'crystal', floor(random() * (resource_max - resource_min) + resource_min)::int,
                                                                'gas', floor(random() * (resource_max - resource_min) + resource_min)::int)
                WHERE id = fleet_id;
                INSERT INTO messages (user_id, type, title, content)
                VALUES (fleet_record.user_id, 'expedition', 'Expedition Result',
                        'Your expedition found a resource cache!');
            ELSIF random() < ship_reward_chance THEN
                -- Ship rewards
                ship_type := ship_types[floor(random() * array_length(ship_types, 1)) + 1];
                ship_count := floor(random() * (ship_count_max - ship_count_min + 1) + ship_count_min)::int;
                found_ships := jsonb_build_object(ship_type, ship_count);

                -- Add ships to fleet
                remaining_fleet := fleet_record.ships;
                remaining_fleet := jsonb_set(remaining_fleet, ARRAY[ship_type],
                                           to_jsonb((remaining_fleet->>ship_type)::int + ship_count));
                UPDATE fleets SET ships = remaining_fleet WHERE id = fleet_id;

                INSERT INTO messages (user_id, type, title, content)
                VALUES (fleet_record.user_id, 'expedition', 'Expedition Result',
                        format('Your expedition encountered abandoned ships that joined your fleet: %s: %s',
                               initcap(replace(ship_type, '_', ' ')), ship_count));
            ELSIF random() < 0.75 THEN
                UPDATE users SET dark_matter = dark_matter + dark_matter_reward WHERE id = fleet_record.user_id;
                INSERT INTO messages (user_id, type, title, content)
                VALUES (fleet_record.user_id, 'expedition', 'Expedition Result',
                        format('Your expedition discovered a pocket of Dark Matter! Dark Matter: %s', dark_matter_reward));
            ELSE
                INSERT INTO messages (user_id, type, title, content)
                VALUES (fleet_record.user_id, 'expedition', 'Expedition Result',
                        'The expedition explored the sector but found nothing of interest.');
            END IF;

            CALL return_fleet(fleet_id);
        END IF;

    ELSE
        -- Other missions (transport, etc.)
        CALL return_fleet(fleet_id);
    END IF;

    -- Update fleet audit log
    INSERT INTO fleet_audit_log (fleet_id, action, old_status, new_status, details)
    VALUES (fleet_id, 'processed', fleet_record.status, (SELECT status FROM fleets WHERE id = fleet_id), jsonb_build_object('mission', fleet_record.mission));
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint