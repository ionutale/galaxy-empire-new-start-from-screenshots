import { db } from './db';
import { users, userCommanders } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';

export interface Commander {
	id: string;
	name: string;
	description: string;
	bonusType: 'mine_production' | 'fleet_speed' | 'research_speed' | 'energy_production';
	bonusValue: number; // Percentage (e.g., 10 for 10%)
	image: string;
}

export const COMMANDERS: Record<string, Commander> = {
	geologist: {
		id: 'geologist',
		name: 'Geologist',
		description: 'Increases mine production by 10%.',
		bonusType: 'mine_production',
		bonusValue: 10,
		image: 'geologist.png'
	},
	admiral: {
		id: 'admiral',
		name: 'Admiral',
		description: 'Increases fleet speed by 10%.',
		bonusType: 'fleet_speed',
		bonusValue: 10,
		image: 'admiral.png'
	},
	engineer: {
		id: 'engineer',
		name: 'Engineer',
		description: 'Increases energy production by 10%.',
		bonusType: 'energy_production',
		bonusValue: 10,
		image: 'engineer.png'
	},
	technocrat: {
		id: 'technocrat',
		name: 'Technocrat',
		description: 'Decreases research time by 10%.',
		bonusType: 'research_speed',
		bonusValue: 10,
		image: 'technocrat.png'
	},
	nebula_explorer: {
		id: 'nebula_explorer',
		name: 'Nebula Explorer',
		description: 'Automatically sends expeditions using a selected fleet template.',
		bonusType: 'fleet_speed', // Reusing type or add new one? The type is just for bonus calculation usually.
		bonusValue: 0,
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
			expiresAt: userCommanders.expiresAt
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
			totalBonus += commander.bonusValue;
		}
	}

	return totalBonus;
}
