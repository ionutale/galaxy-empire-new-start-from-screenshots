import { db } from '$lib/server/db';
import { planetShips, planetBuildings, planetResources } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { SHIPS } from '$lib/game-config';
import { updatePlanetResources } from '$lib/server/game';
import { updateUserPoints } from '$lib/server/points-calculator';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentPlanet } = await parent();

	if (!currentPlanet) {
		return { ships: null };
	}

	const shipsRes = await db
		.select()
		.from(planetShips)
		.where(eq(planetShips.planetId, currentPlanet.id));

	const buildRes = await db
		.select({ shipyard: planetBuildings.shipyard })
		.from(planetBuildings)
		.where(eq(planetBuildings.planetId, currentPlanet.id));

	const shipyardLevel = buildRes[0]?.shipyard || 0;

	return {
		ships: shipsRes[0],
		shipyardLevel
	};
};

export const actions = {
	build: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const shipType = data.get('type') as string;
		const amount = Number(data.get('amount') || 1);
		const planetId = Number(data.get('planet_id'));

		if (!shipType || !planetId || amount < 1) return fail(400);

		const shipConfig = SHIPS[shipType as keyof typeof SHIPS];
		if (!shipConfig) return fail(400, { error: 'Invalid ship type' });

		// Update resources first
		await updatePlanetResources(planetId);

		try {
			await db.transaction(async (tx) => {
				// Check Shipyard Level
				const buildRes = await tx
					.select({ shipyard: planetBuildings.shipyard })
					.from(planetBuildings)
					.where(eq(planetBuildings.planetId, planetId));

				if ((buildRes[0]?.shipyard || 0) < 1) {
					throw new Error('Shipyard required');
				}

				// Check resources with lock
				const resCheck = await tx
					.select({
						metal: planetResources.metal,
						crystal: planetResources.crystal,
						gas: planetResources.gas
					})
					.from(planetResources)
					.where(eq(planetResources.planetId, planetId))
					.for('update');

				if (resCheck.length === 0) throw new Error('Planet resources not found');
				const resources = resCheck[0];

				const totalCost = {
					metal: shipConfig.cost.metal * amount,
					crystal: shipConfig.cost.crystal * amount,
					gas: (shipConfig.cost.gas || 0) * amount
				};

				if (
					(resources.metal || 0) < totalCost.metal ||
					(resources.crystal || 0) < totalCost.crystal ||
					(resources.gas || 0) < totalCost.gas
				) {
					throw new Error('Not enough resources');
				}

				// Deduct resources
				await tx
					.update(planetResources)
					.set({
						metal: sql`${planetResources.metal} - ${totalCost.metal}`,
						crystal: sql`${planetResources.crystal} - ${totalCost.crystal}`,
						gas: sql`${planetResources.gas} - ${totalCost.gas}`
					})
					.where(eq(planetResources.planetId, planetId));

				// Ensure planet_ships row exists
				await tx
					.insert(planetShips)
					.values({ planetId })
					.onConflictDoNothing({ target: planetShips.planetId });

				// Add ships
				// Convert snake_case shipType to camelCase for Drizzle column
				const shipKey = shipType.replace(/_([a-z])/g, (g) =>
					g[1].toUpperCase()
				) as keyof typeof planetShips;
				const shipColumn = planetShips[shipKey];

				if (!shipColumn) throw new Error('Invalid ship column mapping');

				await tx
					.update(planetShips)
					.set({ [shipKey]: sql`${shipColumn} + ${amount}` })
					.where(eq(planetShips.planetId, planetId));
			});

			// Update points
			await updateUserPoints(locals.user.id);
			return { success: true };
		} catch (e: any) {
			if (e.message === 'Shipyard required' || e.message === 'Not enough resources') {
				return fail(400, { error: e.message });
			}
			console.error(e);
			return fail(500, { error: 'Internal server error' });
		}
	}
} satisfies Actions;
