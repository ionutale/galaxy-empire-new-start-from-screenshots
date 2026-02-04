-- Migration: Add stored procedures for research queue processing
-- This migration moves research queue processing logic to the database

-- Procedure to process completed research for a user
CREATE OR REPLACE PROCEDURE process_completed_research(p_user_id int) AS $$
DECLARE
    completed_research RECORD;
    research_name text;
BEGIN
    -- Get all completed research for the user
    FOR completed_research IN
        SELECT rq.id, rq.research_type_id, rq.level, rt.name
        FROM research_queue rq
        JOIN research_types rt ON rt.id = rq.research_type_id
        WHERE rq.user_id = p_user_id AND rq.completion_at <= now()
        ORDER BY rq.completion_at ASC
    LOOP
        -- Update research level
        UPDATE user_research_levels
        SET level = completed_research.level,
            is_researching = false,
            research_completion_at = NULL,
            updated_at = NOW()
        WHERE user_id = p_user_id AND research_type_id = completed_research.research_type_id;

        -- If research level doesn't exist yet, insert it
        INSERT INTO user_research_levels (user_id, research_type_id, level)
        SELECT p_user_id, completed_research.research_type_id, completed_research.level
        WHERE NOT EXISTS (
            SELECT 1 FROM user_research_levels
            WHERE user_id = p_user_id AND research_type_id = completed_research.research_type_id
        );

        -- Create notification message
        INSERT INTO messages (user_id, type, title, content)
        VALUES (
            p_user_id,
            'research',
            'Research Completed',
            'Your research "' || completed_research.name || '" has been completed to level ' || completed_research.level || '.'
        );

        -- Remove from queue
        DELETE FROM research_queue WHERE id = completed_research.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate research cost for a specific level
CREATE OR REPLACE FUNCTION calculate_research_cost(
    research_type_id int,
    target_level int
) RETURNS jsonb AS $$
DECLARE
    base_cost jsonb;
    cost_multiplier float;
BEGIN
    -- Get base cost
    SELECT base_cost INTO base_cost
    FROM research_types
    WHERE id = research_type_id;

    IF base_cost IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate cost multiplier (exponential growth)
    cost_multiplier := power(2, target_level - 1);

    -- Apply multiplier to each resource
    RETURN jsonb_build_object(
        'metal', (base_cost->>'metal')::float * cost_multiplier,
        'crystal', (base_cost->>'crystal')::float * cost_multiplier,
        'gas', (base_cost->>'gas')::float * cost_multiplier
    );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate research time
CREATE OR REPLACE FUNCTION calculate_research_time(
    research_type_id int,
    target_level int,
    research_lab_level int DEFAULT 0,
    interstellar_research_network_level int DEFAULT 0
) RETURNS interval AS $$
DECLARE
    base_time int;
    time_multiplier float;
    lab_reduction float := 0;
    network_reduction float := 0;
BEGIN
    -- Get base research time
    SELECT base_research_time INTO base_time
    FROM research_types
    WHERE id = research_type_id;

    IF base_time IS NULL THEN
        RETURN NULL;
    END IF;

    -- Apply level multiplier (exponential)
    base_time := base_time * power(1.75, target_level - 1);

    -- Research Lab reduces time by 10% per level
    lab_reduction := research_lab_level * 0.1;

    -- Interstellar Research Network reduces time by 25% per level (very expensive)
    network_reduction := interstellar_research_network_level * 0.25;

    -- Apply reductions (capped at 90% total reduction)
    time_multiplier := GREATEST(0.1, 1.0 - lab_reduction - network_reduction);

    -- Return as interval (seconds)
    RETURN make_interval(secs => base_time * time_multiplier);
END;
$$ LANGUAGE plpgsql;

-- Function to check if research can be started (prerequisites)
CREATE OR REPLACE FUNCTION check_research_prerequisites(
    p_user_id int,
    p_research_type_id int,
    p_target_level int
) RETURNS boolean AS $$
DECLARE
    prereqs jsonb;
    prereq_record RECORD;
BEGIN
    -- Get prerequisites
    SELECT prerequisites INTO prereqs
    FROM research_types
    WHERE id = p_research_type_id;

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
            IF prereq_type LIKE 'research_%' THEN
                -- Research prerequisite
                DECLARE
                    req_research_id int := substring(prereq_type, 10)::int;
                BEGIN
                    SELECT COALESCE(level, 0) INTO current_level
                    FROM user_research_levels
                    WHERE user_id = p_user_id AND research_type_id = req_research_id;
                END;
            ELSIF prereq_type LIKE 'building_%' THEN
                -- Building prerequisite (check if any planet has it)
                DECLARE
                    req_building_id int := substring(prereq_type, 10)::int;
                BEGIN
                    SELECT COALESCE(MAX(level), 0) INTO current_level
                    FROM planet_buildings pb
                    JOIN planets p ON p.id = pb.planet_id
                    WHERE p.user_id = p_user_id AND pb.building_type_id = req_building_id;
                END;
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
$$ LANGUAGE plpgsql;