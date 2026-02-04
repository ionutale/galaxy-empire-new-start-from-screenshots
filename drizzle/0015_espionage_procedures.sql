-- Migration: Add stored procedures for espionage mission processing
-- This migration moves espionage mission processing logic to the database

-- Procedure to process espionage mission
CREATE OR REPLACE PROCEDURE process_espionage_mission(fleet_id int) AS $$
DECLARE
    fleet_record record;
    target_planet record;
    resources_data record;
    buildings_data record;
    ships_data record;
    defenses_data record;
    research_data record;
    report_id int;
    detection_chance float := 0.3; -- 30% chance of detection
BEGIN
    -- Get fleet information
    SELECT * INTO fleet_record
    FROM fleets
    WHERE id = fleet_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Find target planet
    SELECT p.*, pr.metal, pr.crystal, pr.gas
    INTO target_planet
    FROM planets p
    LEFT JOIN planet_resources pr ON pr.planet_id = p.id
    WHERE p.galaxy_id = fleet_record.target_galaxy
      AND p.system_id = fleet_record.target_system
      AND p.planet_number = fleet_record.target_planet;

    IF NOT FOUND THEN
        -- No target found - send failure message
        INSERT INTO messages (user_id, type, title, content)
        VALUES (fleet_record.user_id, 'espionage', 'Espionage Failed', 'No target found at coordinates.');

        -- Return fleet
        PERFORM return_fleet(fleet_id);
        RETURN;
    END IF;

    -- Gather intelligence data
    -- Resources
    SELECT metal, crystal, gas INTO resources_data
    FROM planet_resources
    WHERE planet_id = target_planet.id;

    -- Buildings
    SELECT * INTO buildings_data
    FROM planet_buildings
    WHERE planet_id = target_planet.id;

    -- Ships
    SELECT * INTO ships_data
    FROM planet_ships
    WHERE planet_id = target_planet.id;

    -- Defenses
    SELECT * INTO defenses_data
    FROM planet_defenses
    WHERE planet_id = target_planet.id;

    -- Research
    SELECT * INTO research_data
    FROM user_research
    WHERE user_id = target_planet.user_id;

    -- Create espionage report
    INSERT INTO espionage_reports (
        attacker_id, target_id, galaxy, system, planet,
        resources, buildings, fleet, defenses, research
    ) VALUES (
        fleet_record.user_id, target_planet.user_id,
        fleet_record.target_galaxy, fleet_record.target_system, fleet_record.target_planet,
        CASE WHEN resources_data IS NOT NULL THEN
            jsonb_build_object('metal', resources_data.metal, 'crystal', resources_data.crystal, 'gas', resources_data.gas)
        ELSE NULL END,
        CASE WHEN buildings_data IS NOT NULL THEN to_jsonb(buildings_data) ELSE NULL END,
        CASE WHEN ships_data IS NOT NULL THEN to_jsonb(ships_data) ELSE NULL END,
        CASE WHEN defenses_data IS NOT NULL THEN to_jsonb(defenses_data) ELSE NULL END,
        CASE WHEN research_data IS NOT NULL THEN to_jsonb(research_data) ELSE NULL END
    ) RETURNING id INTO report_id;

    -- Send success message to attacker
    INSERT INTO messages (user_id, type, title, content)
    VALUES (
        fleet_record.user_id,
        'espionage',
        'Espionage Report',
        format('Espionage mission successful at [%s:%s:%s]\n\n[View Detailed Report](/game/espionage-report/%s)',
               fleet_record.target_galaxy, fleet_record.target_system, fleet_record.target_planet, report_id)
    );

    -- Chance of detection (notify defender)
    IF random() < detection_chance THEN
        INSERT INTO messages (user_id, type, title, content)
        VALUES (
            target_planet.user_id,
            'espionage',
            'Espionage Detected!',
            format('An espionage probe was detected at [%s:%s:%s]',
                   fleet_record.target_galaxy, fleet_record.target_system, fleet_record.target_planet)
        );
    END IF;

    -- Return fleet
    PERFORM return_fleet(fleet_id);
END;
$$ LANGUAGE plpgsql;

-- Helper function to return fleet (simplified version)
CREATE OR REPLACE PROCEDURE return_fleet(fleet_id int) AS $$
DECLARE
    fleet_record record;
BEGIN
    -- Get fleet information
    SELECT * INTO fleet_record
    FROM fleets
    WHERE id = fleet_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Add ships back to origin planet
    -- This is a simplified version - in reality you'd need to handle the fleet return journey
    UPDATE planet_ships
    SET light_fighter = light_fighter + COALESCE((fleet_record.ships->>'light_fighter')::int, 0),
        heavy_fighter = heavy_fighter + COALESCE((fleet_record.ships->>'heavy_fighter')::int, 0),
        cruiser = cruiser + COALESCE((fleet_record.ships->>'cruiser')::int, 0),
        battleship = battleship + COALESCE((fleet_record.ships->>'battleship')::int, 0),
        battle_cruiser = battle_cruiser + COALESCE((fleet_record.ships->>'battle_cruiser')::int, 0),
        bomber = bomber + COALESCE((fleet_record.ships->>'bomber')::int, 0),
        destroyer = destroyer + COALESCE((fleet_record.ships->>'destroyer')::int, 0),
        death_star = death_star + COALESCE((fleet_record.ships->>'death_star')::int, 0),
        small_cargo = small_cargo + COALESCE((fleet_record.ships->>'small_cargo')::int, 0),
        large_cargo = large_cargo + COALESCE((fleet_record.ships->>'large_cargo')::int, 0),
        colony_ship = colony_ship + COALESCE((fleet_record.ships->>'colony_ship')::int, 0),
        espionage_probe = espionage_probe + COALESCE((fleet_record.ships->>'espionage_probe')::int, 0),
        recycler = recycler + COALESCE((fleet_record.ships->>'recycler')::int, 0)
    WHERE planet_id = fleet_record.origin_planet_id;

    -- Add resources back to origin planet
    UPDATE planet_resources
    SET metal = metal + COALESCE((fleet_record.resources->>'metal')::int, 0),
        crystal = crystal + COALESCE((fleet_record.resources->>'crystal')::int, 0),
        gas = gas + COALESCE((fleet_record.resources->>'gas')::int, 0)
    WHERE planet_id = fleet_record.origin_planet_id;

    -- Delete the fleet
    DELETE FROM fleets WHERE id = fleet_id;
END;
$$ LANGUAGE plpgsql;