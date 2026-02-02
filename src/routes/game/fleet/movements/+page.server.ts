import { db } from '$lib/server/db';
import { fleets, planets } from '$lib/server/db/schema';
import { eq, and, notInArray, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentPlanet, user } = await parent();

	if (!currentPlanet) {
		return { fleets: [] };
	}

	// Fetch active fleets (own fleets)
	const fleetsRes = await db
		.select({
			id: fleets.id,
			userId: fleets.userId,
			originPlanetId: fleets.originPlanetId,
			targetGalaxy: fleets.targetGalaxy,
			targetSystem: fleets.targetSystem,
			targetPlanet: fleets.targetPlanet,
			mission: fleets.mission,
			ships: fleets.ships,
			resources: fleets.resources,
			departureTime: fleets.departureTime,
			arrivalTime: fleets.arrivalTime,
			returnTime: fleets.returnTime,
			status: fleets.status,
			originGalaxy: planets.galaxyId,
			originSystem: planets.systemId,
			originPlanet: planets.planetNumber
		})
		.from(fleets)
		.innerJoin(planets, eq(fleets.originPlanetId, planets.id))
		.where(and(eq(fleets.userId, user.id), notInArray(fleets.status, ['completed', 'destroyed'])))
		.orderBy(asc(fleets.arrivalTime))
		.limit(25);

	return {
		fleets: fleetsRes
	};
};
