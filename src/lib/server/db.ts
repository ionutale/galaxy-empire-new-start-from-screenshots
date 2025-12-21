import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Fallback to individual params if DATABASE_URL is not set (optional)
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    options: `-c timezone=${Intl.DateTimeFormat().resolvedOptions().timeZone}`
});

export const db = drizzle(pool, { schema });
export * from './db/schema';


