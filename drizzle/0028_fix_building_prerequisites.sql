-- Fix ambiguous column references in check_building_prerequisites
-- Use p_ prefix for parameters

DROP FUNCTION IF EXISTS check_building_prerequisites(int, int, int);

CREATE OR REPLACE FUNCTION check_building_prerequisites(
    p_planet_id int,
    p_building_type_id int,
    p_target_level int
) RETURNS boolean AS $$
DECLARE
    prereqs jsonb;
    prereq_record RECORD;
BEGIN
    -- Get prerequisites
    SELECT prerequisites INTO prereqs
    FROM building_types
    WHERE id = p_building_type_id;

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
                    FROM planet_buildings pb
                    WHERE pb.planet_id = p_planet_id AND pb.building_type_id = req_building_id;
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
$$ LANGUAGE plpgsql;
