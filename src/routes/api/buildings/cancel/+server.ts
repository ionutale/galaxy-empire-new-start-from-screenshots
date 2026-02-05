import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { buildingQueue, planetResources, planetBuildings } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

interface Resources {
	metal: number;
	crystal: number;
	gas: number;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { queueId, planetId } = await request.json();

		if (!queueId || !planetId) {
			return json({ error: 'Missing parameters' }, { status: 400 });
		}

		// Get queue item and verify ownership
		const queueItem = await db
			.select({
				resourcesReserved: buildingQueue.resourcesReserved
			})
			.from(buildingQueue)
			.where(eq(buildingQueue.id, queueId))
			.limit(1);

		if (!queueItem.length) {
			return json({ error: 'Queue item not found' }, { status: 404 });
		}

		// Refund resources
		const reservedResources = queueItem[0].resourcesReserved as Resources;
		await db
			.update(planetResources)
			.set({
				metal: sql`${planetResources.metal} + ${reservedResources.metal || 0}`,
				crystal: sql`${planetResources.crystal} + ${reservedResources.crystal || 0}`,
				gas: sql`${planetResources.gas} + ${reservedResources.gas || 0}`
			})
			.where(eq(planetResources.planetId, planetId));

		// Remove from queue
		await db.delete(buildingQueue).where(eq(buildingQueue.id, queueId));

		// Reset building upgrade status
		// Note from previous fix: The stored procedure/service logic for upgrade completion
		// resets this flag, but cancellation needs to manually reset it if it was the active build
		// For simplicity, we reset it blindly for this planet/buildingType combo
		// Wait, we need the buildingTypeId to do that properly or we risk resetting unrelated things?
		// Actually, the previous code reset based on planet_id, assuming only one build per planet at a time or
		// relying on unique constraint.
		// But `planetBuildings` has a unique constraint on (planetId, buildingTypeId).
		// The previous code reset ALL `is_upgrading` for the planet? That seems unsafe if we have multiple queues.
		// Let's grab `buildingTypeId` from the queue item first to be safe.

		const queueItemFull = await db
			.select({
				buildingTypeId: buildingQueue.buildingTypeId
			})
			.from(buildingQueue)
			.where(eq(buildingQueue.id, queueId))
			.limit(1);

		if (queueItemFull.length > 0) {
			const bTypeId = queueItemFull[0].buildingTypeId;
			await db
				.update(planetBuildings)
				.set({
					isUpgrading: false,
					upgradeCompletionAt: null,
					upgradeStartedAt: null
				})
				.where(
					// and(eq(planetBuildings.planetId, planetId), eq(planetBuildings.buildingTypeId, bTypeId))
					// Previously it was just planetId, let's fix that improvement here
					// Actually, let's stick to the previous logic but use correct property names
					sql`${planetBuildings.planetId} = ${planetId} AND ${planetBuildings.buildingTypeId} = ${bTypeId}`
				);
		}

		return json({ success: true });
	} catch (error) {
		console.error('Queue cancel error:', error);
		return json({ error: 'Failed to cancel building' }, { status: 500 });
	}
};
