import { db } from './db';
import { broodTargets, fleets, planetResources } from './db/schema';
import { eq, and, sql, lte } from 'drizzle-orm';
import { simulateCombat } from './combat-engine';
import type { CombatResult } from './combat-engine';

export interface BroodRewards {
	metal?: number;
	crystal?: number;
	gas?: number;
}

export interface BroodTarget {
	id: number;
	galaxy: number;
	system: number;
	planetSlot: number;
	level: number;
	rewards: BroodRewards;
	lastRaidedAt: Date | null;
}

export interface RaidResult {
	success: boolean;
	loot?: BroodRewards | null;
	combatReport?: CombatResult;
}

export class BroodService {
	// Get brood targets for a galaxy/system
	async getBroodTargets(galaxy: number, system: number): Promise<BroodTarget[]> {
		const results = await db
			.select()
			.from(broodTargets)
			.where(and(eq(broodTargets.galaxy, galaxy), eq(broodTargets.system, system)));

		return results.map((r) => ({
			id: r.id,
			galaxy: r.galaxy,
			system: r.system,
			planetSlot: r.planetSlot,
			level: r.level || 1,
			lastRaidedAt: r.lastRaidedAt,
			rewards: (r.rewards as BroodRewards) || {}
		}));
	}

	// Raid a brood target
	async raidBroodTarget(fleetId: number, targetId: number, userId: number): Promise<RaidResult> {
		// Get target
		const targetRows = await db
			.select()
			.from(broodTargets)
			.where(eq(broodTargets.id, targetId))
			.limit(1);

		if (!targetRows.length) {
			throw new Error('Brood target not found');
		}

		const target = targetRows[0];

		// TODO: Check if fleet is at the target location
		// For now, assume it's there

		// Generate NPC fleet based on level
		const npcFleet = this.generateNpcFleet(target.level || 1);

		// Get player fleet
		const playerFleet = await db.select().from(fleets).where(eq(fleets.id, fleetId)).limit(1);

		if (!playerFleet.length) {
			throw new Error('Fleet not found');
		}

		// Simulate combat
		const combatResult = await simulateCombat(
			playerFleet[0].ships as Record<string, number>,
			npcFleet,
			{} // no defenses
		);

		// If player wins, give rewards
		let loot: BroodRewards | null = null;
		if (combatResult.winner === 'attacker') {
			loot = (target.rewards as BroodRewards) || { metal: 1000, crystal: 500 };
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
			const result = await broodService.raidBroodTarget(fleet.id, targetId);

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
