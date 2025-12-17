import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const res = await pool.query(`
        SELECT u.id, u.username, u.points, a.tag as alliance_tag, a.name as alliance_name
        FROM users u
        LEFT JOIN alliances a ON u.alliance_id = a.id
        ORDER BY u.points DESC
        LIMIT 100
    `);

    return {
        highscores: res.rows
    };
};
