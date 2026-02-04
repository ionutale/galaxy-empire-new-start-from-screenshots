-- Fix ambiguous column references in check_research_prerequisites
-- Use p_ prefix for parameters

DROP FUNCTION IF EXISTS check_research_prerequisites(int, int);

CREATE OR REPLACE FUNCTION check_research_prerequisites(
    p_user_id int,
    p_research_id int
) RETURNS boolean AS $$
DECLARE
    prereqs jsonb;
    prereq_record RECORD;
BEGIN
    -- Get prerequisites
    SELECT prerequisites INTO prereqs
    FROM research_types
    WHERE id = p_research_id;

    IF prereqs IS NULL OR prereqs = '{}'::jsonb THEN
        RETURN true; -- No prerequisites
    END IF;

    -- Check each prerequisite
    FOR prereq_record IN SELECT * FROM jsonb_object_keys(prereqs) AS key
    LOOP
        DECLARE
            required_level int := (prereqs->>prereq_record.key)::int;
            current_level int := 0;
            prereq_type text := prereq_record.key;
            req_id int;
        BEGIN
            IF prereq_type LIKE 'building_%' THEN
                -- Check if user has building on ANY planet
                -- We use the highest level across all planets
                req_id := substring(prereq_type, 9)::int;
                
                SELECT COALESCE(MAX(level), 0) INTO current_level
                FROM planet_buildings pb
                JOIN planets p ON p.id = pb.planet_id
                WHERE p.user_id = p_user_id AND pb.building_type_id = req_id;

            ELSIF prereq_type LIKE 'research_%' THEN
                -- Check existing research level
                req_id := substring(prereq_type, 10)::int;
                
                SELECT COALESCE(level, 0) INTO current_level
                FROM user_research
                WHERE user_id = p_user_id AND research_id = req_id;
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
