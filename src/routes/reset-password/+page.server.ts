import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { passwordResets, users } from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { hashPassword } from '$lib/server/auth';

export const load = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		throw redirect(302, '/login');
	}

	// Verify token exists and is valid
	const result = await db
		.select()
		.from(passwordResets)
		.where(and(eq(passwordResets.token, token), gt(passwordResets.expiresAt, new Date())));

	if (result.length === 0) {
		return {
			token,
			error: 'Invalid or expired password reset link.'
		};
	}

	return { token };
};

// Actions have been moved to /api/auth/reset-password
