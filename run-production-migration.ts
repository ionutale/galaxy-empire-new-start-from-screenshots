import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Handle __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL ||
		'postgres://galaxy_user:galaxy_password@localhost:5432/galaxy_empire'
});

async function runMigration() {
	try {
		console.log('Connecting to database...');
		const client = await pool.connect();
		console.log('Connected successfully.');
		client.release();

		const sqlPath = path.join(__dirname, 'src/lib/server/update-production-schema.sql');
		console.log(`Reading migration file from: ${sqlPath}`);

		if (!fs.existsSync(sqlPath)) {
			console.error('Migration file not found!');
			process.exit(1);
		}

		const sql = fs.readFileSync(sqlPath, 'utf-8');
		console.log('Applying migration...');

		await pool.query(sql);
		console.log('Migration applied successfully!');
	} catch (err) {
		console.error('Error applying migration:', err);
	} finally {
		await pool.end();
	}
}

runMigration();
