-- Migration: Add stored procedures for building queue processing
-- This migration moves building queue processing logic to the database

-- Procedure to process completed building constructions
CREATE OR REPLACE PROCEDURE process_completed_buildings() AS $$
DECLARE
    completed_building RECORD;
    building_name text;
    planet_user_id int;
BEGIN
    -- Get all completed buildings
    FOR completed_building IN
        SELECT bq.id, bq.planet_id, bq.building_type_id, bq.target_level, bt.name, p.user_id
        FROM building_queue bq
        JOIN building_types bt ON bt.id = bq.building_type_id
        JOIN planets p ON p.id = bq.planet_id
        WHERE bq.completion_at <= now()
    LOOP
        -- Update building level
        UPDATE planet_buildings
        SET level = completed_building.target_level,
            is_upgrading = false,
            upgrade_started_at = null,
            upgrade_completion_at = null
        WHERE planet_id = completed_building.planet_id
          AND building_type_id = completed_building.building_type_id;

        -- If building doesn't exist yet, insert it
        INSERT INTO planet_buildings (planet_id, building_type_id, level)
        SELECT completed_building.planet_id, completed_building.building_type_id, completed_building.target_level
        WHERE NOT EXISTS (
            SELECT 1 FROM planet_buildings
            WHERE planet_id = completed_building.planet_id
              AND building_type_id = completed_building.building_type_id
        );

        -- Create notification message
        INSERT INTO messages (user_id, type, title, content)
        VALUES (
            completed_building.user_id,
            'building',
            'Building Completed',
            'Your building "' || completed_building.name || '" has been upgraded to level ' || completed_building.target_level || '.'
        );

        -- Remove from queue
        DELETE FROM building_queue WHERE id = completed_building.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate building cost for a specific level
CREATE OR REPLACE FUNCTION calculate_building_cost(
    building_type_id int,
    target_level int
) RETURNS jsonb AS $$
DECLARE
    base_cost jsonb;
    cost_multiplier float;
BEGIN
    -- Get base cost
    SELECT base_cost INTO base_cost
    FROM building_types
    WHERE id = building_type_id;

    IF base_cost IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate cost multiplier (exponential growth)
    cost_multiplier := power(1.5, target_level - 1);

    -- Apply multiplier to each resource
    RETURN jsonb_build_object(
        'metal', (base_cost->>'metal')::float * cost_multiplier,
        'crystal', (base_cost->>'crystal')::float * cost_multiplier,
        'gas', (base_cost->>'gas')::float * cost_multiplier
    );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate building construction time
CREATE OR REPLACE FUNCTION calculate_building_time(
    building_type_id int,
    target_level int,
    robotics_level int DEFAULT 0,
    nanite_level int DEFAULT 0
) RETURNS interval AS $$
DECLARE
    base_time_formula text;
    base_time float;
    time_multiplier float;
    robotics_reduction float := 0;
    nanite_reduction float := 0;
BEGIN
    -- Get base time formula
    SELECT build_time_formula INTO base_time_formula
    FROM building_types
    WHERE id = building_type_id;

    IF base_time_formula IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate base time (simplified - assuming formula like '60 * 1.5^(level-1)')
    -- For now, use a simple calculation
    base_time := 60 * power(1.5, target_level - 1);

    -- Robotics factory reduces time by 5% per level
    robotics_reduction := robotics_level * 0.05;

    -- Nanite factory reduces time by 25% per level (but very expensive)
    nanite_reduction := nanite_level * 0.25;

    -- Apply reductions (capped at 90% total reduction)
    time_multiplier := GREATEST(0.1, 1.0 - robotics_reduction - nanite_reduction);

    -- Return as interval (seconds)
    RETURN make_interval(secs => base_time * time_multiplier);
END;
$$ LANGUAGE plpgsql;

-- Function to check if building can be constructed (prerequisites)
CREATE OR REPLACE FUNCTION check_building_prerequisites(
    planet_id int,
    building_type_id int,
    target_level int
) RETURNS boolean AS $$
DECLARE
    prereqs jsonb;
    prereq_record RECORD;
BEGIN
    -- Get prerequisites
    SELECT prerequisites INTO prereqs
    FROM building_types
    WHERE id = building_type_id;

    IF prereqs IS NULL OR prereqs = '{}'::jsonb THEN
        RETURN true; -- No prerequisites
    END IF;

    -- Check each prerequisite
    FOR prereq_record IN SELECT * FROM jsonb_object_keys(prereqs) AS key
    LOOP
        DECLARE
            required_level int := (prereqs->>prereq_record.key)::int;
            current_level int;
            prereq_type text := prereq_record.key;
        BEGIN
            IF prereq_type LIKE 'building_%' THEN
                -- Building prerequisite
                DECLARE
                    req_building_id int := substring(prereq_type, 9)::int;
                BEGIN
                    SELECT COALESCE(level, 0) INTO current_level
                    FROM planet_buildings
                    WHERE planet_id = planet_id AND building_type_id = req_building_id;
                END;
            ELSIF prereq_type LIKE 'research_%' THEN
                -- Research prerequisite (not implemented yet)
                current_level := 0;
            ELSE
                -- Unknown prerequisite type
                RETURN false;
            END IF;

            IF current_level < required_level THEN
                RETURN false;
            END IF;
        END;
    END LOOP;

    RETURN true;
END;
$$ LANGUAGE plpgsql;</content>
<parameter name="filePath">/Users/ionutale/developer-playground/galaxy-empire-new-start-from-screenshots/drizzle/0012_building_queue_procedures.sql