import { json } from '@sveltejs/kit';
import { db, chatMessages, users, alliances } from '$lib/server/db';
import { desc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const res = await db.select({
            id: chatMessages.id,
            content: chatMessages.content,
            createdAt: chatMessages.createdAt,
            username: users.username,
            allianceTag: alliances.tag
        })
        .from(chatMessages)
        .innerJoin(users, eq(chatMessages.userId, users.id))
        .leftJoin(alliances, eq(users.allianceId, alliances.id))
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

    const { content } = await request.json();
    if (!content || content.trim().length === 0) {
        return json({ error: 'Empty message' }, { status: 400 });
    }

    try {
        await db.insert(chatMessages).values({
            userId: locals.user.id,
            content: content.trim()
        });
        return json({ success: true });
    } catch (e) {
        console.error(e);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
