import { db, users } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

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
