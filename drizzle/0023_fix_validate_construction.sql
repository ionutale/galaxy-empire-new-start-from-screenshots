-- Fix validate_building_construction ambiguous column references
DROP FUNCTION IF EXISTS validate_building_construction(int, int, int, int);

CREATE OR REPLACE FUNCTION validate_building_construction(
    p_user_id int,
    p_planet_id int,
    p_building_type_id int,
    p_target_level int
) RETURNS jsonb AS $$
DECLARE
    planet_owner int;
    available_resources jsonb;
    required_resources jsonb;
    building_cost jsonb;
    current_level int := 0;
    prereqs_met boolean := true;
    result jsonb;
    v_metal_cost float;
    v_crystal_cost float;
    v_gas_cost float;
    v_metal_available float;
    v_crystal_available float;
    v_gas_available float;
BEGIN
    -- Check if planet belongs to user
    SELECT p.user_id INTO planet_owner
    FROM planets p
    WHERE p.id = p_planet_id;

    IF planet_owner IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet not found');
    END IF;

    IF planet_owner != p_user_id THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Access denied');
    END IF;

    -- Check if building is already being constructed
    IF EXISTS (
        SELECT 1 FROM building_queue
        WHERE planet_id = p_planet_id AND building_type_id = p_building_type_id
    ) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Building already in construction queue');
    END IF;

    -- Get current building level
    -- Updated for new normalized schema where rows might not exist for level 0
    SELECT COALESCE(MAX(level), 0) INTO current_level
    FROM planet_buildings
    WHERE planet_id = p_planet_id AND building_type_id = p_building_type_id;

    -- Check if target level is valid
    IF p_target_level <= current_level THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Target level must be higher than current level');
    END IF;

    -- Check prerequisites
    SELECT check_building_prerequisites(p_planet_id, p_building_type_id, p_target_level) INTO prereqs_met;
    IF NOT prereqs_met THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Prerequisites not met');
    END IF;

    -- Calculate required resources
    SELECT calculate_building_cost(p_building_type_id, p_target_level) INTO building_cost;
    IF building_cost IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid building type');
    END IF;

    -- Get available resources
    SELECT jsonb_build_object('metal', metal, 'crystal', crystal, 'gas', gas) INTO available_resources
    FROM planet_resources
    WHERE planet_id = p_planet_id;

    IF available_resources IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet resources not found');
    END IF;

    -- Check resource availability
    IF (available_resources->>'metal')::float < (building_cost->>'metal')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient metal');
    END IF;

    IF (available_resources->>'crystal')::float < (building_cost->>'crystal')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient crystal');
    END IF;

    IF (available_resources->>'gas')::float < (building_cost->>'gas')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient gas');
    END IF;

    -- All validations passed
    RETURN jsonb_build_object('valid', true, 'cost', building_cost);
END;
$$ LANGUAGE plpgsql;
