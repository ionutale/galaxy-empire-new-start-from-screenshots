import { db } from './db';
import { broodTargets, fleets, planetResources } from './db/schema';
import { eq, and, sql, lte } from 'drizzle-orm';
import { simulateCombat } from './combat-engine';

export interface BroodTarget {
	id: number;
	galaxy: number;
	system: number;
	planetSlot: number;
	level: number;
	rewards: any;
	lastRaidedAt: Date | null;
}

export interface RaidResult {
	success: boolean;
	loot?: any;
	combatReport?: any;
}

export class BroodService {
	// Get brood targets for a galaxy/system
	async getBroodTargets(galaxy: number, system: number): Promise<BroodTarget[]> {
		return await db
			.select()
			.from(broodTargets)
			.where(and(eq(broodTargets.galaxy, galaxy), eq(broodTargets.system, system)));
	}

	// Raid a brood target
	async raidBroodTarget(fleetId: number, targetId: number, userId: number): Promise<RaidResult> {
		// Get target
		const target = await db
			.select()
			.from(broodTargets)
			.where(eq(broodTargets.id, targetId))
			.limit(1);

		if (!target.length) {
			throw new Error('Brood target not found');
		}

		// TODO: Check if fleet is at the target location
		// For now, assume it's there

		// Generate NPC fleet based on level
		const npcFleet = this.generateNpcFleet(target[0].level);

		// Get player fleet
		const playerFleet = await db.select().from(fleets).where(eq(fleets.id, fleetId)).limit(1);

		if (!playerFleet.length) {
			throw new Error('Fleet not found');
		}

		// Simulate combat
		const combatResult = await simulateCombat(
			playerFleet[0].ships,
			npcFleet,
			{} // no defenses
		);

		// If player wins, give rewards
		let loot = null;
		if (combatResult.winner === 'attacker') {
			loot = target[0].rewards || { metal: 1000, crystal: 500 };
			// TODO: Add loot to player resources
		}

		// Update last raided
		await db
			.update(broodTargets)
			.set({ lastRaidedAt: new Date() })
			.where(eq(broodTargets.id, targetId));

		return {
			success: combatResult.winner === 'attacker',
			loot,
			combatReport: combatResult
		};
	}

	private generateNpcFleet(level: number) {
		// Simple NPC fleet generation
		return {
			lightFighter: level * 10,
			heavyFighter: level * 5,
			cruiser: level * 2
		};
	}
}

export const broodService = new BroodService();

export async function processBroodRaids() {
	// Find arrived brood raid fleets
	const arrivedFleets = await db
		.select()
		.from(fleets)
		.where(
			and(
				eq(fleets.mission, 'brood_raid'),
				eq(fleets.status, 'active'),
				lte(fleets.arrivalTime, new Date())
			)
		);

	for (const fleet of arrivedFleets) {
		try {
			// Find the brood target
			const targetId = await getBroodTargetId(
				fleet.targetGalaxy,
				fleet.targetSystem,
				fleet.targetPlanet
			);
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
		.where(
			and(
				eq(broodTargets.galaxy, galaxy),
				eq(broodTargets.system, system),
				eq(broodTargets.planetSlot, planetSlot)
			)
		)
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
