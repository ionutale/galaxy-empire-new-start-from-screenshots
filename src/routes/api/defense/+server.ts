import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	planetBuildings,
	buildingTypes,
	planetDefenses,
	planetResources
} from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

type DefenseColumn = keyof typeof planetDefenses.$inferSelect;
import { DEFENSES } from '$lib/game-config';
import { updatePlanetResources } from '$lib/server/game';
import { updateUserPoints } from '$lib/server/points-calculator';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const data = await request.json();
	const defenseType = data.type as string;
	const amount = Number(data.amount || 1);
	const planetId = Number(data.planet_id);

	if (!defenseType || !planetId || amount < 1)
		return json({ error: 'Invalid parameters' }, { status: 400 });

	const defenseConfig = DEFENSES[defenseType as keyof typeof DEFENSES];
	if (!defenseConfig) return json({ error: 'Invalid defense type' }, { status: 400 });

	// Update resources first
	await updatePlanetResources(planetId);

	try {
		await db.transaction(async (tx) => {
			// Check Shipyard Level
			const buildRes = await tx
				.select({ level: planetBuildings.level })
				.from(planetBuildings)
				.innerJoin(buildingTypes, eq(planetBuildings.buildingTypeId, buildingTypes.id))
				.where(and(eq(planetBuildings.planetId, planetId), eq(buildingTypes.name, 'Shipyard')));

			if ((buildRes[0]?.level || 0) < 1) {
				throw new Error('Shipyard required');
			}

			// Check resources
			const resCheck = await tx
				.select({
					metal: planetResources.metal,
					crystal: planetResources.crystal,
					gas: planetResources.gas
				})
				.from(planetResources)
				.where(eq(planetResources.planetId, planetId))
				.for('update');

			const resources = resCheck[0];

			const totalCost = {
				metal: defenseConfig.cost.metal * amount,
				crystal: defenseConfig.cost.crystal * amount,
				gas: (defenseConfig.cost.gas || 0) * amount
			};

			if (
				(resources.metal || 0) < totalCost.metal ||
				(resources.crystal || 0) < totalCost.crystal ||
				(resources.gas || 0) < totalCost.gas
			) {
				throw new Error('Not enough resources');
			}

			// Check max limit (for shields)
			const defenseKey = defenseType.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
			const defenseColumn = planetDefenses[defenseKey as DefenseColumn];

			if (!defenseColumn) throw new Error('Invalid defense column');

			if (defenseConfig.max) {
				const currentDefRes = await tx
					.select({ level: defenseColumn })
					.from(planetDefenses)
					.where(eq(planetDefenses.planetId, planetId));

				const currentAmount = currentDefRes[0]?.level || 0;
				if (currentAmount + amount > defenseConfig.max) {
					throw new Error(`Max limit reached for ${defenseConfig.name}`);
				}
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

			// Build defense
			await tx
				.update(planetDefenses)
				.set({ [defenseKey]: sql`${defenseColumn} + ${amount}` })
				.where(eq(planetDefenses.planetId, planetId));
		});

		await updateUserPoints(locals.user.id);
		return json({ success: true });
	} catch (e: unknown) {
		return json({ error: (e as Error).message }, { status: 400 });
	}
};
