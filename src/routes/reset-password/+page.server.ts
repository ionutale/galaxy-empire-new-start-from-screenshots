import { fail, redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';

export const load = async ({ url }) => {
    const token = url.searchParams.get('token');

    if (!token) {
        throw redirect(302, '/login');
    }

    // Verify token exists and is valid
    const result = await pool.query(
        'SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW()',
        [token]
    );

    if (result.rows.length === 0) {
        return {
            token,
            error: 'Invalid or expired password reset link.'
        };
    }

    return { token };
};

export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const token = data.get('token')?.toString();
        const password = data.get('password')?.toString();
        const confirmPassword = data.get('confirmPassword')?.toString();

        if (!token || !password || !confirmPassword) {
            return fail(400, { error: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return fail(400, { error: 'Passwords do not match' });
        }

        if (password.length < 6) {
            return fail(400, { error: 'Password must be at least 6 characters' });
        }

        try {
            // 1. Verify token again
            const result = await pool.query(
                'SELECT user_id FROM password_resets WHERE token = $1 AND expires_at > NOW()',
                [token]
            );

            if (result.rows.length === 0) {
                return fail(400, { error: 'Invalid or expired token' });
            }

            const userId = result.rows[0].user_id;

            // 2. Update password
            const hashedPassword = await hashPassword(password);
            await pool.query(
                'UPDATE users SET password_hash = $1 WHERE id = $2',
                [hashedPassword, userId]
            );

            // 3. Delete used token (and any other tokens for this user)
            await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);

        } catch (err) {
            console.error('Reset password error:', err);
            return fail(500, { error: 'An error occurred. Please try again.' });
        }

        throw redirect(302, '/login?reset=success');
    }
};
