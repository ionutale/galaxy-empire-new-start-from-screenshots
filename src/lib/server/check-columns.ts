import { pool } from './db';

async function checkColumns() {
    const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_research'
    `);
    console.log(res.rows.map(r => r.column_name));
    await pool.end();
}

checkColumns();
