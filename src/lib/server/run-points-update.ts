import { updateAllUserPoints } from './points-calculator';
import { pool } from './db';

async function run() {
    await updateAllUserPoints();
    await pool.end();
}

run();
