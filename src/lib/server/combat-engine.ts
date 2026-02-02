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

export function simulateCombat(
	attackerFleet: Record<string, number>,
	defenderFleet: Record<string, number>,
	defenderDefenses: Record<string, number>
): CombatResult {
	// Convert to combat units
	let attackerUnits = Object.entries(attackerFleet).map(([type, count]) => {
		const stats = SHIPS[type as keyof typeof SHIPS];
		return { type, count, attack: stats.attack, defense: stats.defense, shield: 0, isShip: true }; // Shield not in SHIPS yet?
	});

	let defenderUnits = [
		...Object.entries(defenderFleet).map(([type, count]) => {
			const stats = SHIPS[type as keyof typeof SHIPS];
			return { type, count, attack: stats.attack, defense: stats.defense, shield: 0, isShip: true };
		}),
		...Object.entries(defenderDefenses).map(([type, count]) => {
			const stats = DEFENSES[type as keyof typeof DEFENSES];
			return {
				type,
				count,
				attack: stats.attack,
				defense: stats.defense,
				shield: stats.shield,
				isShip: false
			};
		})
	];

	// Simplified Combat: One round, total power vs total power
	// In a real game, this would be round-based with individual unit targeting.

	const attackerPower = attackerUnits.reduce((sum, u) => sum + u.attack * u.count, 0);
	const defenderPower = defenderUnits.reduce(
		(sum, u) => sum + u.attack * u.count + (u.shield * u.count) / 10,
		0
	); // Shield helps a bit

	const attackerHealth = attackerUnits.reduce((sum, u) => sum + u.defense * u.count, 0);
	const defenderHealth = defenderUnits.reduce((sum, u) => sum + u.defense * u.count, 0);

	let winner: 'attacker' | 'defender' | 'draw' = 'draw';
	let attackerLossPct = 0;
	let defenderLossPct = 0;

	if (attackerPower > defenderHealth && defenderPower < attackerHealth) {
		winner = 'attacker';
		attackerLossPct = Math.min(0.5, defenderPower / attackerHealth); // Lose up to 50%
		defenderLossPct = 1.0; // Total destruction
	} else if (defenderPower > attackerHealth && attackerPower < defenderHealth) {
		winner = 'defender';
		defenderLossPct = Math.min(0.5, attackerPower / defenderHealth);
		attackerLossPct = 1.0;
	} else {
		// Draw or mutual destruction
		winner = 'draw';
		attackerLossPct = 0.8;
		defenderLossPct = 0.8;
	}

	// Calculate losses
	const attackerLosses: Record<string, number> = {};
	for (const u of attackerUnits) {
		const lost = Math.floor(u.count * attackerLossPct);
		if (lost > 0) attackerLosses[u.type] = lost;
	}

	const defenderLosses: Record<string, number> = {};
	for (const u of defenderUnits) {
		const lost = Math.floor(u.count * defenderLossPct);
		if (lost > 0) defenderLosses[u.type] = lost;
	}

	return {
		winner,
		attackerLosses,
		defenderLosses,
		rounds: 1
	};
}
