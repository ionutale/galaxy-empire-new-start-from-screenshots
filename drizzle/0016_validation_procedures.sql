-- Migration: Add database-side validation procedures
-- This migration creates stored procedures for validating game actions

-- Function to validate building construction
CREATE OR REPLACE FUNCTION validate_building_construction(
    user_id int,
    planet_id int,
    building_type_id int,
    target_level int
) RETURNS jsonb AS $$
DECLARE
    planet_owner int;
    available_resources jsonb;
    required_resources jsonb;
    building_cost jsonb;
    current_level int := 0;
    prereqs_met boolean := true;
    result jsonb;
BEGIN
    -- Check if planet belongs to user
    SELECT p.user_id INTO planet_owner
    FROM planets p
    WHERE p.id = planet_id;

    IF planet_owner IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet not found');
    END IF;

    IF planet_owner != user_id THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Access denied');
    END IF;

    -- Check if building is already being constructed
    IF EXISTS (
        SELECT 1 FROM building_queue
        WHERE planet_id = planet_id AND building_type_id = building_type_id
    ) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Building already in construction queue');
    END IF;

    -- Get current building level
    SELECT COALESCE(level, 0) INTO current_level
    FROM planet_buildings
    WHERE planet_id = planet_id AND building_type_id = building_type_id;

    -- Check if target level is valid
    IF target_level <= current_level THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Target level must be higher than current level');
    END IF;

    -- Check prerequisites
    SELECT check_building_prerequisites(planet_id, building_type_id, target_level) INTO prereqs_met;
    IF NOT prereqs_met THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Prerequisites not met');
    END IF;

    -- Calculate required resources
    SELECT calculate_building_cost(building_type_id, target_level) INTO building_cost;
    IF building_cost IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid building type');
    END IF;

    -- Get available resources
    SELECT jsonb_build_object('metal', metal, 'crystal', crystal, 'gas', gas) INTO available_resources
    FROM planet_resources
    WHERE planet_id = planet_id;

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

-- Function to validate research start
CREATE OR REPLACE FUNCTION validate_research_start(
    user_id int,
    research_type_id int,
    planet_id int
) RETURNS jsonb AS $$
DECLARE
    planet_owner int;
    available_resources jsonb;
    required_resources jsonb;
    research_cost jsonb;
    current_level int := 0;
    target_level int;
    prereqs_met boolean := true;
    lab_level int := 0;
BEGIN
    -- Check if planet belongs to user
    SELECT p.user_id INTO planet_owner
    FROM planets p
    WHERE p.id = planet_id;

    IF planet_owner IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet not found');
    END IF;

    IF planet_owner != user_id THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Access denied');
    END IF;

    -- Check if research is already being conducted
    IF EXISTS (
        SELECT 1 FROM research_queue
        WHERE user_id = user_id AND research_type_id = research_type_id
    ) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Research already in progress');
    END IF;

    -- Get current research level
    SELECT COALESCE(level, 0) INTO current_level
    FROM user_research_levels
    WHERE user_id = user_id AND research_type_id = research_type_id;

    target_level := current_level + 1;

    -- Check prerequisites
    SELECT check_research_prerequisites(user_id, research_type_id, target_level) INTO prereqs_met;
    IF NOT prereqs_met THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Prerequisites not met');
    END IF;

    -- Check research lab requirement (simplified - assume level 1+ required)
    SELECT COALESCE(MAX(level), 0) INTO lab_level
    FROM planet_buildings pb
    JOIN planets p ON p.id = pb.planet_id
    WHERE p.user_id = user_id AND pb.building_type_id = (SELECT id FROM building_types WHERE name = 'Research Lab');

    IF lab_level < 1 THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Research Lab required');
    END IF;

    -- Calculate required resources
    SELECT calculate_research_cost(research_type_id, target_level) INTO research_cost;
    IF research_cost IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid research type');
    END IF;

    -- Get available resources (use planet resources for simplicity)
    SELECT jsonb_build_object('metal', metal, 'crystal', crystal, 'gas', gas) INTO available_resources
    FROM planet_resources
    WHERE planet_id = planet_id;

    IF available_resources IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet resources not found');
    END IF;

    -- Check resource availability
    IF (available_resources->>'metal')::float < (research_cost->>'metal')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient metal');
    END IF;

    IF (available_resources->>'crystal')::float < (research_cost->>'crystal')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient crystal');
    END IF;

    IF (available_resources->>'gas')::float < (research_cost->>'gas')::float THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient gas');
    END IF;

    -- All validations passed
    RETURN jsonb_build_object('valid', true, 'cost', research_cost, 'target_level', target_level);
END;
$$ LANGUAGE plpgsql;

-- Function to validate fleet dispatch
CREATE OR REPLACE FUNCTION validate_fleet_dispatch(
    user_id int,
    planet_id int,
    ships jsonb,
    mission text,
    target_galaxy int,
    target_system int,
    target_planet int,
    resources jsonb
) RETURNS jsonb AS $$
DECLARE
    planet_owner int;
    available_ships jsonb;
    available_resources jsonb;
    total_capacity float := 0;
    total_resources float := 0;
    movement_info jsonb;
    ship_record record;
BEGIN
    -- Check if planet belongs to user
    SELECT p.user_id INTO planet_owner
    FROM planets p
    WHERE p.id = planet_id;

    IF planet_owner IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet not found');
    END IF;

    IF planet_owner != user_id THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Access denied');
    END IF;

    -- Check if user has ships
    SELECT * INTO available_ships
    FROM planet_ships
    WHERE planet_id = planet_id;

    IF available_ships IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'No ships available');
    END IF;

    -- Validate ship counts
    FOR ship_record IN SELECT * FROM jsonb_object_keys(ships) AS key
    LOOP
        DECLARE
            ship_type text := ship_record.key;
            requested_count int := (ships->>ship_type)::int;
            available_count int;
        BEGIN
            -- Get available count for this ship type
            available_count := (available_ships->>ship_type)::int;

            IF available_count IS NULL OR available_count < requested_count THEN
                RETURN jsonb_build_object('valid', false, 'error', format('Insufficient %s', ship_type));
            END IF;

            -- Calculate capacity (simplified)
            IF ship_type = 'small_cargo' THEN
                total_capacity := total_capacity + requested_count * 5000;
            ELSIF ship_type = 'large_cargo' THEN
                total_capacity := total_capacity + requested_count * 25000;
            ELSIF ship_type = 'light_fighter' THEN
                total_capacity := total_capacity + requested_count * 50;
            ELSIF ship_type = 'heavy_fighter' THEN
                total_capacity := total_capacity + requested_count * 100;
            ELSIF ship_type = 'cruiser' THEN
                total_capacity := total_capacity + requested_count * 800;
            ELSIF ship_type = 'battleship' THEN
                total_capacity := total_capacity + requested_count * 1500;
            ELSIF ship_type = 'colony_ship' THEN
                total_capacity := total_capacity + requested_count * 7500;
            ELSIF ship_type = 'recycler' THEN
                total_capacity := total_capacity + requested_count * 20000;
            END IF;
        END;
    END LOOP;

    -- Check fleet size (at least 1 ship)
    IF jsonb_object_keys(ships) IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'No ships selected');
    END IF;

    -- Check resource capacity
    total_resources := COALESCE((resources->>'metal')::float, 0) +
                      COALESCE((resources->>'crystal')::float, 0) +
                      COALESCE((resources->>'gas')::float, 0);

    IF total_resources > total_capacity THEN
        RETURN jsonb_build_object('valid', false, 'error', format('Cargo capacity exceeded. Capacity: %s, Resources: %s', total_capacity, total_resources));
    END IF;

    -- Get available resources
    SELECT jsonb_build_object('metal', metal, 'crystal', crystal, 'gas', gas) INTO available_resources
    FROM planet_resources
    WHERE planet_id = planet_id;

    IF available_resources IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Planet resources not found');
    END IF;

    -- Check resource availability
    IF (available_resources->>'metal')::float < COALESCE((resources->>'metal')::float, 0) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient metal');
    END IF;

    IF (available_resources->>'crystal')::float < COALESCE((resources->>'crystal')::float, 0) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient crystal');
    END IF;

    IF (available_resources->>'gas')::float < COALESCE((resources->>'gas')::float, 0) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Insufficient gas');
    END IF;

    -- Check fleet limit
    DECLARE
        computer_tech_level int := 0;
        max_fleets int;
        active_fleets int;
    BEGIN
        SELECT COALESCE(level, 0) INTO computer_tech_level
        FROM user_research_levels
        WHERE user_id = user_id AND research_type_id = (SELECT id FROM research_types WHERE name = 'Computer Technology');

        max_fleets := 1 + computer_tech_level;

        SELECT count(*) INTO active_fleets
        FROM fleets
        WHERE user_id = user_id AND status IN ('active', 'returning');

        IF active_fleets >= max_fleets THEN
            RETURN jsonb_build_object('valid', false, 'error', format('Fleet limit reached (%s)', max_fleets));
        END IF;
    END;

    -- Expedition limit check
    IF mission = 'expedition' THEN
        DECLARE
            active_expeditions int;
        BEGIN
            SELECT count(*) INTO active_expeditions
            FROM fleets
            WHERE origin_planet_id = planet_id AND mission = 'expedition' AND status IN ('active', 'returning');

            IF active_expeditions >= 18 THEN
                RETURN jsonb_build_object('valid', false, 'error', 'Expedition limit reached (18)');
            END IF;
        END;
    END IF;

    -- Get movement info for final validation
    SELECT get_fleet_movement_info(
        (SELECT galaxy_id FROM planets WHERE id = planet_id),
        (SELECT system_id FROM planets WHERE id = planet_id),
        (SELECT planet_number FROM planets WHERE id = planet_id),
        target_galaxy, target_system, target_planet,
        ships, mission
    ) INTO movement_info;

    IF NOT (movement_info->>'can_reach')::boolean THEN
        RETURN jsonb_build_object('valid', false, 'error', movement_info->>'reason');
    END IF;

    -- All validations passed
    RETURN jsonb_build_object(
        'valid', true,
        'movement_info', movement_info,
        'total_capacity', total_capacity
    );
END;
$$ LANGUAGE plpgsql;</content>
<parameter name="filePath">/Users/ionutale/developer-playground/galaxy-empire-new-start-from-screenshots/drizzle/0016_validation_procedures.sql