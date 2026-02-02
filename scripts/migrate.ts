import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const { Pool } = pg;

async function main() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error('DATABASE_URL is not set');
	}

	const pool = new Pool({ connectionString });
	const db = drizzle(pool);

	console.log('Running migrations...');

	await migrate(db, { migrationsFolder: './drizzle' });

	console.log('Migrations completed successfully');

	await pool.end();
}

main().catch((err) => {
	console.error('Migration failed!');
	console.error(err);
	process.exit(1);
});
