import { json } from '@sveltejs/kit';
import { db, chatMessages, users, alliances } from '$lib/server/db';
import { desc, eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const channel = url.searchParams.get('channel') || 'global';

		let query = db
			.select({
				id: chatMessages.id,
				content: chatMessages.content,
				createdAt: chatMessages.createdAt,
				username: users.username,
				allianceTag: alliances.tag,
				channel: chatMessages.channel
			})
			.from(chatMessages)
			.innerJoin(users, eq(chatMessages.userId, users.id))
			.leftJoin(alliances, eq(users.allianceId, alliances.id));

		// Filter by channel
		if (channel === 'alliance') {
			// Check if user is in an alliance
			if (!locals.user.allianceId) {
				return json({ error: 'Not in an alliance' }, { status: 403 });
			}
			query = query.where(and(
				eq(chatMessages.channel, 'alliance'),
				eq(users.allianceId, locals.user.allianceId)
			));
		} else {
			query = query.where(eq(chatMessages.channel, 'global'));
		}

		const res = await query
			.orderBy(desc(chatMessages.createdAt))
			.limit(50);

		return json(res); // Newest first, client handles display order
	} catch (e) {
		console.error(e);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { content, channel = 'global' } = await request.json();
	if (!content || content.trim().length === 0) {
		return json({ error: 'Empty message' }, { status: 400 });
	}

	// Basic moderation - check for inappropriate content
	const bannedWords = ['badword1', 'badword2', 'inappropriate']; // Add actual banned words
	const lowerContent = content.toLowerCase();
	const hasBannedWord = bannedWords.some(word => lowerContent.includes(word));
	if (hasBannedWord) {
		return json({ error: 'Message contains inappropriate content' }, { status: 400 });
	}

	if (content.length > 500) {
		return json({ error: 'Message too long' }, { status: 400 });
	}

	if (channel !== 'global' && channel !== 'alliance') {
		return json({ error: 'Invalid channel' }, { status: 400 });
	}

	// Check alliance permission for alliance chat
	if (channel === 'alliance' && !locals.user.allianceId) {
		return json({ error: 'Not in an alliance' }, { status: 403 });
	}

	try {
		await db.insert(chatMessages).values({
			userId: locals.user.id,
			channel,
			content: content.trim()
		});
		return json({ success: true });
	} catch (e) {
		console.error(e);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
