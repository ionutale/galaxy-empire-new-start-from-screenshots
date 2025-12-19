import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema';
import { env } from '$env/dynamic/private';

const { Pool } = pg;

export const pool = new Pool({
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT || '5432'),
    database: env.DB_NAME,
    options: `-c timezone=${Intl.DateTimeFormat().resolvedOptions().timeZone}`
});

export const db = drizzle(pool, { schema });

export const query = (text: string, params?: any[]) => pool.query(text, params);
