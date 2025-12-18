import { fail } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';

export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const email = data.get('email')?.toString();

        if (!email) {
            return fail(400, { error: 'Email is required' });
        }

        try {
            // 1. Check if user exists
            const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            const user = userResult.rows[0];

            if (user) {
                // 2. Generate token
                const token = randomUUID();
                const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

                // 3. Save token
                await pool.query(
                    'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
                    [user.id, token, expiresAt]
                );

                // 4. "Send" email (Log to console for now)
                const origin = env.ORIGIN || 'http://localhost:3000';
                const resetLink = `${origin}/reset-password?token=${token}`;
                
                console.log('=================================================================');
                console.log(`PASSWORD RESET REQUEST FOR: ${email}`);
                console.log(`Reset Link: ${resetLink}`);
                console.log('=================================================================');
            }

            // Always return success to prevent email enumeration
            return {
                success: true,
                message: 'If an account exists with that email, we have sent a password reset link.'
            };

        } catch (err) {
            console.error('Password reset error:', err);
            return fail(500, { error: 'An error occurred. Please try again later.' });
        }
    }
};
