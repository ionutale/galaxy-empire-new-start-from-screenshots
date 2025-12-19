import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const { Pool } = pg;

const pool = new Pool({
    user: 'galaxy_user',
    password: 'galaxy_password',
    host: 'localhost',
    port: 5433,
    database: 'galaxy_empire'
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Running fleet templates schema migration...');
        const sql = readFileSync(join(process.cwd(), 'src/lib/server/schema-fleet-templates.sql'), 'utf-8');
        await client.query(sql);
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
