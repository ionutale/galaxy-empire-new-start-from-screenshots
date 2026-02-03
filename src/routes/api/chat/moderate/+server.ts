import { json } from '@sveltejs/kit';
import { db, chatMessages, users, chatModeration, userMutes, bannedWords } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// DELETE /api/chat/moderate - Delete a message (moderator only)
export const DELETE: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	// Check if user is moderator or admin
	if (locals.user.role !== 'moderator' && locals.user.role !== 'admin') {
		return json({ error: 'Insufficient permissions' }, { status: 403 });
	}

	const messageId = parseInt(url.searchParams.get('messageId') || '0');
	const reason = url.searchParams.get('reason') || 'Violation of chat rules';

	if (!messageId) {
		return json({ error: 'Message ID required' }, { status: 400 });
	}

	try {
		// Check if message exists
		const message = await db
			.select()
			.from(chatMessages)
			.where(eq(chatMessages.id, messageId))
			.limit(1);

		if (message.length === 0) {
			return json({ error: 'Message not found' }, { status: 404 });
		}

		// Log moderation action
		await db.insert(chatModeration).values({
			messageId,
			moderatorId: locals.user.id,
			action: 'delete',
			reason
		});

		// Delete the message
		await db.delete(chatMessages).where(eq(chatMessages.id, messageId));

		return json({ success: true });
	} catch (e) {
		console.error(e);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

// POST /api/chat/moderate - Mute or ban user (moderator only)
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	if (locals.user.role !== 'moderator' && locals.user.role !== 'admin') {
		return json({ error: 'Insufficient permissions' }, { status: 403 });
	}

	const { action, userId, duration, reason } = await request.json();

	if (!action || !userId || !reason) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	if (action !== 'mute' && action !== 'ban') {
		return json({ error: 'Invalid action' }, { status: 400 });
	}

	try {
		const expiresAt = duration ? new Date(Date.now() + duration * 60 * 1000) : null; // duration in minutes

		if (action === 'mute') {
			await db.insert(userMutes).values({
				userId,
				mutedBy: locals.user.id,
				reason,
				expiresAt
			});
		} else if (action === 'ban') {
			// For ban, we could add a banned_users table, but for now just mute indefinitely
			await db.insert(userMutes).values({
				userId,
				mutedBy: locals.user.id,
				reason,
				expiresAt: null // Permanent ban
			});
		}

		return json({ success: true });
	} catch (e) {
		console.error(e);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

// PUT /api/chat/banned-words - Add banned word (admin only)
export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	if (locals.user.role !== 'admin') {
		return json({ error: 'Admin permissions required' }, { status: 403 });
	}

	const { word, severity = 'moderate' } = await request.json();

	if (!word || word.trim().length === 0) {
		return json({ error: 'Word required' }, { status: 400 });
	}

	try {
		await db.insert(bannedWords).values({
			word: word.trim().toLowerCase(),
			severity
		});

		return json({ success: true });
	} catch (e) {
		if (e.code === '23505') { // Unique constraint violation
			return json({ error: 'Word already banned' }, { status: 400 });
		}
		console.error(e);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};