import { pool } from './db.js';

async function fixShips() {
    const client = await pool.connect();
    try {
        await client.query('INSERT INTO planet_ships (planet_id) SELECT id FROM planets ON CONFLICT DO NOTHING');
        console.log('Fixed ships for existing planets');
    } finally {
        client.release();
        await pool.end();
    }
}

fixShips();
