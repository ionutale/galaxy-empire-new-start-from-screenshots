import { json } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const res = await pool.query(`
            SELECT c.id, c.content, c.created_at, u.username, a.tag as alliance_tag
            FROM chat_messages c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN alliances a ON u.alliance_id = a.id
            ORDER BY c.created_at DESC
            LIMIT 50
        `);
        
        return json(res.rows); // Newest first, client handles display order
    } catch (e) {
        console.error(e);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await request.json();
    if (!content || content.trim().length === 0) {
        return json({ error: 'Empty message' }, { status: 400 });
    }

    try {
        await pool.query(
            'INSERT INTO chat_messages (user_id, content) VALUES ($1, $2)',
            [locals.user.id, content.trim()]
        );
        return json({ success: true });
    } catch (e) {
        console.error(e);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
