import { db } from '$lib/server/db';
import { planetBuildings, planetResources, planets, buildingQueue } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { BuildingService } from '$lib/server/building-service';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const planetId = parseInt(params.id);

	// Verify planet ownership
	const planet = await db
		.select()
		.from(planets)
		.where(eq(planets.id, planetId))
		.limit(1);

	if (!planet.length || planet[0].userId !== user.id) {
		throw error(404, 'Planet not found');
	}

	// Get buildings using building service
	const buildings = await BuildingService.getPlanetBuildings(planetId);

	// Get building queue
	const queue = await db
		.select({
			id: buildingQueue.id,
			buildingTypeId: buildingQueue.building_type_id,
			targetLevel: buildingQueue.target_level,
			completionAt: buildingQueue.completion_at,
			resourcesReserved: buildingQueue.resources_reserved
		})
		.from(buildingQueue)
		.where(eq(buildingQueue.planet_id, planetId))
		.orderBy(buildingQueue.completion_at);

	// Get current resources
	const resources = await db
		.select({
			metal: planetResources.metal,
			crystal: planetResources.crystal,
			gas: planetResources.gas,
			energy: planetResources.energy
		})
		.from(planetResources)
		.where(eq(planetResources.planetId, planetId))
		.limit(1);

	return {
		planet: planet[0],
		buildings,
		queue,
		resources: resources[0] || { metal: 0, crystal: 0, gas: 0, energy: 0 }
	};
};

export const actions: Actions = {
	upgrade: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const buildingTypeId = Number(data.get('building_type_id'));
		const planetId = Number(params.id);

		if (!buildingTypeId || !planetId) return fail(400);

		try {
			const result = await BuildingService.startBuildingConstruction(planetId, buildingTypeId, locals.user.id);

			if (!result.success) {
				return fail(400, { error: result.error });
			}

			return { success: true };
		} catch (error) {
			console.error('Building upgrade error:', error);
			return fail(500, { error: 'Failed to start building upgrade' });
		}
	},

	cancel: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const queueId = Number(data.get('queue_id'));
		const planetId = Number(params.id);

		if (!queueId || !planetId) return fail(400);

		try {
			// Get queue item and verify ownership
			const queueItem = await db
				.select({
					resourcesReserved: buildingQueue.resources_reserved
				})
				.from(buildingQueue)
				.where(eq(buildingQueue.id, queueId))
				.limit(1);

			if (!queueItem.length) return fail(404, { error: 'Queue item not found' });

			// Refund resources
			const reservedResources = queueItem[0].resourcesReserved as any;
			await db
				.update(planetResources)
				.set({
					metal: sql`${planetResources.metal} + ${reservedResources.metal || 0}`,
					crystal: sql`${planetResources.crystal} + ${reservedResources.crystal || 0}`,
					gas: sql`${planetResources.gas} + ${reservedResources.gas || 0}`
				})
				.where(eq(planetResources.planetId, planetId));

			// Remove from queue
			await db
				.delete(buildingQueue)
				.where(eq(buildingQueue.id, queueId));

			// Reset building upgrade status
			await db
				.update(planetBuildings)
				.set({
					is_upgrading: false,
					upgrade_completion_at: null,
					upgrade_started_at: null
				})
				.where(eq(planetBuildings.planet_id, planetId));

			return { success: true };
		} catch (error) {
			console.error('Queue cancel error:', error);
			return fail(500, { error: 'Failed to cancel building' });
		}
	}
};