import { db } from '$lib/server/db';
import { planets, planetResources, planetBuildings, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	if (!user) {
		throw new Error('Unauthorized');
	}

	// Get all user's planets with their data
	const userPlanets = await db
		.select({
			id: planets.id,
			name: planets.name,
			galaxyId: planets.galaxyId,
			systemId: planets.systemId,
			planetNumber: planets.planetNumber,
			planetType: planets.planetType,
			fieldsMax: planets.fieldsMax,
			metal: planetResources.metal,
			crystal: planetResources.crystal,
			gas: planetResources.gas,
			energy: planetResources.energy,
			metalMine: planetBuildings.metal_mine,
			crystalMine: planetBuildings.crystal_mine,
			gasExtractor: planetBuildings.gas_extractor,
			solarPlant: planetBuildings.solar_plant,
			fusionReactor: planetBuildings.fusion_reactor
		})
		.from(planets)
		.leftJoin(planetResources, eq(planets.id, planetResources.planetId))
		.leftJoin(planetBuildings, eq(planets.id, planetBuildings.planetId))
		.where(eq(planets.userId, user.id))
		.orderBy(planets.galaxyId, planets.systemId, planets.planetNumber);

	return {
		planets: userPlanets
	};
};