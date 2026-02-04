
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
