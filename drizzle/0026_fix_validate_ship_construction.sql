-- Fix ambiguous column references in validate_ship_construction
-- Use p_ prefix for parameters to avoid conflict with column names

CREATE OR REPLACE FUNCTION validate_ship_construction(
    p_user_id int,
    p_planet_id int,
    p_ship_type text,
    p_amount int
) RETURNS jsonb AS $$
DECLARE
    v_planet_owner int;
    v_available_resources jsonb;
    v_required_resources jsonb;
    v_ship_cost jsonb;
    v_shipyard_level int := 0;
    v_shipyard_id int;
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

    -- Get shipyard building ID
    SELECT id INTO v_shipyard_id FROM building_types WHERE name = 'Shipyard';

    -- Check shipyard level
    SELECT COALESCE(pb.level, 0) INTO v_shipyard_level
    FROM planet_buildings pb
    WHERE pb.planet_id = p_planet_id
      AND pb.building_type_id = v_shipyard_id;

    IF v_shipyard_level < 1 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Shipyard required');
    END IF;

    -- Validate amount
    IF p_amount < 1 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid amount');
    END IF;

    -- Get ship cost from configuration
    CASE p_ship_type
        WHEN 'small_cargo' THEN
            v_ship_cost := jsonb_build_object('metal', 2000, 'crystal', 2000, 'gas', 0);
        WHEN 'large_cargo' THEN
            v_ship_cost := jsonb_build_object('metal', 6000, 'crystal', 6000, 'gas', 0);
        WHEN 'light_fighter' THEN
            v_ship_cost := jsonb_build_object('metal', 3000, 'crystal', 1000, 'gas', 0);
        WHEN 'heavy_fighter' THEN
            v_ship_cost := jsonb_build_object('metal', 6000, 'crystal', 4000, 'gas', 0);
        WHEN 'cruiser' THEN
            v_ship_cost := jsonb_build_object('metal', 20000, 'crystal', 7000, 'gas', 2000);
        WHEN 'battleship' THEN
            v_ship_cost := jsonb_build_object('metal', 45000, 'crystal', 15000, 'gas', 0);
        WHEN 'colony_ship' THEN
            v_ship_cost := jsonb_build_object('metal', 10000, 'crystal', 20000, 'gas', 10000);
        WHEN 'recycler' THEN
            v_ship_cost := jsonb_build_object('metal', 10000, 'crystal', 6000, 'gas', 2000);
        WHEN 'espionage_probe' THEN
            v_ship_cost := jsonb_build_object('metal', 0, 'crystal', 1000, 'gas', 0);
        WHEN 'bomber' THEN
            v_ship_cost := jsonb_build_object('metal', 50000, 'crystal', 25000, 'gas', 15000);
        WHEN 'destroyer' THEN
            v_ship_cost := jsonb_build_object('metal', 60000, 'crystal', 50000, 'gas', 15000);
        WHEN 'deathstar' THEN
            v_ship_cost := jsonb_build_object('metal', 5000000, 'crystal', 4000000, 'gas', 1000000);
        WHEN 'battlecruiser' THEN
            v_ship_cost := jsonb_build_object('metal', 30000, 'crystal', 40000, 'gas', 15000);
        ELSE
            RETURN jsonb_build_object('valid', false, 'error', 'Invalid ship type');
    END CASE;

    -- Calculate total cost
    v_required_resources := jsonb_build_object(
        'metal', (v_ship_cost->>'metal')::int * p_amount,
        'crystal', (v_ship_cost->>'crystal')::int * p_amount,
        'gas', (v_ship_cost->>'gas')::int * p_amount
    );

    -- Get available resources
    SELECT jsonb_build_object('metal', metal, 'crystal', crystal, 'gas', gas) INTO v_available_resources
    FROM planet_resources
    WHERE planet_id = p_planet_id;

    IF v_available_resources IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet resources not found');
    END IF;

    -- Check resource availability
    IF (v_available_resources->>'metal')::float < (v_required_resources->>'metal')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient metal');
    END IF;

    IF (v_available_resources->>'crystal')::float < (v_required_resources->>'crystal')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient crystal');
    END IF;

    IF (v_available_resources->>'gas')::float < (v_required_resources->>'gas')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient gas');
    END IF;

    -- All validations passed
    RETURN jsonb_build_object('valid', true, 'cost', v_required_resources);
END;
$$ LANGUAGE plpgsql;
