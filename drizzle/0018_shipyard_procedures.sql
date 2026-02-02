-- Migration: Add stored procedures for shipyard operations
-- This migration moves shipyard construction logic to the database

-- Procedure to process completed ship constructions
CREATE OR REPLACE PROCEDURE process_completed_ship_construction() AS $$
DECLARE
    completed_ship RECORD;
    ship_column_name text;
BEGIN
    -- Get all completed ship constructions
    FOR completed_ship IN
        SELECT sq.id, sq.planet_id, sq.ship_type, sq.amount
        FROM shipyard_queue sq
        WHERE sq.completion_at <= now()
    LOOP
        -- Ensure planet_ships row exists
        INSERT INTO planet_ships (planet_id)
        VALUES (completed_ship.planet_id)
        ON CONFLICT (planet_id) DO NOTHING;

        -- Add ships to planet (convert snake_case to camelCase for column names)
        ship_column_name := replace(completed_ship.ship_type, '_', '');

        -- Use dynamic SQL to update the correct column
        EXECUTE format(
            'UPDATE planet_ships SET %I = COALESCE(%I, 0) + $1 WHERE planet_id = $2',
            ship_column_name, ship_column_name
        ) USING completed_ship.amount, completed_ship.planet_id;

        -- Remove from queue
        DELETE FROM shipyard_queue WHERE id = completed_ship.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate ship construction time
CREATE OR REPLACE FUNCTION calculate_ship_construction_time(
    ship_type text,
    amount int,
    shipyard_level int DEFAULT 1,
    robotics_level int DEFAULT 0,
    nanite_level int DEFAULT 0
) RETURNS interval AS $$
DECLARE
    base_time_per_ship float;
    total_base_time float;
    time_multiplier float;
    robotics_reduction float := 0;
    nanite_reduction float := 0;
BEGIN
    -- Base construction time per ship (in seconds) - simplified values
    CASE ship_type
        WHEN 'small_cargo' THEN base_time_per_ship := 60;    -- 1 minute
        WHEN 'large_cargo' THEN base_time_per_ship := 120;   -- 2 minutes
        WHEN 'light_fighter' THEN base_time_per_ship := 45;  -- 45 seconds
        WHEN 'heavy_fighter' THEN base_time_per_ship := 90;  -- 1.5 minutes
        WHEN 'cruiser' THEN base_time_per_ship := 300;       -- 5 minutes
        WHEN 'battleship' THEN base_time_per_ship := 600;    -- 10 minutes
        WHEN 'colony_ship' THEN base_time_per_ship := 900;   -- 15 minutes
        WHEN 'recycler' THEN base_time_per_ship := 180;      -- 3 minutes
        WHEN 'espionage_probe' THEN base_time_per_ship := 30; -- 30 seconds
        WHEN 'bomber' THEN base_time_per_ship := 480;        -- 8 minutes
        WHEN 'destroyer' THEN base_time_per_ship := 720;     -- 12 minutes
        WHEN 'deathstar' THEN base_time_per_ship := 3600;    -- 1 hour
        WHEN 'battlecruiser' THEN base_time_per_ship := 840; -- 14 minutes
        ELSE base_time_per_ship := 60; -- Default 1 minute
    END CASE;

    -- Calculate total base time
    total_base_time := base_time_per_ship * amount;

    -- Shipyard level reduces time by 10% per level
    time_multiplier := power(0.9, shipyard_level - 1);

    -- Robotics factory reduces time by 5% per level
    robotics_reduction := robotics_level * 0.05;

    -- Nanite factory reduces time by 25% per level
    nanite_reduction := nanite_level * 0.25;

    -- Apply reductions (capped at 90% total reduction)
    time_multiplier := time_multiplier * GREATEST(0.1, 1.0 - robotics_reduction - nanite_reduction);

    -- Return as interval (seconds)
    RETURN make_interval(secs => total_base_time * time_multiplier);
END;
$$ LANGUAGE plpgsql;

-- Function to validate ship construction
CREATE OR REPLACE FUNCTION validate_ship_construction(
    user_id int,
    planet_id int,
    ship_type text,
    amount int
) RETURNS jsonb AS $$
DECLARE
    planet_owner int;
    available_resources jsonb;
    required_resources jsonb;
    ship_cost jsonb;
    shipyard_level int := 0;
    result jsonb;
BEGIN
    -- Check if planet belongs to user
    SELECT p.user_id INTO planet_owner
    FROM planets p
    WHERE p.id = planet_id;

    IF planet_owner IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet not found');
    END IF;

    IF planet_owner != user_id THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Access denied');
    END IF;

    -- Check shipyard level
    SELECT COALESCE(pb.level, 0) INTO shipyard_level
    FROM planet_buildings pb
    WHERE pb.planet_id = planet_id
      AND pb.building_type_id = (SELECT id FROM building_types WHERE name = 'Shipyard');

    IF shipyard_level < 1 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Shipyard required');
    END IF;

    -- Validate amount
    IF amount < 1 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid amount');
    END IF;

    -- Get ship cost from configuration (simplified - hardcoded for now)
    CASE ship_type
        WHEN 'small_cargo' THEN
            ship_cost := jsonb_build_object('metal', 2000, 'crystal', 2000, 'gas', 0);
        WHEN 'large_cargo' THEN
            ship_cost := jsonb_build_object('metal', 6000, 'crystal', 6000, 'gas', 0);
        WHEN 'light_fighter' THEN
            ship_cost := jsonb_build_object('metal', 3000, 'crystal', 1000, 'gas', 0);
        WHEN 'heavy_fighter' THEN
            ship_cost := jsonb_build_object('metal', 6000, 'crystal', 4000, 'gas', 0);
        WHEN 'cruiser' THEN
            ship_cost := jsonb_build_object('metal', 20000, 'crystal', 7000, 'gas', 2000);
        WHEN 'battleship' THEN
            ship_cost := jsonb_build_object('metal', 45000, 'crystal', 15000, 'gas', 0);
        WHEN 'colony_ship' THEN
            ship_cost := jsonb_build_object('metal', 10000, 'crystal', 20000, 'gas', 10000);
        WHEN 'recycler' THEN
            ship_cost := jsonb_build_object('metal', 10000, 'crystal', 6000, 'gas', 2000);
        WHEN 'espionage_probe' THEN
            ship_cost := jsonb_build_object('metal', 0, 'crystal', 1000, 'gas', 0);
        WHEN 'bomber' THEN
            ship_cost := jsonb_build_object('metal', 50000, 'crystal', 25000, 'gas', 15000);
        WHEN 'destroyer' THEN
            ship_cost := jsonb_build_object('metal', 60000, 'crystal', 50000, 'gas', 15000);
        WHEN 'deathstar' THEN
            ship_cost := jsonb_build_object('metal', 5000000, 'crystal', 4000000, 'gas', 1000000);
        WHEN 'battlecruiser' THEN
            ship_cost := jsonb_build_object('metal', 30000, 'crystal', 40000, 'gas', 15000);
        ELSE
            RETURN jsonb_build_object('valid', false, 'error', 'Invalid ship type');
    END CASE;

    -- Calculate total cost
    required_resources := jsonb_build_object(
        'metal', (ship_cost->>'metal')::int * amount,
        'crystal', (ship_cost->>'crystal')::int * amount,
        'gas', (ship_cost->>'gas')::int * amount
    );

    -- Get available resources
    SELECT jsonb_build_object('metal', metal, 'crystal', crystal, 'gas', gas) INTO available_resources
    FROM planet_resources
    WHERE planet_id = planet_id;

    IF available_resources IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet resources not found');
    END IF;

    -- Check resource availability
    IF (available_resources->>'metal')::float < (required_resources->>'metal')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient metal');
    END IF;

    IF (available_resources->>'crystal')::float < (required_resources->>'crystal')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient crystal');
    END IF;

    IF (available_resources->>'gas')::float < (required_resources->>'gas')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient gas');
    END IF;

    -- All validations passed
    RETURN jsonb_build_object('valid', true, 'cost', required_resources);
END;
$$ LANGUAGE plpgsql;

-- Procedure to start ship construction
CREATE OR REPLACE PROCEDURE start_ship_construction(
    user_id int,
    planet_id int,
    ship_type text,
    amount int
) AS $$
DECLARE
    validation_result jsonb;
    construction_time interval;
    completion_time timestamptz;
    total_cost jsonb;
BEGIN
    -- Validate the construction request
    SELECT validate_ship_construction(user_id, planet_id, ship_type, amount) INTO validation_result;

    IF NOT (validation_result->>'valid')::boolean THEN
        RAISE EXCEPTION '%', validation_result->>'error';
    END IF;

    -- Get the cost from validation result
    total_cost := validation_result->'cost';

    -- Calculate construction time
    SELECT calculate_ship_construction_time(ship_type, amount,
        (SELECT COALESCE(level, 1) FROM planet_buildings WHERE planet_id = planet_id AND building_type_id = (SELECT id FROM building_types WHERE name = 'Shipyard')),
        0, 0) INTO construction_time; -- TODO: Add robotics/nanite levels

    -- Calculate completion time
    completion_time := now() + construction_time;

    -- Deduct resources
    UPDATE planet_resources
    SET metal = metal - (total_cost->>'metal')::int,
        crystal = crystal - (total_cost->>'crystal')::int,
        gas = gas - (total_cost->>'gas')::int
    WHERE planet_id = planet_id;

    -- Add to shipyard queue
    INSERT INTO shipyard_queue (user_id, planet_id, ship_type, amount, completion_at)
    VALUES (user_id, planet_id, ship_type, amount, completion_time);
END;
$$ LANGUAGE plpgsql;

-- Function to cancel ship construction
CREATE OR REPLACE FUNCTION cancel_ship_construction(
    user_id int,
    queue_id int
) RETURNS jsonb AS $$
DECLARE
    queue_item RECORD;
    ship_cost jsonb;
    refund jsonb;
BEGIN
    -- Get the queue item
    SELECT sq.* INTO queue_item
    FROM shipyard_queue sq
    WHERE sq.id = queue_id AND sq.user_id = user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Construction not found');
    END IF;

    -- Get ship cost (simplified - hardcoded)
    CASE queue_item.ship_type
        WHEN 'small_cargo' THEN
            ship_cost := jsonb_build_object('metal', 2000, 'crystal', 2000, 'gas', 0);
        WHEN 'large_cargo' THEN
            ship_cost := jsonb_build_object('metal', 6000, 'crystal', 6000, 'gas', 0);
        WHEN 'light_fighter' THEN
            ship_cost := jsonb_build_object('metal', 3000, 'crystal', 1000, 'gas', 0);
        WHEN 'heavy_fighter' THEN
            ship_cost := jsonb_build_object('metal', 6000, 'crystal', 4000, 'gas', 0);
        WHEN 'cruiser' THEN
            ship_cost := jsonb_build_object('metal', 20000, 'crystal', 7000, 'gas', 2000);
        WHEN 'battleship' THEN
            ship_cost := jsonb_build_object('metal', 45000, 'crystal', 15000, 'gas', 0);
        WHEN 'colony_ship' THEN
            ship_cost := jsonb_build_object('metal', 10000, 'crystal', 20000, 'gas', 10000);
        WHEN 'recycler' THEN
            ship_cost := jsonb_build_object('metal', 10000, 'crystal', 6000, 'gas', 2000);
        WHEN 'espionage_probe' THEN
            ship_cost := jsonb_build_object('metal', 0, 'crystal', 1000, 'gas', 0);
        WHEN 'bomber' THEN
            ship_cost := jsonb_build_object('metal', 50000, 'crystal', 25000, 'gas', 15000);
        WHEN 'destroyer' THEN
            ship_cost := jsonb_build_object('metal', 60000, 'crystal', 50000, 'gas', 15000);
        WHEN 'deathstar' THEN
            ship_cost := jsonb_build_object('metal', 5000000, 'crystal', 4000000, 'gas', 1000000);
        WHEN 'battlecruiser' THEN
            ship_cost := jsonb_build_object('metal', 30000, 'crystal', 40000, 'gas', 15000);
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Invalid ship type');
    END CASE;

    -- Calculate refund (50% of resources)
    refund := jsonb_build_object(
        'metal', ((ship_cost->>'metal')::int * queue_item.amount) / 2,
        'crystal', ((ship_cost->>'crystal')::int * queue_item.amount) / 2,
        'gas', ((ship_cost->>'gas')::int * queue_item.amount) / 2
    );

    -- Refund resources
    UPDATE planet_resources
    SET metal = metal + (refund->>'metal')::int,
        crystal = crystal + (refund->>'crystal')::int,
        gas = gas + (refund->>'gas')::int
    WHERE planet_id = queue_item.planet_id;

    -- Remove from queue
    DELETE FROM shipyard_queue WHERE id = queue_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;