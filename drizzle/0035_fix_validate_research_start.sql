-- Migration: Fix validate_research_start ambiguous column references
-- Renaming parameters to avoid conflict with column names

-- Drop existing function to allow parameter renaming
DROP FUNCTION IF EXISTS validate_research_start(int, int, int);

CREATE OR REPLACE FUNCTION validate_research_start(
    p_user_id int,
    p_research_type_id int,
    p_planet_id int
) RETURNS jsonb AS $$
DECLARE
    v_planet_owner int;
    v_available_resources jsonb;
    v_required_resources jsonb;
    v_research_cost jsonb;
    v_current_level int := 0;
    v_target_level int;
    v_prereqs_met boolean := true;
    v_lab_level int := 0;
BEGIN
    -- Check if planet belongs to user
    SELECT p.user_id INTO v_planet_owner
    FROM planets p
    WHERE p.id = p_planet_id;

    IF v_planet_owner IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet not found');
    END IF;

    IF v_planet_owner != p_user_id THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Access denied');
    END IF;

    -- Check if research is already being conducted
    IF EXISTS (
        SELECT 1 FROM research_queue
        WHERE user_id = p_user_id AND research_type_id = p_research_type_id
    ) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Research already in progress');
    END IF;

    -- Get current research level
    SELECT COALESCE(level, 0) INTO v_current_level
    FROM user_research_levels
    WHERE user_id = p_user_id AND research_type_id = p_research_type_id;

    v_target_level := v_current_level + 1;

    -- Check prerequisites
    SELECT check_research_prerequisites(p_user_id, p_research_type_id, v_target_level) INTO v_prereqs_met;
    IF NOT v_prereqs_met THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Prerequisites not met');
    END IF;

    -- Check research lab requirement (simplified - assume level 1+ required)
    SELECT COALESCE(MAX(level), 0) INTO v_lab_level
    FROM planet_buildings pb
    JOIN planets p ON p.id = pb.planet_id
    WHERE p.user_id = p_user_id AND pb.building_type_id = (SELECT id FROM building_types WHERE name = 'Research Lab');

    IF v_lab_level < 1 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Research Lab required');
    END IF;

    -- Calculate required resources
    SELECT calculate_research_cost(p_research_type_id, v_target_level) INTO v_research_cost;
    IF v_research_cost IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid research type');
    END IF;

    -- Get available resources
    SELECT jsonb_build_object('metal', metal, 'crystal', crystal, 'gas', gas) INTO v_available_resources
    FROM planet_resources
    WHERE planet_id = p_planet_id; -- No longer ambiguous

    IF v_available_resources IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet resources not found');
    END IF;

    -- Check resource availability
    IF (v_available_resources->>'metal')::float < (v_research_cost->>'metal')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient metal');
    END IF;

    IF (v_available_resources->>'crystal')::float < (v_research_cost->>'crystal')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient crystal');
    END IF;

    IF (v_available_resources->>'gas')::float < (v_research_cost->>'gas')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient gas');
    END IF;

    -- All validations passed
    RETURN jsonb_build_object('valid', true, 'cost', v_research_cost, 'target_level', v_target_level);
END;
$$ LANGUAGE plpgsql;
