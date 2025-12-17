import { fail, redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { comparePassword, createSession } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const username = data.get('username') as string;
        const password = data.get('password') as string;

        if (!username || !password) {
            return fail(400, { missing: true });
        }

        try {
            const result = await pool.query(
                'SELECT id, password_hash FROM users WHERE username = $1',
                [username]
            );

            const user = result.rows[0];

            if (!user || !(await comparePassword(password, user.password_hash))) {
                return fail(400, { invalid: true });
            }

            const sessionId = await createSession(user.id);
            cookies.set('session_id', sessionId, {
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 30 // 30 days
            });

        } catch (err) {
            console.error(err);
            return fail(500, { error: 'Internal Server Error' });
        }

        throw redirect(303, '/game');
    }
} satisfies Actions;
