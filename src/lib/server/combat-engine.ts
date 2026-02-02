import { db } from './db';
import { sql } from 'drizzle-orm';
import { SHIPS, DEFENSES } from '$lib/game-config';

interface CombatUnit {
	type: string;
	count: number;
	attack: number;
	defense: number;
	shield: number;
	isShip: boolean;
}

interface CombatResult {
	winner: 'attacker' | 'defender' | 'draw';
	attackerLosses: Record<string, number>;
	defenderLosses: Record<string, number>;
	rounds: number;
}

export async function simulateCombat(
	attackerFleet: Record<string, number>,
	defenderFleet: Record<string, number>,
	defenderDefenses: Record<string, number>
): Promise<CombatResult> {
	// Call stored procedure
	const result = await db.execute(sql`
		SELECT simulate_combat(${JSON.stringify(attackerFleet)}::jsonb, ${JSON.stringify(defenderFleet)}::jsonb, ${JSON.stringify(defenderDefenses)}::jsonb) as combat_result
	`);

	const combatData = result.rows[0].combat_result as any;

	return {
		winner: combatData.winner,
		attackerLosses: combatData.attackerLosses || {},
		defenderLosses: combatData.defenderLosses || {},
		rounds: combatData.rounds || 1
	};
}
