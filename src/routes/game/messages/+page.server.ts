import { db, messages } from '$lib/server/db';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { messages: [] };

	const res = await db
		.select()
		.from(messages)
		.where(eq(messages.userId, locals.user.id))
		.orderBy(desc(messages.createdAt))
		.limit(25);

	// Mark as read (simplified: mark all as read on open)
	await db.update(messages).set({ isRead: true }).where(eq(messages.userId, locals.user.id));

	return {
		messages: res
	};
};
