import { db } from './db';
import {
	users,
	userBoosters,
	transactions,
	galactoniteItems,
	fusionRecipes,
	activeBoosts
} from './db/schema';
import { eq, and, gt, inArray } from 'drizzle-orm';

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

		// Record transaction
		await tx.insert(transactions).values({
			userId,
			type: 'purchase',
			amount: item.cost,
			description: `Purchased ${item.name}`,
			metadata: JSON.stringify({
				itemId,
				itemName: item.name,
				durationSeconds: item.durationSeconds
			})
		});

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
	const fusionBoosts = await getActiveFusionBoosts(userId);

	const multipliers = {
		metal: 1.0,
		crystal: 1.0,
		gas: 1.0,
		energy: 1.0
	};

	// Apply shop boosters
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

	// Apply fusion boosts
	for (const b of fusionBoosts) {
		if (b.boostType === 'production') {
			const factor = 1 + b.value / 100;
			multipliers.metal *= factor;
			multipliers.crystal *= factor;
			multipliers.gas *= factor;
		}
		// Add other boost types as needed
	}

	return multipliers;
}

// Galactonite Fusion Functions
export interface GalactoniteItem {
	id: number;
	playerId: number;
	type: string;
	rarity: string;
	stats: Record<string, unknown>;
}

export async function purchaseGalactoniteItem(
	userId: number,
	type: string,
	rarity: string,
	cost: number
) {
	return await db.transaction(async (tx) => {
		// Check DM
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

		// Add item
		const [newItem] = await tx
			.insert(galactoniteItems)
			.values({
				playerId: userId,
				type,
				rarity,
				stats: {} // TODO: generate stats based on type/rarity
			})
			.returning();

		// Record transaction
		await tx.insert(transactions).values({
			userId,
			type: 'galactonite_purchase',
			amount: cost,
			description: `Purchased ${rarity} ${type}`,
			metadata: JSON.stringify({ itemId: newItem.id, type, rarity })
		});

		return { success: true, item: newItem, remainingDM: currentDM - cost };
	});
}

export async function getPlayerGalactoniteItems(userId: number): Promise<GalactoniteItem[]> {
	const items = await db
		.select()
		.from(galactoniteItems)
		.where(eq(galactoniteItems.playerId, userId));
	return items as unknown as GalactoniteItem[];
}

export async function fuseItems(userId: number, itemIds: number[], recipeId: number) {
	return await db.transaction(async (tx) => {
		// Get recipe
		const recipeRes = await tx.select().from(fusionRecipes).where(eq(fusionRecipes.id, recipeId));

		if (!recipeRes.length) throw new Error('Recipe not found');

		const recipe = recipeRes[0];
		const recipeCost = recipe.cost || 0;

		// Check DM cost
		const userRes = await tx
			.select({ darkMatter: users.darkMatter })
			.from(users)
			.where(eq(users.id, userId));

		if (userRes.length === 0) throw new Error('User not found');
		const userDM = userRes[0].darkMatter || 0;

		if (userDM < recipeCost) throw new Error('Not enough Dark Matter');

		// Check items ownership and count
		const items = await tx
			.select()
			.from(galactoniteItems)
			.where(and(eq(galactoniteItems.playerId, userId), inArray(galactoniteItems.id, itemIds)));

		if (items.length !== itemIds.length) throw new Error('Some items not found or not owned');

		// TODO: Validate items match recipe input

		// Deduct DM
		await tx
			.update(users)
			.set({ darkMatter: userDM - recipeCost })
			.where(eq(users.id, userId));

		// Delete used items
		await tx.delete(galactoniteItems).where(inArray(galactoniteItems.id, itemIds));

		// Apply boost
		const boost = recipe.outputBoost as { type: string; value: number; duration: number };
		const expiresAt = new Date(Date.now() + boost.duration * 1000);

		await tx.insert(activeBoosts).values({
			userId,
			boostType: boost.type,
			value: boost.value,
			expiresAt
		});

		// Record transaction
		await tx.insert(transactions).values({
			userId,
			type: 'fusion',
			amount: recipeCost,
			description: `Fused items for ${boost.type} boost`,
			metadata: JSON.stringify({ recipeId, boost })
		});

		return { success: true, boost, expiresAt };
	});
}

export async function getActiveFusionBoosts(userId: number) {
	return await db
		.select()
		.from(activeBoosts)
		.where(and(eq(activeBoosts.userId, userId), gt(activeBoosts.expiresAt, new Date())));
}
