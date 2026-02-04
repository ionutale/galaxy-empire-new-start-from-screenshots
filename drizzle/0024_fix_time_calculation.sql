-- Fix calculate_building_time function signature to match code
DROP FUNCTION IF EXISTS calculate_building_time(int, int, int, int);

CREATE OR REPLACE FUNCTION calculate_building_time(
    p_building_type_id int,
    p_target_level int,
    p_robotics_level int DEFAULT 0,
    p_nanite_level int DEFAULT 0
) RETURNS interval AS $$
DECLARE
    base_formula text;
    base_cost jsonb;
    metal_cost float;
    crystal_cost float;
    build_hours float;
    build_seconds float;
BEGIN
    -- Get build time formula or calculate based on cost (standard OGame formula)
    SELECT base_cost INTO base_cost
    FROM building_types
    WHERE id = p_building_type_id;

    -- Standard formula: (Metal + Crystal) / (2500 * (1 + RoboticsLevel) * 2^NaniteLevel) * hours
    metal_cost := (base_cost->>'metal')::float * power(1.5, p_target_level - 1);
    crystal_cost := (base_cost->>'crystal')::float * power(1.5, p_target_level - 1);
    
    -- Avoid division by zero
    IF (metal_cost + crystal_cost) = 0 THEN
        RETURN interval '1 second';
    END IF;

    -- Calculate base hours
    build_hours := (metal_cost + crystal_cost) / 2500.0;
    
    -- Apply Robotics Factory reduction
    build_hours := build_hours * (1.0 / (1.0 + p_robotics_level));
    
    -- Apply Nanite Factory reduction
    build_hours := build_hours * (1.0 / power(2.0, p_nanite_level));
    
    -- Convert to seconds
    build_seconds := build_hours * 3600.0;

    -- Minimum 1 second
    IF build_seconds < 1 THEN
        build_seconds := 1;
    END IF;

    RETURN make_interval(secs => build_seconds);
END;
$$ LANGUAGE plpgsql;
