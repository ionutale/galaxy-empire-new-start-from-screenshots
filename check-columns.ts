import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    user: 'galaxy_user',
    password: 'galaxy_password',
    host: 'localhost',
    port: 5433,
    database: 'galaxy_empire'
});

async function checkColumns() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_research'
        `);
        console.log('Columns in user_research:', res.rows.map(r => r.column_name));
    } catch (err) {
        console.error('Error checking columns:', err);
    } finally {
        await pool.end();
    }
}

checkColumns();
