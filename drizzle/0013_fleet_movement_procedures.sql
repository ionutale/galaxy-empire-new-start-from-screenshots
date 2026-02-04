-- Migration: Add stored procedures for fleet movement calculations
-- This migration moves fleet movement logic to the database

-- Function to calculate distance between two coordinates
CREATE OR REPLACE FUNCTION calculate_distance(
    from_galaxy int,
    from_system int,
    from_planet int,
    to_galaxy int,
    to_system int,
    to_planet int
) RETURNS float AS $$
DECLARE
    distance float;
BEGIN
    -- Same galaxy, same system
    IF from_galaxy = to_galaxy AND from_system = to_system THEN
        distance := abs(from_planet - to_planet) * 1000; -- 1000 units per planet slot
        RETURN distance;
    END IF;

    -- Same galaxy, different system
    IF from_galaxy = to_galaxy THEN
        DECLARE
            system_diff float := abs(from_system - to_system);
            planet_diff float := abs(from_planet - to_planet);
        BEGIN
            distance := sqrt(system_diff * system_diff + planet_diff * planet_diff) * 2000;
            RETURN distance;
        END;
    END IF;

    -- Different galaxy
    DECLARE
        galaxy_diff float := abs(from_galaxy - to_galaxy);
        system_diff float := abs(from_system - to_system);
        planet_diff float := abs(from_planet - to_planet);
    BEGIN
        -- More complex formula for inter-galaxy travel
        distance := sqrt(galaxy_diff * galaxy_diff * 10000 + system_diff * system_diff * 400 + planet_diff * planet_diff * 400);
        RETURN distance;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate fleet speed based on slowest ship
CREATE OR REPLACE FUNCTION calculate_fleet_speed(ships jsonb) RETURNS jsonb AS $$
DECLARE
    ship_record RECORD;
    slowest_speed float := 'infinity'::float;
    slowest_ship text := '';
    ship_speed float;
BEGIN
    -- Ship speeds (hardcoded from game-config.ts)
    DECLARE
        ship_speeds jsonb := '{
            "light_fighter": 12500,
            "heavy_fighter": 10000,
            "cruiser": 15000,
            "battleship": 10000,
            "small_cargo": 5000,
            "large_cargo": 7500,
            "colony_ship": 2500,
            "recycler": 2000,
            "espionage_probe": 100000000,
            "bomber": 4000,
            "destroyer": 5000,
            "death_star": 100,
            "battle_cruiser": 10000
        }';
    BEGIN
        -- Find slowest ship
        FOR ship_record IN SELECT * FROM jsonb_object_keys(ships) AS key
        LOOP
            DECLARE
                ship_count int := (ships->>ship_record.key)::int;
                ship_type text := ship_record.key;
            BEGIN
                IF ship_count > 0 THEN
                    ship_speed := (ship_speeds->>ship_type)::float;
                    IF ship_speed IS NOT NULL AND ship_speed < slowest_speed THEN
                        slowest_speed := ship_speed;
                        slowest_ship := ship_type;
                    END IF;
                END IF;
            END;
        END LOOP;

        -- Default speed if no ships found
        IF slowest_speed = 'infinity'::float THEN
            slowest_speed := 5000;
            slowest_ship := 'unknown';
        END IF;

        RETURN jsonb_build_object('speed', slowest_speed, 'slowest_ship', slowest_ship);
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate travel duration
CREATE OR REPLACE FUNCTION calculate_travel_duration(distance float, fleet_speed float) RETURNS int AS $$
DECLARE
    base_time float;
    time_multiplier float;
BEGIN
    -- Base formula: time = distance / speed
    -- Add minimum time to prevent instant travel
    base_time := GREATEST(distance / fleet_speed, 30); -- Minimum 30 seconds

    -- Apply realism - longer distances take disproportionately longer
    time_multiplier := 1 + (distance / 100000); -- Small penalty for very long distances

    RETURN ceil(base_time * time_multiplier);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate fuel consumption
CREATE OR REPLACE FUNCTION calculate_fuel_consumption(
    distance float,
    ships jsonb,
    mission text
) RETURNS int AS $$
DECLARE
    total_fuel float := 0;
    ship_record RECORD;
BEGIN
    -- Ship capacities (used as fuel consumption base)
    DECLARE
        ship_capacities jsonb := '{
            "light_fighter": 50,
            "heavy_fighter": 100,
            "cruiser": 800,
            "battleship": 1500,
            "small_cargo": 5000,
            "large_cargo": 25000,
            "colony_ship": 7500,
            "recycler": 20000,
            "espionage_probe": 5,
            "bomber": 500,
            "destroyer": 2000,
            "death_star": 1000000,
            "battle_cruiser": 750
        }';
    BEGIN
        -- Calculate fuel for each ship type
        FOR ship_record IN SELECT * FROM jsonb_object_keys(ships) AS key
        LOOP
            DECLARE
                ship_count int := (ships->>ship_record.key)::int;
                ship_type text := ship_record.key;
                capacity float;
            BEGIN
                IF ship_count > 0 THEN
                    capacity := (ship_capacities->>ship_type)::float;
                    IF capacity IS NOT NULL THEN
                        -- Simplified fuel calculation: 1% of capacity per 1000 units distance
                        total_fuel := total_fuel + (capacity * 0.01 * ship_count * (distance / 1000));
                    END IF;
                END IF;
            END;
        END LOOP;

        -- Mission modifiers
        IF mission = 'expedition' THEN
            total_fuel := total_fuel * 1.5; -- Expeditions consume more fuel
        END IF;

        RETURN ceil(total_fuel);
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to get complete fleet movement information
CREATE OR REPLACE FUNCTION get_fleet_movement_info(
    from_galaxy int,
    from_system int,
    from_planet int,
    to_galaxy int,
    to_system int,
    to_planet int,
    ships jsonb,
    mission text
) RETURNS jsonb AS $$
DECLARE
    distance float;
    fleet_speed_info jsonb;
    fleet_speed float;
    slowest_ship text;
    duration int;
    fuel_consumption int;
    can_reach boolean := true;
    reason text := '';
BEGIN
    -- Calculate distance
    distance := calculate_distance(from_galaxy, from_system, from_planet, to_galaxy, to_system, to_planet);

    -- Calculate fleet speed
    fleet_speed_info := calculate_fleet_speed(ships);
    fleet_speed := (fleet_speed_info->>'speed')::float;
    slowest_ship := fleet_speed_info->>'slowest_ship';

    -- Calculate duration
    duration := calculate_travel_duration(distance, fleet_speed);

    -- Calculate fuel
    fuel_consumption := calculate_fuel_consumption(distance, ships, mission);

    -- Validation
    IF distance = 0 AND mission != 'deploy' THEN
        can_reach := false;
        reason := 'Cannot send fleet to same location';
    END IF;

    IF mission = 'expedition' THEN
        IF distance < 1000 OR distance > 50000 THEN
            can_reach := false;
            reason := 'Expedition distance must be between 1,000 and 50,000 units';
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'distance', distance,
        'duration', duration,
        'fleet_speed', fleet_speed,
        'slowest_ship', slowest_ship,
        'fuel_consumption', fuel_consumption,
        'can_reach', can_reach,
        'reason', reason
    );
END;
$$ LANGUAGE plpgsql;