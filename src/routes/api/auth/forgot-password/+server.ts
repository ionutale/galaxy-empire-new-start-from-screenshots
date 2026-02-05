import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, passwordResets } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email } = await request.json();

		if (!email) {
			return json({ success: false, error: 'Email is required' }, { status: 400 });
		}

		// 1. Check if user exists
		const userResult = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

		const user = userResult[0];

		if (user) {
			// 2. Generate token
			const token = randomUUID();
			const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

			// 3. Save token
			await db.insert(passwordResets).values({
				userId: user.id,
				token,
				expiresAt
			});

			// 4. "Send" email (Log to console for now)
			const origin = env.ORIGIN || 'http://localhost:3000';
			const resetLink = `${origin}/reset-password?token=${token}`;

			console.log('=================================================================');
			console.log(`PASSWORD RESET REQUEST FOR: ${email}`);
			console.log(`Reset Link: ${resetLink}`);
			console.log('=================================================================');
		}

		// Always return success to prevent email enumeration
		return json({
			success: true,
			message: 'If an account exists with that email, we have sent a password reset link.'
		});
	} catch (err) {
		console.error('Password reset error:', err);
		return json(
			{ success: false, error: 'An error occurred. Please try again later.' },
			{ status: 500 }
		);
	}
};
