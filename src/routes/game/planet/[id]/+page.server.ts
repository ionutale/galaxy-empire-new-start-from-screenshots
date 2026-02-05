import { db } from '$lib/server/db';
import { planetResources, planets, buildingQueue } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { BuildingService } from '$lib/server/building-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const planetId = parseInt(params.id);

	// Verify planet ownership
	const planet = await db.select().from(planets).where(eq(planets.id, planetId)).limit(1);

	if (!planet.length || planet[0].userId !== user.id) {
		throw error(404, 'Planet not found');
	}

	// Get buildings using building service
	const buildings = await BuildingService.getPlanetBuildings(planetId);

	// Get building queue
	const queue = await db
		.select({
			id: buildingQueue.id,
			buildingTypeId: buildingQueue.buildingTypeId,
			targetLevel: buildingQueue.targetLevel,
			completionAt: buildingQueue.completionAt,
			resourcesReserved: buildingQueue.resourcesReserved
		})
		.from(buildingQueue)
		.where(eq(buildingQueue.planetId, planetId))
		.orderBy(buildingQueue.completionAt);

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
