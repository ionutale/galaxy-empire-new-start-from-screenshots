import { db } from './db';
import { users, userBoosters } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';

export interface ShopItem {
	id: string;
	name: string;
	description: string;
	cost: number; // Dark Matter
	durationSeconds: number;
	effectType:
		| 'metal_production'
		| 'crystal_production'
		| 'gas_production'
		| 'all_production'
		| 'energy_production';
	effectValue: number; // Percentage (e.g., 20 for 20%)
	image: string;
}

export const SHOP_ITEMS: Record<string, ShopItem> = {
	metal_booster_small: {
		id: 'metal_booster_small',
		name: 'Metal Booster (24h)',
		description: 'Increases Metal production by 20% for 24 hours.',
		cost: 200,
		durationSeconds: 86400,
		effectType: 'metal_production',
		effectValue: 20,
		image: 'metal_booster.png'
	},
	crystal_booster_small: {
		id: 'crystal_booster_small',
		name: 'Crystal Booster (24h)',
		description: 'Increases Crystal production by 20% for 24 hours.',
		cost: 200,
		durationSeconds: 86400,
		effectType: 'crystal_production',
		effectValue: 20,
		image: 'crystal_booster.png'
	},
	gas_booster_small: {
		id: 'gas_booster_small',
		name: 'Gas Booster (24h)',
		description: 'Increases Gas production by 20% for 24 hours.',
		cost: 200,
		durationSeconds: 86400,
		effectType: 'gas_production',
		effectValue: 20,
		image: 'gas_booster.png'
	},
	production_overdrive: {
		id: 'production_overdrive',
		name: 'Production Overdrive (24h)',
		description: 'Increases ALL resource production by 10% for 24 hours.',
		cost: 500,
		durationSeconds: 86400,
		effectType: 'all_production',
		effectValue: 10,
		image: 'overdrive.png'
	},
	energy_booster: {
		id: 'energy_booster',
		name: 'Energy Surge (24h)',
		description: 'Increases Energy production by 20% for 24 hours.',
		cost: 150,
		durationSeconds: 86400,
		effectType: 'energy_production',
		effectValue: 20,
		image: 'energy_booster.png'
	}
};

export async function purchaseShopItem(userId: number, itemId: string) {
	const item = SHOP_ITEMS[itemId];
	if (!item) throw new Error('Invalid item');

	return await db.transaction(async (tx) => {
		// Check user DM
		const userRes = await tx
			.select({ darkMatter: users.darkMatter })
			.from(users)
			.where(eq(users.id, userId));

		if (userRes.length === 0) throw new Error('User not found');

		const currentDM = userRes[0].darkMatter || 0;
		if (currentDM < item.cost) throw new Error('Not enough Dark Matter');

		// Deduct DM
		await tx
			.update(users)
			.set({ darkMatter: currentDM - item.cost })
			.where(eq(users.id, userId));

		// Add Booster
		// Check for existing active booster of same type
		const existingRes = await tx
			.select({
				id: userBoosters.id,
				expiresAt: userBoosters.expiresAt
			})
			.from(userBoosters)
			.where(
				and(
					eq(userBoosters.userId, userId),
					eq(userBoosters.boosterId, itemId),
					gt(userBoosters.expiresAt, new Date())
				)
			);

		let newExpiresAt = new Date();
		newExpiresAt.setSeconds(newExpiresAt.getSeconds() + item.durationSeconds);

		if (existingRes.length > 0) {
			// Extend existing
			const currentExpiresAt = new Date(existingRes[0].expiresAt);
			// If current expires in future, add duration to it
			if (currentExpiresAt > new Date()) {
				newExpiresAt = new Date(currentExpiresAt.getTime() + item.durationSeconds * 1000);
			}

			await tx
				.update(userBoosters)
				.set({ expiresAt: newExpiresAt })
				.where(eq(userBoosters.id, existingRes[0].id));
		} else {
			// Insert new
			await tx.insert(userBoosters).values({
				userId,
				boosterId: itemId,
				expiresAt: newExpiresAt
			});
		}

		return { success: true, expiresAt: newExpiresAt, remainingDM: currentDM - item.cost };
	});
}

export async function getActiveBoosters(userId: number) {
	const res = await db
		.select({
			boosterId: userBoosters.boosterId,
			expiresAt: userBoosters.expiresAt
		})
		.from(userBoosters)
		.where(and(eq(userBoosters.userId, userId), gt(userBoosters.expiresAt, new Date())));

	return res;
}

export async function getBoosterMultipliers(userId: number) {
	const active = await getActiveBoosters(userId);

	const multipliers = {
		metal: 1.0,
		crystal: 1.0,
		gas: 1.0,
		energy: 1.0
	};

	for (const b of active) {
		const item = SHOP_ITEMS[b.boosterId];
		if (!item) continue;

		const factor = 1 + item.effectValue / 100;

		if (item.effectType === 'metal_production') multipliers.metal *= factor;
		if (item.effectType === 'crystal_production') multipliers.crystal *= factor;
		if (item.effectType === 'gas_production') multipliers.gas *= factor;
		if (item.effectType === 'energy_production') multipliers.energy *= factor;
		if (item.effectType === 'all_production') {
			multipliers.metal *= factor;
			multipliers.crystal *= factor;
			multipliers.gas *= factor;
		}
	}

	return multipliers;
}
