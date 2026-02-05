import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const { Pool } = pg;

const pool = new Pool({
	user: 'galaxy_user',
	password: 'galaxy_password',
	host: 'localhost',
	port: 5432,
	database: 'galaxy_empire'
});

async function runMigration() {
	const client = await pool.connect();
	try {
		console.log('Running shop schema migration...');
		const sql = readFileSync(join(process.cwd(), 'src/lib/server/schema-shop.sql'), 'utf-8');
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
