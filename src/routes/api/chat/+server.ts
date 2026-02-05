import { json } from '@sveltejs/kit';
import {
	db,
	chatMessages,
	users,
	alliances,
	userMutes,
	bannedWords,
	chatModeration
} from '$lib/server/db';
import { desc, eq, and, gte, lte } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const channel = url.searchParams.get('channel') || 'global';

		const query = db
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
		let whereClause;
		if (channel === 'alliance') {
			// Check if user is in an alliance
			if (!locals.user.allianceId) {
				return json({ error: 'Not in an alliance' }, { status: 403 });
			}
			whereClause = and(
				eq(chatMessages.channel, 'alliance'),
				eq(users.allianceId, locals.user.allianceId)
			);
		} else {
			whereClause = eq(chatMessages.channel, 'global');
		}

		const res = await query.where(whereClause).orderBy(desc(chatMessages.createdAt)).limit(50);

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

	// Check if user is muted
	const now = new Date();
	const activeMute = await db
		.select()
		.from(userMutes)
		.where(and(eq(userMutes.userId, locals.user.id), gte(userMutes.expiresAt, now)))
		.limit(1);

	if (activeMute.length > 0) {
		const expiresAt = activeMute[0].expiresAt;
		return json(
			{
				error: `You are muted until ${expiresAt?.toLocaleString()}`
			},
			{ status: 403 }
		);
	}

	// Rate limiting - check recent messages (max 5 messages per minute)
	const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
	const recentMessages = await db
		.select()
		.from(chatMessages)
		.where(and(eq(chatMessages.userId, locals.user.id), gte(chatMessages.createdAt, oneMinuteAgo)));

	if (recentMessages.length >= 5) {
		return json(
			{ error: 'Too many messages. Please wait before sending another.' },
			{ status: 429 }
		);
	}

	// Enhanced moderation - check for banned words
	const bannedWordsList = await db.select().from(bannedWords);
	const lowerContent = content.toLowerCase();
	const hasBannedWord = bannedWordsList.some((bw) => lowerContent.includes(bw.word.toLowerCase()));
	if (hasBannedWord) {
		return json({ error: 'Message contains inappropriate content' }, { status: 400 });
	}

	// Additional content checks
	if (content.length > 500) {
		return json({ error: 'Message too long (max 500 characters)' }, { status: 400 });
	}

	// Check for excessive caps (more than 70% uppercase)
	const uppercaseCount = (content.match(/[A-Z]/g) || []).length;
	const totalLetters = (content.match(/[a-zA-Z]/g) || []).length;
	if (totalLetters > 10 && uppercaseCount / totalLetters > 0.7) {
		return json({ error: 'Please avoid excessive use of capital letters' }, { status: 400 });
	}

	// Check for spam patterns (repeating characters)
	if (/(.)\1{4,}/.test(content)) {
		return json({ error: 'Message contains spam patterns' }, { status: 400 });
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
