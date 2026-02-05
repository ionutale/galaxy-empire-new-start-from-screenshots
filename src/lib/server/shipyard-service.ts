import { db } from './db';
import {
	shipyardQueue,
	planetShips,
	planetBuildings,
	buildingTypes,
	planetResources,
	users
} from './db/schema';
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
	static async getShipyardInfo(
		planetId: number,
		userId: number
	): Promise<{
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
		const shipsRes = await db.select().from(planetShips).where(eq(planetShips.planetId, planetId));

		const ships = shipsRes[0]
			? Object.fromEntries(Object.entries(shipsRes[0]).map(([key, value]) => [key, value || 0]))
			: {};

		// Get shipyard level
		const buildRes = await db
			.select({ level: planetBuildings.level })
			.from(planetBuildings)
			.innerJoin(buildingTypes, eq(planetBuildings.buildingTypeId, buildingTypes.id))
			.where(and(eq(planetBuildings.planetId, planetId), eq(buildingTypes.name, 'Shipyard')));

		const shipyardLevel = buildRes[0]?.level || 0;

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

		const resources = resRes[0]
			? {
					metal: resRes[0].metal || 0,
					crystal: resRes[0].crystal || 0,
					gas: resRes[0].gas || 0,
					energy: resRes[0].energy || 0
				}
			: { metal: 0, crystal: 0, gas: 0, energy: 0 };

		// Get shipyard queue
		const queueRes = await db
			.select()
			.from(shipyardQueue)
			.where(and(eq(shipyardQueue.planetId, planetId), eq(shipyardQueue.userId, userId)))
			.orderBy(shipyardQueue.completionAt);

		const queue = queueRes.map((item) => ({
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
			} else if ((resources.metal || 0) < ship.cost.metal) {
				canBuild = false;
				reason = 'Not enough metal';
			} else if ((resources.crystal || 0) < ship.cost.crystal) {
				canBuild = false;
				reason = 'Not enough crystal';
			} else if ((resources.gas || 0) < (ship.cost.gas || 0)) {
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
		try {
			// Use stored procedure for validation and construction start
			await db.execute(
				sql`CALL start_ship_construction(${userId}, ${planetId}, ${shipType}, ${amount})`
			);
			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Process completed ship construction
	 */
	static async processCompletedShipConstruction(): Promise<void> {
		try {
			// Use stored procedure to process completed constructions
			await db.execute(sql`CALL process_completed_ship_construction()`);
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
			// Use stored function for cancellation
			const result = await db.execute(
				sql`SELECT cancel_ship_construction(${userId}, ${queueId}) as result`
			);
			const cancelResult = result.rows[0]?.result as any;

			if (cancelResult?.success) {
				return { success: true };
			} else {
				return { success: false, error: cancelResult?.error || 'Unknown error' };
			}
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}
}
