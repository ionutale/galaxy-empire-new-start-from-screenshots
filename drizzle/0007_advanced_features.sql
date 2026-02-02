-- Migration: Add game configuration and advanced features
-- This migration adds configurable game rules, enhanced testing capabilities,
-- and advanced game mechanics

-- Game configuration table for dynamic rule management
CREATE TABLE IF NOT EXISTS game_config (
    config_key varchar(100) PRIMARY KEY,
    config_value jsonb NOT NULL,
    description text,
    updated_at timestamp DEFAULT now(),
    updated_by varchar(100) DEFAULT 'system'
);--> statement-breakpoint

-- Insert default game configuration
INSERT INTO game_config (config_key, config_value, description) VALUES
('combat_rules', '{
    "rounds_per_battle": 1,
    "attacker_loss_multiplier": 0.5,
    "defender_loss_multiplier": 1.0,
    "draw_loss_multiplier": 0.8,
    "loot_percentage": 0.5,
    "rapidfire_enabled": false
}', 'Combat calculation parameters'),
('expedition_rewards', '{
    "resource_min": 1000,
    "resource_max": 5000,
    "ship_reward_chance": 0.25,
    "ship_types": ["light_fighter"],
    "ship_count_min": 1,
    "ship_count_max": 5,
    "dark_matter_reward": 50,
    "black_hole_chance": 0.1
}', 'Expedition outcome probabilities and rewards'),
('cleanup_settings', '{
    "completed_fleets_days": 30,
    "old_messages_days": 90,
    "audit_logs_days": 30,
    "metrics_days": 7
}', 'Data retention settings for cleanup'),
('performance_limits', '{
    "max_fleets_per_tick": 1000,
    "max_auto_explore_per_user": 5,
    "tick_timeout_seconds": 300,
    "max_concurrent_users": 10000
}', 'Performance and scaling limits');--> statement-breakpoint

-- Ship and defense stats configuration (for dynamic updates)
CREATE TABLE IF NOT EXISTS game_ship_stats (
    ship_type varchar(50) PRIMARY KEY,
    name varchar(100) NOT NULL,
    cost jsonb NOT NULL,
    attack int NOT NULL DEFAULT 0,
    defense int NOT NULL DEFAULT 0,
    shield int NOT NULL DEFAULT 0,
    capacity int NOT NULL DEFAULT 0,
    speed int NOT NULL DEFAULT 0,
    category varchar(20) NOT NULL CHECK (category IN ('ship', 'defense'))
);--> statement-breakpoint

-- Populate ship stats from hardcoded values
INSERT INTO game_ship_stats (ship_type, name, cost, attack, defense, shield, capacity, speed, category) VALUES
('light_fighter', 'Light Fighter', '{"metal": 3000, "crystal": 1000, "gas": 0}', 50, 10, 0, 50, 12500, 'ship'),
('heavy_fighter', 'Heavy Fighter', '{"metal": 6000, "crystal": 4000, "gas": 0}', 150, 25, 0, 100, 10000, 'ship'),
('cruiser', 'Cruiser', '{"metal": 20000, "crystal": 7000, "gas": 2000}', 400, 50, 0, 800, 15000, 'ship'),
('battleship', 'Battleship', '{"metal": 45000, "crystal": 15000, "gas": 0}', 1000, 200, 0, 1500, 10000, 'ship'),
('small_cargo', 'Small Cargo', '{"metal": 2000, "crystal": 2000, "gas": 0}', 5, 10, 0, 5000, 5000, 'ship'),
('large_cargo', 'Large Cargo', '{"metal": 6000, "crystal": 6000, "gas": 0}', 5, 50, 0, 25000, 7500, 'ship'),
('colony_ship', 'Colony Ship', '{"metal": 10000, "crystal": 20000, "gas": 10000}', 50, 100, 0, 7500, 2500, 'ship'),
('recycler', 'Recycler', '{"metal": 10000, "crystal": 6000, "gas": 2000}', 1, 10, 0, 20000, 2000, 'ship'),
('espionage_probe', 'Espionage Probe', '{"metal": 0, "crystal": 1000, "gas": 0}', 0, 0, 0, 5, 100000000, 'ship'),
('bomber', 'Bomber', '{"metal": 50000, "crystal": 25000, "gas": 15000}', 1000, 500, 0, 500, 4000, 'ship'),
('destroyer', 'Destroyer', '{"metal": 60000, "crystal": 50000, "gas": 15000}', 2000, 2000, 0, 2000, 5000, 'ship'),
('death_star', 'Death Star', '{"metal": 5000000, "crystal": 4000000, "gas": 1000000}', 200000, 100000, 0, 1000000, 100, 'ship'),
('battle_cruiser', 'Battle Cruiser', '{"metal": 30000, "crystal": 40000, "gas": 15000}', 700, 200, 0, 750, 10000, 'ship'),
('rocket_launcher', 'Rocket Launcher', '{"metal": 2000, "crystal": 0, "gas": 0}', 80, 20, 20, 0, 0, 'defense'),
('light_laser', 'Light Laser', '{"metal": 1500, "crystal": 500, "gas": 0}', 100, 25, 25, 0, 0, 'defense'),
('heavy_laser', 'Heavy Laser', '{"metal": 6000, "crystal": 2000, "gas": 0}', 250, 100, 100, 0, 0, 'defense'),
('gauss_cannon', 'Gauss Cannon', '{"metal": 20000, "crystal": 15000, "gas": 2000}', 1100, 200, 200, 0, 0, 'defense'),
('ion_cannon', 'Ion Cannon', '{"metal": 2000, "crystal": 6000, "gas": 0}', 150, 500, 500, 0, 0, 'defense'),
('plasma_turret', 'Plasma Turret', '{"metal": 50000, "crystal": 50000, "gas": 30000}', 3000, 300, 300, 0, 0, 'defense'),
('small_shield_dome', 'Small Shield Dome', '{"metal": 10000, "crystal": 10000, "gas": 0}', 0, 2000, 2000, 0, 0, 'defense'),
('large_shield_dome', 'Large Shield Dome', '{"metal": 50000, "crystal": 50000, "gas": 0}', 0, 10000, 10000, 0, 0, 'defense');--> statement-breakpoint

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
    FOR ship_type, count IN SELECT * FROM jsonb_object_keys(attacker_ships), jsonb_extract_path_text(attacker_ships, jsonb_object_keys(attacker_ships))::int LOOP
        SELECT * INTO stats FROM game_ship_stats WHERE ship_type = ship_type AND category = 'ship';
        IF FOUND THEN
            attacker_power := attacker_power + stats.attack * count;
            attacker_health := attacker_health + stats.defense * count;
        END IF;
    END LOOP;

    -- Calculate defender power and health (ships)
    FOR ship_type, count IN SELECT * FROM jsonb_object_keys(defender_ships), jsonb_extract_path_text(defender_ships, jsonb_object_keys(defender_ships))::int LOOP
        SELECT * INTO stats FROM game_ship_stats WHERE ship_type = ship_type AND category = 'ship';
        IF FOUND THEN
            defender_power := defender_power + stats.attack * count;
            defender_health := defender_health + stats.defense * count;
        END IF;
    END LOOP;

    -- Calculate defender power and health (defenses)
    FOR ship_type, count IN SELECT * FROM jsonb_object_keys(defender_defenses), jsonb_extract_path_text(defender_defenses, jsonb_object_keys(defender_defenses))::int LOOP
        SELECT * INTO stats FROM game_ship_stats WHERE ship_type = ship_type AND category = 'defense';
        IF FOUND THEN
            defender_power := defender_power + stats.attack * count + (stats.shield * count) / 10;
            defender_health := defender_health + stats.defense * count;
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
    FOR ship_type, count IN SELECT * FROM jsonb_object_keys(attacker_ships), jsonb_extract_path_text(attacker_ships, jsonb_object_keys(attacker_ships))::int LOOP
        IF count > 0 THEN
            attacker_losses := jsonb_set(attacker_losses, ARRAY[ship_type], to_jsonb(floor(count * attacker_loss_pct)::int));
        END IF;
    END LOOP;

    FOR ship_type, count IN SELECT * FROM jsonb_object_keys(defender_ships), jsonb_extract_path_text(defender_ships, jsonb_object_keys(defender_ships))::int LOOP
        IF count > 0 THEN
            defender_losses := jsonb_set(defender_losses, ARRAY[ship_type], to_jsonb(floor(count * defender_loss_pct)::int));
        END IF;
    END LOOP;

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

-- Enhanced expedition with configurable rewards
CREATE OR REPLACE PROCEDURE process_arriving_fleet(fleet_id int) AS $$
DECLARE
    -- ... existing variables ...
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
    -- ... existing code for other missions ...

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

    -- ... rest of existing code ...
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Add API endpoint for game configuration management
-- This would be implemented in the application layer, but we can add stored procedures for config management

CREATE OR REPLACE FUNCTION get_game_config(config_key_param text) RETURNS jsonb AS $$
BEGIN
    RETURN (SELECT config_value FROM game_config WHERE config_key = config_key_param);
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE OR REPLACE PROCEDURE update_game_config(config_key_param text, config_value_param jsonb, description_param text DEFAULT NULL) AS $$
BEGIN
    INSERT INTO game_config (config_key, config_value, description)
    VALUES (config_key_param, config_value_param, description_param)
    ON CONFLICT (config_key) DO UPDATE SET
        config_value = EXCLUDED.config_value,
        description = COALESCE(EXCLUDED.description, game_config.description),
        updated_at = now();
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Add stored procedure testing framework
CREATE TABLE IF NOT EXISTS procedure_tests (
    id serial PRIMARY KEY,
    procedure_name varchar(100) NOT NULL,
    test_name varchar(200) NOT NULL,
    test_input jsonb,
    expected_output jsonb,
    actual_output jsonb,
    passed boolean,
    execution_time_ms int,
    error_message text,
    run_at timestamp DEFAULT now()
);--> statement-breakpoint

-- Test procedure for combat simulation
CREATE OR REPLACE PROCEDURE test_combat_simulation() AS $$
DECLARE
    test_result jsonb;
    expected_winner text;
    passed boolean;
BEGIN
    -- Test 1: Attacker wins
    test_result := simulate_combat(
        '{"light_fighter": 100}'::jsonb,
        '{"light_fighter": 10}'::jsonb,
        '{}'::jsonb
    );

    expected_winner := 'attacker';
    passed := (test_result->>'winner') = expected_winner;

    INSERT INTO procedure_tests (procedure_name, test_name, test_input, expected_output, actual_output, passed)
    VALUES ('simulate_combat', 'Attacker wins with superior numbers',
            '{"attacker": {"light_fighter": 100}, "defender": {"light_fighter": 10}}'::jsonb,
            jsonb_build_object('winner', expected_winner),
            test_result, passed);

    -- Test 2: Defender wins
    test_result := simulate_combat(
        '{"light_fighter": 10}'::jsonb,
        '{"battleship": 10}'::jsonb,
        '{}'::jsonb
    );

    expected_winner := 'defender';
    passed := (test_result->>'winner') = expected_winner;

    INSERT INTO procedure_tests (procedure_name, test_name, test_input, expected_output, actual_output, passed)
    VALUES ('simulate_combat', 'Defender wins with superior ships',
            '{"attacker": {"light_fighter": 10}, "defender": {"battleship": 10}}'::jsonb,
            jsonb_build_object('winner', expected_winner),
            test_result, passed);

    RAISE NOTICE 'Combat simulation tests completed';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Add performance monitoring for stored procedures
CREATE OR REPLACE FUNCTION monitor_procedure_performance() RETURNS TABLE (
    procedure_name text,
    avg_execution_time float,
    max_execution_time float,
    min_execution_time float,
    total_calls int,
    error_rate float
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'process_fleets'::text as procedure_name,
        avg(gtm.execution_time_ms)::float,
        max(gtm.execution_time_ms)::float,
        min(gtm.execution_time_ms)::float,
        count(*)::int,
        (sum(CASE WHEN gtm.errors_count > 0 THEN 1 ELSE 0 END)::float / count(*)) * 100
    FROM game_tick_metrics gtm
    WHERE gtm.tick_time > now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint