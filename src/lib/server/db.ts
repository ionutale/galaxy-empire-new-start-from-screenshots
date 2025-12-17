import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
    user: 'galaxy_user',
    password: 'galaxy_password',
    host: 'localhost',
    port: 5433,
    database: 'galaxy_empire'
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
