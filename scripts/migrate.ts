import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const { Pool } = pg;

async function main() {
    console.log('Checking environment variables...');
    console.log('DATABASE_URL is ' + (process.env.DATABASE_URL ? 'set' : 'not set'));
    if (process.env.DATABASE_URL) {
        console.log('DATABASE_URL length:', process.env.DATABASE_URL.length);
    } else {
        console.log('Available env vars:', Object.keys(process.env));
    }

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
