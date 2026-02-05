import { db } from '$lib/server/db';
import { planets } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, parent }) => {
	const { currentPlanet } = await parent();

	let galaxy = Number(url.searchParams.get('galaxy'));

	if (!galaxy) {
		if (currentPlanet) {
			galaxy = currentPlanet.galaxyId;
		} else {
			galaxy = 1;
		}
	}

	// Get statistics for each system in the galaxy
	const systemStats = await db
		.select({
			systemId: planets.systemId,
			planetCount: sql<number>`count(*)`,
			playerCount: sql<number>`count(distinct ${planets.userId})`
		})
		.from(planets)
		.where(eq(planets.galaxyId, galaxy))
		.groupBy(planets.systemId)
		.orderBy(planets.systemId);

	// Create array of 499 systems
	const systems = Array.from({ length: 499 }, (_, i) => {
		const systemNum = i + 1;
		const stats = systemStats.find((s) => s.systemId === systemNum);

		return {
			systemId: systemNum,
			planetCount: stats?.planetCount || 0,
			playerCount: stats?.playerCount || 0,
			hasActivity: (stats?.planetCount || 0) > 0
		};
	});

	return {
		galaxy,
		systems
	};
};
