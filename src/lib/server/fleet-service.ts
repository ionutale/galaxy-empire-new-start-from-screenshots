import { db } from './db';
import { planetShips, fleets, planetResources, userResearch, planets } from './db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { SHIPS } from '$lib/game-config';
import { getFleetMovementInfo, calculateFuelConsumption } from './fleet-movement';

export async function dispatchFleet(
	userId: number,
	planetId: number,
	galaxy: number,
	system: number,
	planet: number,
	mission: string,
	ships: Record<string, number>,
	resources: { metal: number; crystal: number; gas: number }
) {
	// Validate fleet dispatch using stored procedure
	const validationResult = await db.execute(sql`
		SELECT validate_fleet_dispatch(
			${userId}::integer, ${planetId}::integer, ${JSON.stringify(ships)}::jsonb, ${mission}::text,
			${galaxy}::integer, ${system}::integer, ${planet}::integer, ${JSON.stringify(resources)}::jsonb
		) as validation
	`);

	const validation = validationResult.rows[0].validation as any;
	if (!validation.valid) {
		throw new Error(validation.error);
	}

	const movementInfo = validation.movement_info;
	const fuelNeeded = movementInfo.fuel_consumption;

	return await db.transaction(async (tx) => {
		// Deduct ships
		for (const [type, count] of Object.entries(ships)) {
			const shipKey = type.replace(/_([a-z])/g, (g) =>
				g[1].toUpperCase()
			) as keyof typeof planetShips;
			const shipColumn = planetShips[shipKey];

			await tx
				.update(planetShips)
				.set({ [shipKey]: sql`${shipColumn} - ${count}` })
				.where(eq(planetShips.planetId, planetId));
		}

		// Deduct resources and fuel
		await tx
			.update(planetResources)
			.set({
				metal: sql`${planetResources.metal} - ${resources.metal}`,
				crystal: sql`${planetResources.crystal} - ${resources.crystal}`,
				gas: sql`${planetResources.gas} - ${resources.gas + fuelNeeded}`
			})
			.where(eq(planetResources.planetId, planetId));

		// Calculate arrival time
		const arrivalTime = new Date(Date.now() + movementInfo.duration * 1000);

		// Create fleet
		await tx.insert(fleets).values({
			userId: userId,
			originPlanetId: planetId,
			targetGalaxy: galaxy,
			targetSystem: system,
			targetPlanet: planet,
			mission: mission,
			ships: ships,
			resources: resources,
			arrivalTime: arrivalTime,
			status: 'active'
		});
	});
}
