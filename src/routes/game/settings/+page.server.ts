import { db, users } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { hashPassword, comparePassword, deleteSession } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const userRes = await db
		.select({
			email: users.email,
			avatarId: users.avatarId
		})
		.from(users)
		.where(eq(users.id, locals.user.id));

	return {
		profile: userRes[0]
	};
};

export const actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const email = data.get('email') as string;
		const avatarId = Number(data.get('avatar_id'));

		if (!email) return fail(400, { error: 'Email is required' });

		try {
			await db.update(users).set({ email, avatarId }).where(eq(users.id, locals.user.id));
		} catch (e) {
			return fail(500, { error: 'Database error' });
		}

		return { success: true, message: 'Profile updated' };
	},

	changePassword: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const currentPassword = data.get('current_password') as string;
		const newPassword = data.get('new_password') as string;
		const confirmPassword = data.get('confirm_password') as string;

		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, { error: 'All fields are required' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'New passwords do not match' });
		}

		// Verify current password
		const userRes = await db
			.select({ passwordHash: users.passwordHash })
			.from(users)
			.where(eq(users.id, locals.user.id));
		const user = userRes[0];

		const valid = await comparePassword(currentPassword, user.passwordHash);
		if (!valid) {
			return fail(400, { error: 'Incorrect current password' });
		}

		// Hash new password
		const newHash = await hashPassword(newPassword);

		await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, locals.user.id));

		return { success: true, message: 'Password changed successfully' };
	},

	logout: async ({ cookies, locals }) => {
		const sessionId = cookies.get('session_id');
		if (sessionId) {
			await deleteSession(sessionId);
			cookies.delete('session_id', { path: '/' });
		}
		throw redirect(302, '/login');
	}
} satisfies Actions;
