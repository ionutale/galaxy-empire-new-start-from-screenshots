-- Fix ambiguous column references in start_ship_construction
-- Use p_ prefix for parameters to avoid conflict with column names

DROP PROCEDURE IF EXISTS start_ship_construction(int, int, text, int);

CREATE OR REPLACE PROCEDURE start_ship_construction(
    p_user_id int,
    p_planet_id int,
    p_ship_type text,
    p_amount int
) AS $$
DECLARE
    validation_result jsonb;
    construction_time interval;
    completion_time timestamptz;
    total_cost jsonb;
    v_shipyard_id int;
BEGIN
    -- Validate the construction request
    SELECT validate_ship_construction(p_user_id, p_planet_id, p_ship_type, p_amount) INTO validation_result;

    IF NOT (validation_result->>'valid')::boolean THEN
        RAISE EXCEPTION '%', validation_result->>'error';
    END IF;

    -- Get the cost from validation result
    total_cost := validation_result->'cost';

    -- Get shipyard building type id once
    SELECT id INTO v_shipyard_id FROM building_types WHERE name = 'Shipyard';

    -- Calculate construction time
    SELECT calculate_ship_construction_time(p_ship_type, p_amount,
        (SELECT COALESCE(level, 1) FROM planet_buildings WHERE planet_id = p_planet_id AND building_type_id = v_shipyard_id),
        0, 0) INTO construction_time; -- TODO: Add robotics/nanite levels

    -- Calculate completion time
    completion_time := now() + construction_time;

    -- Deduct resources
    UPDATE planet_resources
    SET metal = metal - (total_cost->>'metal')::int,
        crystal = crystal - (total_cost->>'crystal')::int,
        gas = gas - (total_cost->>'gas')::int
    WHERE planet_id = p_planet_id;

    -- Add to shipyard queue
    INSERT INTO shipyard_queue (user_id, planet_id, ship_type, amount, completion_at)
    VALUES (p_user_id, p_planet_id, p_ship_type, p_amount, completion_time);
END;
$$ LANGUAGE plpgsql;
