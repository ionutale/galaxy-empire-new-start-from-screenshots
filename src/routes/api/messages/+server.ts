import { json } from '@sveltejs/kit';
import { db, messages, privateMessages, users } from '$lib/server/db';
import { desc, eq, or } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const limit = Number(url.searchParams.get('limit')) || 25;
	const offset = Number(url.searchParams.get('offset')) || 0;

	// Get system messages
	const systemMessages = await db
		.select({
			id: messages.id,
			type: messages.type,
			title: messages.title,
			content: messages.content,
			isRead: messages.isRead,
			createdAt: messages.createdAt,
			messageType: 'system'
		})
		.from(messages)
		.where(eq(messages.userId, locals.user.id))
		.orderBy(desc(messages.createdAt))
		.limit(limit)
		.offset(offset);

	// Get private messages (sent and received)
	const privateMsgs = await db
		.select({
			id: privateMessages.id,
			type: 'private',
			title: privateMessages.subject,
			content: privateMessages.content,
			isRead: privateMessages.isRead,
			createdAt: privateMessages.createdAt,
			messageType: 'private',
			fromUsername: users.username,
			isSent: eq(privateMessages.fromUserId, locals.user.id)
		})
		.from(privateMessages)
		.leftJoin(users, eq(privateMessages.fromUserId, users.id))
		.where(
			or(
				eq(privateMessages.fromUserId, locals.user.id),
				eq(privateMessages.toUserId, locals.user.id)
			)
		)
		.orderBy(desc(privateMessages.createdAt))
		.limit(limit)
		.offset(offset);

	// Combine and sort
	const allMessages = [
		...systemMessages.map(msg => ({ ...msg, fromUsername: null, isSent: false })),
		...privateMsgs
	].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	return json({ messages: allMessages.slice(0, limit) });
};
