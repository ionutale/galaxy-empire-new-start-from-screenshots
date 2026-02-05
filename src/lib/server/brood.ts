import { db } from './db';
import { broodTargets, galactoniteItems, fusionRecipes, activeBoosts, fleets } from './db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { simulateCombat } from './combat-engine';
import { users } from './db/schema';

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
		const playerFleet = await db
			.select()
			.from(fleets)
			.where(eq(fleets.id, fleetId))
			.limit(1);

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