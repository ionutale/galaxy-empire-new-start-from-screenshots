import { db } from '$lib/server/db';
import { planetBuildings, planetDefenses, planetResources, planets } from '$lib/server/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { getBuildingCost, DEFENSES } from '$lib/game-config';
import { updatePlanetResources } from '$lib/server/game';
import { updateUserPoints } from '$lib/server/points-calculator';
import { BuildingService } from '$lib/server/building-service';
import type { PageServerLoad, Actions } from './$types';

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
	const defensesRes = await db.select().from(planetDefenses).where(eq(planetDefenses.planetId, currentPlanet.id));

	return {
		buildings,
		defenses: defensesRes[0],
		planetProduction,
		planetStorage
	};
};

export const actions = {
	upgrade: async ({ request, locals }) => {
		if (!locals.user || !locals.user.id) return fail(401);

		const data = await request.formData();
		const buildingTypeId = Number(data.get('building_type_id'));
		const planetId = Number(data.get('planet_id'));

		if (!buildingTypeId || !planetId) return fail(400);

		try {
			const result = await BuildingService.startBuildingConstruction(planetId, buildingTypeId, locals.user.id);

			if (!result.success) {
				return fail(400, { error: result.error });
			}

			return { success: true, completionTime: result.completionTime };
		} catch (error) {
			console.error('Building upgrade error:', error);
			return fail(500, { error: 'Failed to start building upgrade' });
		}
	},

	renamePlanet: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const planetId = Number(data.get('planet_id'));
		const newName = data.get('name') as string;

		if (!planetId || !newName) return fail(400);
		if (newName.length > 20) return fail(400, { error: 'Name too long' });

		// Verify ownership
		const planet = await db
			.select({ id: planets.id })
			.from(planets)
			.where(and(eq(planets.id, planetId), eq(planets.userId, locals.user.id)));

		if (planet.length === 0) return fail(403);

		await db.update(planets).set({ name: newName }).where(eq(planets.id, planetId));

		return { success: true };
	},

	build_defense: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const defenseType = data.get('type') as string;
		const amount = Number(data.get('amount') || 1);
		const planetId = Number(data.get('planet_id'));

		if (!defenseType || !planetId || amount < 1) return fail(400);

		const defenseConfig = DEFENSES[defenseType as keyof typeof DEFENSES];
		if (!defenseConfig) return fail(400, { error: 'Invalid defense type' });

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
				const defenseColumn = (planetDefenses as any)[defenseKey];

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

			// Update points
			await updateUserPoints(locals.user.id);
			return { success: true };
		} catch (e: any) {
			if (
				e.message.startsWith('Not enough') ||
				e.message.startsWith('Max limit') ||
				e.message === 'Shipyard required'
			) {
				return fail(400, { error: e.message });
			}
			console.error(e);
			return fail(500, { error: 'Internal server error' });
		}
	}
} satisfies Actions;
