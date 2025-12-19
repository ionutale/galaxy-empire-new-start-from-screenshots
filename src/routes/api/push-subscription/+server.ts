import { json } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await request.json();

    try {
        await pool.query(
            `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, endpoint) DO NOTHING`,
            [
                locals.user.id,
                subscription.endpoint,
                subscription.keys.p256dh,
                subscription.keys.auth
            ]
        );

        return json({ success: true });
    } catch (err) {
        console.error('Error saving subscription:', err);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
