import { db } from './db';
import { shipyardQueue, planetShips, planetBuildings, planetResources, users } from './db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { SHIPS } from '$lib/game-config';

export interface ShipyardInfo {
	shipType: string;
	name: string;
	cost: {
		metal: number;
		crystal: number;
		gas: number;
	};
	attack: number;
	defense: number;
	speed: number;
	capacity: number;
	canBuild: boolean;
	reason?: string;
}

export interface ShipyardQueueItem {
	id: number;
	shipType: string;
	amount: number;
	startedAt: Date;
	completionAt: Date;
}

export class ShipyardService {
	/**
	 * Get shipyard information for a planet
	 */
	static async getShipyardInfo(planetId: number, userId: number): Promise<{
		ships: Record<string, number>;
		queue: ShipyardQueueItem[];
		shipyardInfo: ShipyardInfo[];
		resources: {
			metal: number;
			crystal: number;
			gas: number;
			energy: number;
		};
		shipyardLevel: number;
	}> {
		// Get planet ships
		const shipsRes = await db
			.select()
			.from(planetShips)
			.where(eq(planetShips.planetId, planetId));

		const ships = shipsRes[0] || {};

		// Get shipyard level
		const buildRes = await db
			.select({ shipyard: planetBuildings.shipyard })
			.from(planetBuildings)
			.where(eq(planetBuildings.planetId, planetId));

		const shipyardLevel = buildRes[0]?.shipyard || 0;

		// Get resources
		const resRes = await db
			.select({
				metal: planetResources.metal,
				crystal: planetResources.crystal,
				gas: planetResources.gas,
				energy: planetResources.energy
			})
			.from(planetResources)
			.where(eq(planetResources.planetId, planetId));

		const resources = resRes[0] || { metal: 0, crystal: 0, gas: 0, energy: 0 };

		// Get shipyard queue
		const queueRes = await db
			.select()
			.from(shipyardQueue)
			.where(and(eq(shipyardQueue.planetId, planetId), eq(shipyardQueue.userId, userId)))
			.orderBy(shipyardQueue.completionAt);

		const queue = queueRes.map(item => ({
			id: item.id,
			shipType: item.shipType,
			amount: item.amount,
			startedAt: item.startedAt!,
			completionAt: item.completionAt
		}));

		// Build shipyard info
		const shipyardInfo: ShipyardInfo[] = Object.entries(SHIPS).map(([type, ship]) => {
			let canBuild = true;
			let reason = '';

			if (shipyardLevel < 1) {
				canBuild = false;
				reason = 'Shipyard required';
			} else if (resources.metal < ship.cost.metal) {
				canBuild = false;
				reason = 'Not enough metal';
			} else if (resources.crystal < ship.cost.crystal) {
				canBuild = false;
				reason = 'Not enough crystal';
			} else if (resources.gas < (ship.cost.gas || 0)) {
				canBuild = false;
				reason = 'Not enough gas';
			}

			return {
				shipType: type,
				name: ship.name,
				cost: {
					metal: ship.cost.metal,
					crystal: ship.cost.crystal,
					gas: ship.cost.gas || 0
				},
				attack: ship.attack,
				defense: ship.defense,
				speed: ship.speed,
				capacity: ship.capacity,
				canBuild,
				reason
			};
		});

		return {
			ships,
			queue,
			shipyardInfo,
			resources,
			shipyardLevel
		};
	}

	/**
	 * Start building ships
	 */
	static async startShipConstruction(
		userId: number,
		planetId: number,
		shipType: string,
		amount: number
	): Promise<{ success: boolean; error?: string }> {
		const shipConfig = SHIPS[shipType];
		if (!shipConfig) {
			return { success: false, error: 'Invalid ship type' };
		}

		if (amount < 1) {
			return { success: false, error: 'Invalid amount' };
		}

		try {
			await db.transaction(async (tx) => {
				// Check shipyard level
				const buildRes = await tx
					.select({ shipyard: planetBuildings.shipyard })
					.from(planetBuildings)
					.where(eq(planetBuildings.planetId, planetId));

				if ((buildRes[0]?.shipyard || 0) < 1) {
					throw new Error('Shipyard required');
				}

				// Check resources
				const resRes = await tx
					.select({
						metal: planetResources.metal,
						crystal: planetResources.crystal,
						gas: planetResources.gas
					})
					.from(planetResources)
					.where(eq(planetResources.planetId, planetId))
					.for('update');

				if (resRes.length === 0) {
					throw new Error('Planet not found');
				}

				const resources = resRes[0];
				const totalCost = {
					metal: shipConfig.cost.metal * amount,
					crystal: shipConfig.cost.crystal * amount,
					gas: (shipConfig.cost.gas || 0) * amount
				};

				if (
					(resources.metal || 0) < totalCost.metal ||
					(resources.crystal || 0) < totalCost.crystal ||
					(resources.gas || 0) < totalCost.gas
				) {
					throw new Error('Not enough resources');
				}

				// Calculate construction time (simplified - 1 second per ship for now)
				const constructionTimeSeconds = amount; // TODO: Make this configurable
				const completionAt = new Date(Date.now() + constructionTimeSeconds * 1000);

				// Deduct resources
				await tx
					.update(planetResources)
					.set({
						metal: sql`${planetResources.metal} - ${totalCost.metal}`,
						crystal: sql`${planetResources.crystal} - ${totalCost.crystal}`,
						gas: sql`${planetResources.gas} - ${totalCost.gas}`
					})
					.where(eq(planetResources.planetId, planetId));

				// Add to shipyard queue
				await tx.insert(shipyardQueue).values({
					userId,
					planetId,
					shipType,
					amount,
					completionAt
				});
			});

			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Process completed ship construction
	 */
	static async processCompletedShipConstruction(): Promise<void> {
		const now = new Date();

		try {
			await db.transaction(async (tx) => {
				// Get completed ship constructions
				const completed = await tx
					.select()
					.from(shipyardQueue)
					.where(sql`${shipyardQueue.completionAt} <= ${now}`)
					.orderBy(shipyardQueue.completionAt);

				for (const item of completed) {
					// Ensure planet_ships row exists
					await tx
						.insert(planetShips)
						.values({ planetId: item.planetId })
						.onConflictDoNothing({ target: planetShips.planetId });

					// Add ships to planet
					const shipKey = item.shipType.replace(/_([a-z])/g, (g) =>
						g[1].toUpperCase()
					) as keyof typeof planetShips;

					const shipColumn = planetShips[shipKey];
					if (shipColumn) {
						await tx
							.update(planetShips)
							.set({ [shipKey]: sql`${shipColumn} + ${item.amount}` })
							.where(eq(planetShips.planetId, item.planetId));
					}

					// Remove from queue
					await tx.delete(shipyardQueue).where(eq(shipyardQueue.id, item.id));
				}
			});
		} catch (error) {
			console.error('Error processing completed ship construction:', error);
		}
	}

	/**
	 * Cancel ship construction
	 */
	static async cancelShipConstruction(
		userId: number,
		queueId: number
	): Promise<{ success: boolean; error?: string }> {
		try {
			await db.transaction(async (tx) => {
				// Get the queue item
				const queueRes = await tx
					.select()
					.from(shipyardQueue)
					.where(and(eq(shipyardQueue.id, queueId), eq(shipyardQueue.userId, userId)))
					.for('update');

				if (queueRes.length === 0) {
					throw new Error('Construction not found');
				}

				const item = queueRes[0];
				const shipConfig = SHIPS[item.shipType];
				if (!shipConfig) {
					throw new Error('Invalid ship type');
				}

				// Calculate refund (50% of resources)
				const refund = {
					metal: Math.floor((shipConfig.cost.metal * item.amount) * 0.5),
					crystal: Math.floor((shipConfig.cost.crystal * item.amount) * 0.5),
					gas: Math.floor(((shipConfig.cost.gas || 0) * item.amount) * 0.5)
				};

				// Refund resources
				await tx
					.update(planetResources)
					.set({
						metal: sql`${planetResources.metal} + ${refund.metal}`,
						crystal: sql`${planetResources.crystal} + ${refund.crystal}`,
						gas: sql`${planetResources.gas} + ${refund.gas}`
					})
					.where(eq(planetResources.planetId, item.planetId));

				// Remove from queue
				await tx.delete(shipyardQueue).where(eq(shipyardQueue.id, queueId));
			});

			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}
}