import { pool } from './db';

async function addPointsColumn() {
    try {
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0
        `);
        console.log('Added points column to users table.');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

addPointsColumn();
