import { db } from '$lib/server/db';
import { planetShips, fleets } from '$lib/server/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { getFleetTemplates } from '$lib/server/fleet-templates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, depends }) => {
	depends('app:game-data');

	const { currentPlanet, user } = await parent();

	if (!currentPlanet) {
		return { ships: null, fleets: [], activeFleetsCount: 0, templates: [] };
	}

	// Fetch ships
	const shipsRes = await db
		.select()
		.from(planetShips)
		.where(eq(planetShips.planetId, currentPlanet.id));

	// Fetch active fleets count
	const fleetsCountRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(fleets)
		.where(
			and(
				eq(fleets.userId, user.id),
				or(eq(fleets.status, 'active'), eq(fleets.status, 'returning'))
			)
		);

	const activeFleetsCount = Number(fleetsCountRes[0]?.count || 0);

	// Fetch templates
	const templates = await getFleetTemplates(user.id);

	return {
		ships: shipsRes[0],
		activeFleetsCount,
		templates
	};
};
