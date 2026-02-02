import { json } from '@sveltejs/kit';
import { db, privateMessages, users } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { toUsername, subject, content } = await request.json();

		if (!toUsername || !subject || !content) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		if (subject.length > 100) {
			return json({ error: 'Subject too long' }, { status: 400 });
		}

		if (content.length > 10000) {
			return json({ error: 'Message too long' }, { status: 400 });
		}

		// Find recipient
		const [recipient] = await db
			.select()
			.from(users)
			.where(eq(users.username, toUsername))
			.limit(1);

		if (!recipient) {
			return json({ error: 'Recipient not found' }, { status: 404 });
		}

		if (recipient.id === locals.user.id) {
			return json({ error: 'Cannot send message to yourself' }, { status: 400 });
		}

		// Insert message
		await db.insert(privateMessages).values({
			fromUserId: locals.user.id,
			toUserId: recipient.id,
			subject,
			content
		});

		return json({ success: true });
	} catch (error) {
		console.error('Send message error:', error);
		return json({ error: 'Failed to send message' }, { status: 500 });
	}
};