import { json } from '@sveltejs/kit';
import { db, messages } from '$lib/server/db';
import { desc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const limit = Number(url.searchParams.get('limit')) || 25;
	const offset = Number(url.searchParams.get('offset')) || 0;

	const res = await db
		.select()
		.from(messages)
		.where(eq(messages.userId, locals.user.id))
		.orderBy(desc(messages.createdAt))
		.limit(limit)
		.offset(offset);

	return json({ messages: res });
};
