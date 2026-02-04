-- Migration: Fix validate_fleet_dispatch procedure checks and parameter shadowing
-- This migration fixes variable shadowing in SQL queries and function parameters

CREATE OR REPLACE FUNCTION validate_fleet_dispatch(
    p_user_id int,
    p_planet_id int,
    p_ships jsonb,
    p_mission text,
    p_target_galaxy int,
    p_target_system int,
    p_target_planet int,
    p_resources jsonb
) RETURNS jsonb AS $$
DECLARE
    v_planet_owner int;
    v_available_ships jsonb;
    v_available_resources jsonb;
    v_total_capacity float := 0;
    v_total_resources float := 0;
    v_movement_info jsonb;
    v_ship_record record;
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

    -- Check if user has ships
    SELECT to_jsonb(ps.*) INTO v_available_ships
    FROM planet_ships ps
    WHERE ps.planet_id = p_planet_id;

    IF v_available_ships IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'No ships available');
    END IF;

    -- Validate ship counts
    FOR v_ship_record IN SELECT * FROM jsonb_object_keys(p_ships) AS key
    LOOP
        DECLARE
            v_ship_type text := v_ship_record.key;
            v_requested_count int := (p_ships->>v_ship_type)::int;
            v_available_count int;
        BEGIN
            -- Get available count for this ship type
            v_available_count := (v_available_ships->>v_ship_type)::int;

            IF v_available_count IS NULL OR v_available_count < v_requested_count THEN
                RETURN jsonb_build_object('valid', false, 'error', format('Insufficient %s', v_ship_type));
            END IF;

            -- Calculate capacity (simplified)
            IF v_ship_type = 'small_cargo' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 5000;
            ELSIF v_ship_type = 'large_cargo' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 25000;
            ELSIF v_ship_type = 'light_fighter' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 50;
            ELSIF v_ship_type = 'heavy_fighter' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 100;
            ELSIF v_ship_type = 'cruiser' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 800;
            ELSIF v_ship_type = 'battleship' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 1500;
            ELSIF v_ship_type = 'colony_ship' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 7500;
            ELSIF v_ship_type = 'recycler' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 20000;
            ELSIF v_ship_type = 'espionage_probe' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 5;
            ELSIF v_ship_type = 'bomber' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 500;
            ELSIF v_ship_type = 'destroyer' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 2000;
            ELSIF v_ship_type = 'death_star' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 1000000;
            ELSIF v_ship_type = 'battle_cruiser' THEN
                v_total_capacity := v_total_capacity + v_requested_count * 750;
            END IF;
        END;
    END LOOP;

    -- Check fleet size (at least 1 ship)
    IF (SELECT count(*) FROM jsonb_object_keys(p_ships)) = 0 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'No ships selected');
    END IF;

    -- Check resource capacity
    v_total_resources := COALESCE((p_resources->>'metal')::float, 0) +
                      COALESCE((p_resources->>'crystal')::float, 0) +
                      COALESCE((p_resources->>'gas')::float, 0);

    IF v_total_resources > v_total_capacity THEN
        RETURN jsonb_build_object('valid', false, 'error', format('Cargo capacity exceeded. Capacity: %s, Resources: %s', v_total_capacity, v_total_resources));
    END IF;

    -- Get available resources
    SELECT jsonb_build_object('metal', metal, 'crystal', crystal, 'gas', gas) INTO v_available_resources
    FROM planet_resources
    WHERE planet_id = p_planet_id;

    IF v_available_resources IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet resources not found');
    END IF;

    -- Check resource availability
    IF (v_available_resources->>'metal')::float < COALESCE((p_resources->>'metal')::float, 0) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient metal');
    END IF;

    IF (v_available_resources->>'crystal')::float < COALESCE((p_resources->>'crystal')::float, 0) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient crystal');
    END IF;

    IF (v_available_resources->>'gas')::float < COALESCE((p_resources->>'gas')::float, 0) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient gas');
    END IF;

    -- Check fleet limit
    DECLARE
        v_computer_tech_level int := 0;
        v_max_fleets int;
        v_active_fleets int;
        v_research_type_id int;
    BEGIN
        -- Get research type ID safely
        SELECT id INTO v_research_type_id FROM research_types WHERE name = 'Computer Technology';
        
        IF v_research_type_id IS NOT NULL THEN
             SELECT COALESCE(level, 0) INTO v_computer_tech_level
             FROM user_research_levels
             WHERE user_id = p_user_id AND research_type_id = v_research_type_id;
        END IF;

        v_max_fleets := 1 + v_computer_tech_level;

        SELECT count(*) INTO v_active_fleets
        FROM fleets
        WHERE user_id = p_user_id AND status IN ('active', 'returning');

        IF v_active_fleets >= v_max_fleets THEN
            RETURN jsonb_build_object('valid', false, 'error', format('Fleet limit reached (%s)', v_max_fleets));
        END IF;
    END;

    -- Expedition limit check
    IF p_mission = 'expedition' THEN
        DECLARE
            v_active_expeditions int;
        BEGIN
            SELECT count(*) INTO v_active_expeditions
            FROM fleets
            WHERE origin_planet_id = p_planet_id AND mission = 'expedition' AND status IN ('active', 'returning');

            IF v_active_expeditions >= 18 THEN
                RETURN jsonb_build_object('valid', false, 'error', 'Expedition limit reached (18)');
            END IF;
        END;
    END IF;

    -- Get movement info for final validation
    SELECT get_fleet_movement_info(
        (SELECT galaxy_id FROM planets WHERE id = p_planet_id),
        (SELECT system_id FROM planets WHERE id = p_planet_id),
        (SELECT planet_number FROM planets WHERE id = p_planet_id),
        p_target_galaxy, p_target_system, p_target_planet,
        p_ships, p_mission
    ) INTO v_movement_info;

    IF NOT (v_movement_info->>'can_reach')::boolean THEN
        RETURN jsonb_build_object('valid', false, 'error', v_movement_info->>'reason');
    END IF;

    -- All validations passed
    RETURN jsonb_build_object(
        'valid', true,
        'movement_info', v_movement_info,
        'total_capacity', v_total_capacity
    );
END;
$$ LANGUAGE plpgsql;
