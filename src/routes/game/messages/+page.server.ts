import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) return { messages: [] };

    const res = await pool.query(
        `SELECT * FROM messages 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [locals.user.id]
    );

    // Mark as read (simplified: mark all as read on open)
    await pool.query(
        'UPDATE messages SET is_read = TRUE WHERE user_id = $1',
        [locals.user.id]
    );

    return {
        messages: res.rows
    };
};
