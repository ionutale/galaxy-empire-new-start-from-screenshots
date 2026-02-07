import { db } from './db';
import { users, userCommanders, transactions } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';

export interface Commander {
	id: string;
	name: string;
	description: string;
	bonusType: 'mine_production' | 'fleet_speed' | 'research_speed' | 'energy_production';
	baseBonusValue: number; // Base percentage (e.g., 10 for 10%)
	levelBonusMultiplier: number; // Additional bonus per level (e.g., 2 for +2% per level)
	maxLevel: number;
	image: string;
}

export const COMMANDERS: Record<string, Commander> = {
	geologist: {
		id: 'geologist',
		name: 'Geologist',
		description: 'Increases mine production.',
		bonusType: 'mine_production',
		baseBonusValue: 10,
		levelBonusMultiplier: 2,
		maxLevel: 20,
		image: 'geologist.png'
	},
	admiral: {
		id: 'admiral',
		name: 'Admiral',
		description: 'Increases fleet speed.',
		bonusType: 'fleet_speed',
		baseBonusValue: 10,
		levelBonusMultiplier: 2,
		maxLevel: 20,
		image: 'admiral.png'
	},
	engineer: {
		id: 'engineer',
		name: 'Engineer',
		description: 'Increases energy production.',
		bonusType: 'energy_production',
		baseBonusValue: 10,
		levelBonusMultiplier: 2,
		maxLevel: 20,
		image: 'engineer.png'
	},
	technocrat: {
		id: 'technocrat',
		name: 'Technocrat',
		description: 'Decreases research time.',
		bonusType: 'research_speed',
		baseBonusValue: 10,
		levelBonusMultiplier: 2,
		maxLevel: 20,
		image: 'technocrat.png'
	},
	nebula_explorer: {
		id: 'nebula_explorer',
		name: 'Nebula Explorer',
		description: 'Automatically sends expeditions using a selected fleet template.',
		bonusType: 'fleet_speed', // Reusing type or add new one? The type is just for bonus calculation usually.
		baseBonusValue: 0,
		levelBonusMultiplier: 0,
		maxLevel: 1,
		image: 'explorer.png'
	}
};

export const DURATION_COSTS = {
	1: 100, // 1 day = 100 DM
	7: 500, // 7 days = 500 DM
	14: 900, // 14 days = 900 DM
	30: 1500 // 30 days = 1500 DM
};

export async function purchaseCommander(userId: number, commanderId: string, durationDays: number) {
	if (!COMMANDERS[commanderId]) throw new Error('Invalid commander');
	if (!DURATION_COSTS[durationDays as keyof typeof DURATION_COSTS])
		throw new Error('Invalid duration');

	const cost = DURATION_COSTS[durationDays as keyof typeof DURATION_COSTS];

	return await db.transaction(async (tx) => {
		// Check user DM
		const userRes = await tx
			.select({ darkMatter: users.darkMatter })
			.from(users)
			.where(eq(users.id, userId));

		if (userRes.length === 0) throw new Error('User not found');

		const currentDM = userRes[0].darkMatter || 0;
		if (currentDM < cost) throw new Error('Not enough Dark Matter');

		// Deduct DM
		await tx
			.update(users)
			.set({ darkMatter: currentDM - cost })
			.where(eq(users.id, userId));

		// Record transaction
		await tx.insert(transactions).values({
			userId,
			type: 'commander_purchase',
			itemId: commanderId,
			amount: cost,
			duration: durationDays,
			metadata: { commanderName: COMMANDERS[commanderId].name }
		});

		// Add/Extend Commander
		// Check if already active
		const existingRes = await tx
			.select({ expiresAt: userCommanders.expiresAt })
			.from(userCommanders)
			.where(and(eq(userCommanders.userId, userId), eq(userCommanders.commanderId, commanderId)));

		let newExpiresAt = new Date();
		newExpiresAt.setDate(newExpiresAt.getDate() + durationDays);

		if (existingRes.length > 0) {
			const currentExpiresAt = new Date(existingRes[0].expiresAt);
			if (currentExpiresAt > new Date()) {
				// Extend
				newExpiresAt = new Date(currentExpiresAt);
				newExpiresAt.setDate(newExpiresAt.getDate() + durationDays);
			}

			await tx
				.update(userCommanders)
				.set({ expiresAt: newExpiresAt })
				.where(and(eq(userCommanders.userId, userId), eq(userCommanders.commanderId, commanderId)));
		} else {
			// Insert
			await tx.insert(userCommanders).values({
				userId,
				commanderId,
				expiresAt: newExpiresAt
			});
		}

		return { success: true, expiresAt: newExpiresAt, remainingDM: currentDM - cost };
	});
}

export async function getActiveCommanders(userId: number) {
	const res = await db
		.select({
			commanderId: userCommanders.commanderId,
			expiresAt: userCommanders.expiresAt,
			level: userCommanders.level,
			experience: userCommanders.experience,
			totalExperience: userCommanders.totalExperience
		})
		.from(userCommanders)
		.where(and(eq(userCommanders.userId, userId), gt(userCommanders.expiresAt, new Date())));

	return res;
}

export async function getCommanderBonus(userId: number, bonusType: string): Promise<number> {
	const active = await getActiveCommanders(userId);
	let totalBonus = 0;

	for (const row of active) {
		const commander = COMMANDERS[row.commanderId];
		if (commander && commander.bonusType === bonusType) {
			// Calculate bonus based on level
			const level = row.level || 1;
			const bonus = commander.baseBonusValue + (level - 1) * commander.levelBonusMultiplier;
			totalBonus += bonus;
		}
	}

	return totalBonus;
}

// Experience and leveling functions
export function getExperienceForLevel(level: number): number {
	// Experience required = 50 * level * (level - 1)
	// Level 1: 0
	// Level 2: 100
	// Level 3: 300
	return 50 * level * (level - 1);
}

export function getLevelFromExperience(experience: number): number {
	// Inverse of getExperienceForLevel
	// E = 50 * (L^2 - L)
	// L = (1 + sqrt(1 + 0.08 * E)) / 2
	return Math.floor((1 + Math.sqrt(1 + 0.08 * experience)) / 2);
}

export async function addCommanderExperience(
	userId: number,
	commanderId: string,
	experienceGained: number
) {
	const commander = COMMANDERS[commanderId];
	if (!commander) return;

	return await db.transaction(async (tx) => {
		// Get current commander data
		const existingRes = await tx
			.select({
				level: userCommanders.level,
				experience: userCommanders.experience,
				totalExperience: userCommanders.totalExperience
			})
			.from(userCommanders)
			.where(and(eq(userCommanders.userId, userId), eq(userCommanders.commanderId, commanderId)))
			.limit(1);

		if (existingRes.length === 0) return; // Commander not owned

		const current = existingRes[0];
		const newTotalExp = (current.totalExperience || 0) + experienceGained;
		const newLevel = Math.min(getLevelFromExperience(newTotalExp), commander.maxLevel);
		const newExp = newTotalExp - getExperienceForLevel(newLevel - 1);

		await tx
			.update(userCommanders)
			.set({
				level: newLevel,
				experience: newExp,
				totalExperience: newTotalExp
			})
			.where(and(eq(userCommanders.userId, userId), eq(userCommanders.commanderId, commanderId)));

		return { newLevel, leveledUp: newLevel > (current.level || 1) };
	});
}

export async function getCommanderExperience(userId: number, commanderId: string) {
	const res = await db
		.select({
			level: userCommanders.level,
			experience: userCommanders.experience,
			totalExperience: userCommanders.totalExperience
		})
		.from(userCommanders)
		.where(and(eq(userCommanders.userId, userId), eq(userCommanders.commanderId, commanderId)))
		.limit(1);

	if (res.length === 0) return null;

	const data = res[0];
	const commander = COMMANDERS[commanderId];
	const expForCurrentLevel = getExperienceForLevel(data.level || 1);
	const expForNextLevel = getExperienceForLevel((data.level || 1) + 1);

	return {
		level: data.level || 1,
		experience: data.experience || 0,
		totalExperience: data.totalExperience || 0,
		experienceToNext: expForNextLevel - expForCurrentLevel,
		maxLevel: commander?.maxLevel || 20
	};
}
