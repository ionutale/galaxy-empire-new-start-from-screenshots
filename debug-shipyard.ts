
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { sql } from 'drizzle-orm';

const { Pool } = pg;

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is not set');
    }

    const pool = new Pool({ connectionString });
    const db = drizzle(pool);

    const userId = 3;
    const planetId = 4;
    const shipType = 'heavy_fighter';
    const amount = 1;

    console.log(`Checking prerequisites for User ${userId}, Planet ${planetId}...`);

    // 1. Check Planet Ownership
    const planetRes = await db.execute(sql`SELECT user_id FROM planets WHERE id = ${planetId}`);
    if (planetRes.rows.length === 0) {
        console.log('Planet not found');
        return;
    }
    const ownerId = planetRes.rows[0].user_id;
    console.log(`Planet Owner: ${ownerId} (Expected: ${userId})`);

    // 2. Check Shipyard Level
    const shipyardRes = await db.execute(sql`
        SELECT pb.level 
        FROM planet_buildings pb
        JOIN building_types bt ON bt.id = pb.building_type_id
        WHERE pb.planet_id = ${planetId} AND bt.name = 'Shipyard'
    `);
    const shipyardLevel = shipyardRes.rows.length > 0 ? shipyardRes.rows[0].level : 0;
    console.log(`Shipyard Level: ${shipyardLevel}`);

    // 3. Check Resources
    const resourcesRes = await db.execute(sql`SELECT * FROM planet_resources WHERE planet_id = ${planetId}`);
    const resources = resourcesRes.rows[0];
    console.log('Resources:', resources);

    // 4. Try validation directly
    console.log('Testing validate_ship_construction function...');
    try {
        const valRes = await db.execute(sql`SELECT validate_ship_construction(${userId}, ${planetId}, ${shipType}, ${amount}) as res`);
        console.log('Validation Result:', valRes.rows[0].res);
    } catch (e: any) {
        console.error('Validation Direct Call Failed:', e.message);
    }

    // 5. Apply Procedure Fixes Directly (Bypassing Migration)
    console.log('Applying SQL Fixes Directly...');
    const fix0026 = `
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
$$ LANGUAGE plpgsql;`;

    const fix0025 = `
CREATE OR REPLACE PROCEDURE start_ship_construction(
    p_user_id int,
    p_planet_id int,
    p_ship_type text,
    p_amount int
) AS $$
DECLARE
    validation_result jsonb;
    construction_time interval;
    completion_time timestamptz;
    total_cost jsonb;
    v_shipyard_id int;
BEGIN
    -- Validate the construction request
    SELECT validate_ship_construction(p_user_id, p_planet_id, p_ship_type, p_amount) INTO validation_result;

    IF NOT (validation_result->>'valid')::boolean THEN
        RAISE EXCEPTION '%', validation_result->>'error';
    END IF;

    -- Get the cost from validation result
    total_cost := validation_result->'cost';

    -- Get shipyard building type id once
    SELECT id INTO v_shipyard_id FROM building_types WHERE name = 'Shipyard';

    -- Calculate construction time
    SELECT calculate_ship_construction_time(p_ship_type, p_amount,
        (SELECT COALESCE(level, 1) FROM planet_buildings WHERE planet_id = p_planet_id AND building_type_id = v_shipyard_id),
        0, 0) INTO construction_time; -- TODO: Add robotics/nanite levels

    -- Calculate completion time
    completion_time := now() + construction_time;

    -- Deduct resources
    UPDATE planet_resources
    SET metal = metal - (total_cost->>'metal')::int,
        crystal = crystal - (total_cost->>'crystal')::int,
        gas = gas - (total_cost->>'gas')::int
    WHERE planet_id = p_planet_id;

    -- Add to shipyard queue
    INSERT INTO shipyard_queue (user_id, planet_id, ship_type, amount, completion_at)
    VALUES (p_user_id, p_planet_id, p_ship_type, p_amount, completion_time);
END;
$$ LANGUAGE plpgsql;`;

    await db.execute(sql.raw('DROP FUNCTION IF EXISTS validate_ship_construction(int, int, text, int);'));
    await db.execute(sql.raw('DROP PROCEDURE IF EXISTS start_ship_construction(int, int, text, int);'));

    await db.execute(sql.raw(fix0026));
    await db.execute(sql.raw(fix0025));
    console.log('Fixes applied.');

    // 5. Try calling the procedure
    console.log('Attempting CALL start_ship_construction...');
    try {
        await db.execute(sql`CALL start_ship_construction(${userId}, ${planetId}, ${shipType}, ${amount})`);
        console.log('Success!');
    } catch (e: any) {
        console.error('Procedure Call Failed!');
        console.error('Message:', e.message);
        if (e.cause) console.error('Cause:', e.cause);
        // Postgres error fields often available on the error object directly
        console.error('Detail:', (e as any).detail);
        console.error('Hint:', (e as any).hint);
        console.error('Where:', (e as any).where);
    }

    await pool.end();
}

main().catch(console.error);
