import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const pool = new Pool({
    user: 'galaxy_user',
    password: 'galaxy_password',
    host: 'localhost',
    port: 5433,
    database: 'galaxy_empire'
});

async function runMigration() {
    try {
        const sqlPath = path.join(process.cwd(), 'src/lib/server/schema-push-subscriptions.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');
        await pool.query(sql);
        console.log('Migration applied successfully!');
    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
