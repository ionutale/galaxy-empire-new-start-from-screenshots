import { db } from '$lib/server/db';
import { planetDefenses, buildingQueue, buildingTypes } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { BuildingService } from '$lib/server/building-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentPlanet } = await parent();

	if (!currentPlanet) {
		return { buildings: null, defenses: null, planetProduction: null, planetStorage: null, queue: [] };
	}

	// Get buildings, production, storage and queue
	const [buildings, planetProduction, planetStorage, queue] = await Promise.all([
		BuildingService.getPlanetBuildings(currentPlanet.id),
		BuildingService.calculatePlanetProduction(currentPlanet.id),
		BuildingService.calculatePlanetStorage(currentPlanet.id),
		db
			.select({
				id: buildingQueue.id,
				buildingTypeId: buildingQueue.buildingTypeId,
				name: buildingTypes.name,
				targetLevel: buildingQueue.targetLevel,
				startedAt: buildingQueue.startedAt,
				completionAt: buildingQueue.completionAt
			})
			.from(buildingQueue)
			.innerJoin(buildingTypes, eq(buildingQueue.buildingTypeId, buildingTypes.id))
			.where(eq(buildingQueue.planetId, currentPlanet.id))
			.orderBy(buildingQueue.completionAt)
	]);

	// Get legacy defense data for now
	const defensesRes = await db
		.select()
		.from(planetDefenses)
		.where(eq(planetDefenses.planetId, currentPlanet.id));

	return {
		buildings,
		defenses: defensesRes[0],
		planetProduction,
		planetStorage,
		queue
	};
};
