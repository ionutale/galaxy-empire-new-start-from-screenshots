import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { researchQueue, userResearchLevels } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { queueId } = await request.json();

		if (!queueId) {
			return json({ error: 'Missing queue ID' }, { status: 400 });
		}

		// Get queue item and verify ownership
		const queueItem = await db
			.select({
				researchTypeId: researchQueue.researchTypeId,
				level: researchQueue.level
			})
			.from(researchQueue)
			.where(eq(researchQueue.id, queueId))
			.limit(1);

		if (!queueItem.length) {
			return json({ error: 'Queue item not found' }, { status: 404 });
		}

		// Reset research status
		await db
			.update(userResearchLevels)
			.set({
				isResearching: false,
				researchCompletionAt: null
			})
			.where(
				and(
					eq(userResearchLevels.userId, locals.user.id),
					eq(userResearchLevels.researchTypeId, queueItem[0].researchTypeId as number)
				)
			);

		// Remove from queue
		await db.delete(researchQueue).where(eq(researchQueue.id, queueId));

		return json({ success: true });
	} catch (error) {
		console.error('Research cancel error:', error);
		return json({ error: 'Failed to cancel research' }, { status: 500 });
	}
};
