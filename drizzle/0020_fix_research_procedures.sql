-- Fix ambiguous column references in stored procedures
-- Renaming parameters to avoid conflict with column names

-- Drop existing procedure to allow parameter renaming
DROP PROCEDURE IF EXISTS process_completed_research(int);

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

-- Drop existing function to allow parameter renaming
DROP FUNCTION IF EXISTS check_research_prerequisites(int, int, int);

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
