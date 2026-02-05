import { db, messages, users } from '$lib/server/db';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { messages: [], allianceMembers: [] };

	const res = await db
		.select()
		.from(messages)
		.where(eq(messages.userId, locals.user.id))
		.orderBy(desc(messages.createdAt))
		.limit(25);

	// Mark as read (simplified: mark all as read on open)
	await db.update(messages).set({ isRead: true }).where(eq(messages.userId, locals.user.id));

	// Load alliance members if user is in an alliance
	let allianceMembers: { id: number; username: string }[] = [];
	if (locals.user.allianceId) {
		allianceMembers = await db
			.select({
				id: users.id,
				username: users.username
			})
			.from(users)
			.where(eq(users.allianceId, locals.user.allianceId))
			.orderBy(users.username);
	}

	return {
		messages: res,
		allianceMembers
	};
};
