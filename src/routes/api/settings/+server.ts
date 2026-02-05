import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, users } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { hashPassword, comparePassword, deleteSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const data = await request.json();
	const action = data.action;

	try {
		if (action === 'logout') {
			const sessionId = cookies.get('session_id');
			if (sessionId) {
				await deleteSession(sessionId);
				cookies.delete('session_id', { path: '/' });
			}
			return json({ success: true, redirect: '/login' });
		}

		if (action === 'updateProfile') {
			const { email, avatar_id } = data;

			if (!email) return json({ error: 'Email is required' }, { status: 400 });

			await db
				.update(users)
				.set({
					email,
					avatarId: Number(avatar_id)
				})
				.where(eq(users.id, locals.user.id));

			return json({ success: true, message: 'Profile updated' });
		}

		if (action === 'changePassword') {
			const { current_password, new_password, confirm_password } = data;

			if (!current_password || !new_password || !confirm_password) {
				return json({ error: 'All fields are required' }, { status: 400 });
			}

			if (new_password !== confirm_password) {
				return json({ error: 'New passwords do not match' }, { status: 400 });
			}

			// Verify current password
			const userRes = await db
				.select({ passwordHash: users.passwordHash })
				.from(users)
				.where(eq(users.id, locals.user.id));
			const user = userRes[0];

			const valid = await comparePassword(current_password, user.passwordHash);
			if (!valid) {
				return json({ error: 'Incorrect current password' }, { status: 400 });
			}

			// Hash new password
			const newHash = await hashPassword(new_password);

			await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, locals.user.id));

			return json({ success: true, message: 'Password changed successfully' });
		}

		return json({ error: 'Invalid action' }, { status: 400 });
	} catch (e: any) {
		console.error(`Error in settings action ${action}:`, e);
		return json({ error: e.message || 'Server error' }, { status: 500 });
	}
};
