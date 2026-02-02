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
	// Validation
	let totalShips = 0;
	let totalCapacity = 0;

	for (const [type, count] of Object.entries(ships)) {
		if (count > 0) {
			totalShips += count;
			totalCapacity += (SHIPS[type]?.capacity || 0) * count;
		}
	}

	if (totalShips === 0) {
		throw new Error('No ships selected');
	}

	const totalResources = resources.metal + resources.crystal + resources.gas;
	if (totalResources > totalCapacity) {
		throw new Error(
			`Not enough cargo capacity. Capacity: ${totalCapacity}, Resources: ${totalResources}`
		);
	}

	return await db.transaction(async (tx) => {
		// Check max fleets limit (Computer Technology)
		const researchRes = await tx
			.select({ computerTech: userResearch.computerTech })
			.from(userResearch)
			.where(eq(userResearch.userId, userId));

		const computerTechLevel = researchRes[0]?.computerTech || 0;
		const maxFleets = 1 + computerTechLevel;

		const activeFleetsRes = await tx
			.select({ count: sql<number>`count(*)` })
			.from(fleets)
			.where(and(eq(fleets.userId, userId), inArray(fleets.status, ['active', 'returning'])));

		const activeFleets = Number(activeFleetsRes[0].count);

		if (activeFleets >= maxFleets) {
			throw new Error(
				`Max fleet limit reached (${maxFleets}). Upgrade Computer Technology to increase limit.`
			);
		}

		if (mission === 'expedition') {
			const activeExpeditions = await tx
				.select({ count: sql<number>`count(*)` })
				.from(fleets)
				.where(
					and(
						eq(fleets.originPlanetId, planetId),
						eq(fleets.mission, 'expedition'),
						inArray(fleets.status, ['active', 'returning'])
					)
				);

			if (Number(activeExpeditions[0].count) >= 18) {
				throw new Error('Max expedition limit reached (18)');
			}
		}

		// Check if user has enough ships
		const shipCheck = await tx
			.select()
			.from(planetShips)
			.where(eq(planetShips.planetId, planetId))
			.for('update');

		if (shipCheck.length === 0) throw new Error('Planet ships not found');
		const availableShips = shipCheck[0];

		for (const [type, count] of Object.entries(ships)) {
			const shipKey = type.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
			const available = (availableShips as any)[shipKey];

			if (typeof available !== 'number' || available < count) {
				throw new Error(`Not enough ${type}`);
			}
		}

		// Check if user has enough resources
		const resourceCheck = await tx
			.select({
				metal: planetResources.metal,
				crystal: planetResources.crystal,
				gas: planetResources.gas
			})
			.from(planetResources)
			.where(eq(planetResources.planetId, planetId))
			.for('update');

		if (resourceCheck.length === 0) throw new Error('Planet resources not found');
		const availableResources = resourceCheck[0];

		if ((availableResources.metal || 0) < resources.metal) throw new Error('Not enough Metal');
		if ((availableResources.crystal || 0) < resources.crystal)
			throw new Error('Not enough Crystal');
		if ((availableResources.gas || 0) < resources.gas) throw new Error('Not enough Gas');

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

		// Deduct resources
		await tx
			.update(planetResources)
			.set({
				metal: sql`${planetResources.metal} - ${resources.metal}`,
				crystal: sql`${planetResources.crystal} - ${resources.crystal}`,
				gas: sql`${planetResources.gas} - ${resources.gas}`
			})
			.where(eq(planetResources.planetId, planetId));

		// Get origin planet coordinates
		const originRes = await tx
			.select({
				galaxyId: planets.galaxyId,
				systemId: planets.systemId,
				planetNumber: planets.planetNumber
			})
			.from(planets)
			.where(eq(planets.id, planetId));

		if (originRes.length === 0) {
			throw new Error('Origin planet not found');
		}

		const origin = originRes[0];

		// Calculate movement info
		const movementInfo = getFleetMovementInfo(
			origin.galaxyId,
			origin.systemId,
			origin.planetNumber,
			galaxy,
			system,
			planet,
			ships,
			mission
		);

		if (!movementInfo.canReach) {
			throw new Error(movementInfo.reason || 'Cannot reach destination');
		}

		// Calculate fuel consumption
		const fuelNeeded = calculateFuelConsumption(movementInfo.distance, ships, mission);

		// Check fuel availability (gas is used as fuel)
		if ((availableResources.gas || 0) < fuelNeeded) {
			throw new Error(`Not enough fuel. Required: ${fuelNeeded}, Available: ${availableResources.gas || 0}`);
		}

		// Deduct fuel
		await tx
			.update(planetResources)
			.set({
				gas: sql`${planetResources.gas} - ${fuelNeeded}`
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
