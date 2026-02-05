import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { BuildingService } from '$lib/server/building-service';
import { ResearchService } from '$lib/server/research-service';
import { ShipyardService } from '$lib/server/shipyard-service';
import { broodService } from '$lib/server/brood';
import { fleets, planetResources, broodTargets } from '$lib/server/db/schema';
import { eq, and, lte } from 'drizzle-orm';

export async function GET() {
	try {
		// Process completed building constructions
		await BuildingService.processCompletedBuildings();

		// Process completed research for all users
		const usersResult = await db.execute(sql`SELECT id FROM users`);
		const userRows = usersResult.rows as unknown as {id: number}[];
		for (const user of userRows) {
			await ResearchService.processCompletedResearch(user.id);
		}

		// Process completed ship construction
		await ShipyardService.processCompletedShipConstruction();

		// Call stored procedures for fleet processing and auto-exploration
		await db.execute(sql`CALL process_fleets()`);
		await db.execute(sql`CALL process_auto_explore()`);

		// Process brood raids
		await processBroodRaids();

		return json({ success: true });
	} catch (e) {
		console.error('Game tick error:', e);
		return json({ success: false, error: (e as Error).message }, { status: 500 });
	}
}

async function processBroodRaids() {
	// Find arrived brood raid fleets
	const arrivedFleets = await db
		.select()
		.from(fleets)
		.where(and(eq(fleets.mission, 'brood_raid'), eq(fleets.status, 'active'), lte(fleets.arrivalTime, new Date())));

	for (const fleet of arrivedFleets) {
		try {
			// Find the brood target
			const targetId = await getBroodTargetId(fleet.targetGalaxy, fleet.targetSystem, fleet.targetPlanet);
			if (!targetId) {
				// No target, perhaps return fleet
				await returnFleet(fleet.id);
				continue;
			}

			// Perform raid
			const result = await broodService.raidBroodTarget(fleet.id, targetId, fleet.userId);

			if (result.success && result.loot) {
				// Add loot to origin planet
				await db
					.update(planetResources)
					.set({
						metal: sql`${planetResources.metal} + ${result.loot.metal || 0}`,
						crystal: sql`${planetResources.crystal} + ${result.loot.crystal || 0}`,
						gas: sql`${planetResources.gas} + ${result.loot.gas || 0}`
					})
					.where(eq(planetResources.planetId, fleet.originPlanetId));
			}

			// Return fleet
			await returnFleet(fleet.id);

		} catch (e) {
			console.error('Brood raid error:', e);
			// Return fleet on error
			await returnFleet(fleet.id);
		}
	}
}

async function getBroodTargetId(galaxy: number, system: number, planetSlot: number) {
	const result = await db
		.select({ id: broodTargets.id })
		.from(broodTargets)
		.where(and(eq(broodTargets.galaxy, galaxy), eq(broodTargets.system, system), eq(broodTargets.planetSlot, planetSlot)))
		.limit(1);

	return result.length ? result[0].id : null;
}

async function returnFleet(fleetId: number) {
	// Set return time (assume instant for now)
	await db
		.update(fleets)
		.set({
			status: 'returning',
			returnTime: new Date()
		})
		.where(eq(fleets.id, fleetId));
}
