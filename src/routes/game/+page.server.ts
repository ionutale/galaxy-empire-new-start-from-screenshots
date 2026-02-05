import { db } from '$lib/server/db';
import { planetDefenses } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { BuildingService } from '$lib/server/building-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentPlanet } = await parent();

	if (!currentPlanet) {
		return { buildings: null, defenses: null, planetProduction: null, planetStorage: null };
	}

	// Get buildings using new building service
	const [buildings, planetProduction, planetStorage] = await Promise.all([
		BuildingService.getPlanetBuildings(currentPlanet.id),
		BuildingService.calculatePlanetProduction(currentPlanet.id),
		BuildingService.calculatePlanetStorage(currentPlanet.id)
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
		planetStorage
	};
};
