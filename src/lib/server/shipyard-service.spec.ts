import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShipyardService } from './shipyard-service';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { SHIPS } from '$lib/game-config';

// Mock the database with proper chaining support
const { mockDb } = vi.hoisted(() => {
	const mock: any = {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		execute: vi.fn().mockReturnThis(),
		returning: vi.fn().mockReturnThis(),
		transaction: vi.fn().mockImplementation(async (cb) => cb(mock)),
		// Result handling
		_results: [] as any[],
		then: function(this: any, resolve: any) {
			const result = this._results.length > 0 ? this._results.shift() : [];
			return Promise.resolve(result).then(resolve);
		}
	};
	return { mockDb: mock };
});

vi.mock('./db', () => ({
	db: mockDb,
	planetShips: { name: 'planet_ships' },
	planetBuildings: { name: 'planet_buildings' },
	planetResources: { name: 'planet_resources' },
	shipyardQueue: { name: 'shipyard_queue' }
}));

describe('Shipyard Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb._results = [];
	});

	describe('getShipyardInfo', () => {
		it('should return complete shipyard information', async () => {
			mockDb._results = [
				[{ small_transporter: 5, destroyer: 2 }], // ships
				[{ level: 3 }], // shipyard level
				[{ metal: 1000, crystal: 500, gas: 200, energy: 100 }], // resources
				[] // queue
			];

			const result = await ShipyardService.getShipyardInfo(1, 1);

			expect(result).toEqual({
				ships: { small_transporter: 5, destroyer: 2 },
				queue: [],
				shipyardInfo: expect.any(Array),
				resources: {
					metal: 1000,
					crystal: 500,
					gas: 200,
					energy: 100
				},
				shipyardLevel: 3
			});

			expect(result.shipyardInfo).toHaveLength(Object.keys(SHIPS).length);
		});

		it('should return default values when no data found', async () => {
			mockDb._results = [
				[], // no ships
				[], // no shipyard
				[], // no resources
				[]  // no queue
			];

			const result = await ShipyardService.getShipyardInfo(1, 1);

			expect(result).toEqual({
				ships: {},
				queue: [],
				shipyardInfo: expect.any(Array),
				resources: {
					metal: 0,
					crystal: 0,
					gas: 0,
					energy: 0
				},
				shipyardLevel: 0
			});
		});

		it('should mark ships as not buildable when shipyard level is 0', async () => {
			mockDb._results = [
				[], // no ships
				[{ level: 0 }], // no shipyard
				[{ metal: 10000, crystal: 10000, gas: 10000, energy: 100 }], // plenty resources
				[] // no queue
			];

			const result = await ShipyardService.getShipyardInfo(1, 1);

			result.shipyardInfo.forEach((ship) => {
				expect(ship.canBuild).toBe(false);
				expect(ship.reason).toBe('Shipyard required');
			});
		});

		it('should mark ships as not buildable when insufficient resources', async () => {
			mockDb._results = [
				[], // no ships
				[{ level: 3 }], // shipyard level 3
				[{ metal: 10, crystal: 5, gas: 2, energy: 100 }], // low resources
				[] // no queue
			];

			const result = await ShipyardService.getShipyardInfo(1, 1);

			const expensiveShip = result.shipyardInfo.find((ship) => ship.cost.metal > 10);
			expect(expensiveShip?.canBuild).toBe(false);
			expect(expensiveShip?.reason).toBe('Not enough metal');
		});
	});

	describe('startShipConstruction', () => {
		it('should successfully start ship construction', async () => {
			mockDb._results = [
				{} // execute result
			];

			const result = await ShipyardService.startShipConstruction(1, 1, 'small_transporter', 5);

			expect(result).toEqual({ success: true });
			expect(mockDb.execute).toHaveBeenCalledWith(
				sql`CALL start_ship_construction(${1}, ${1}, ${'small_transporter'}, ${5})`
			);
		});

		it('should handle construction errors', async () => {
			const error = new Error('Invalid ship type');
			mockDb.execute.mockRejectedValueOnce(error);

			const result = await ShipyardService.startShipConstruction(1, 1, 'invalid_ship', 1);

			expect(result).toEqual({
				success: false,
				error: 'Invalid ship type'
			});
		});
	});

	describe('processCompletedShipConstruction', () => {
		it('should process completed ship construction', async () => {
			mockDb._results = [ {} ];

			await ShipyardService.processCompletedShipConstruction();

			expect(mockDb.execute).toHaveBeenCalledWith(sql`CALL process_completed_ship_construction()`);
		});

		it('should handle processing errors gracefully', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const error = new Error('Database error');
			mockDb.execute.mockRejectedValueOnce(error);

			await ShipyardService.processCompletedShipConstruction();

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error processing completed ship construction:',
				error
			);

			consoleSpy.mockRestore();
		});
	});

	describe('cancelShipConstruction', () => {
		it('should successfully cancel ship construction', async () => {
			mockDb._results = [
				{ rows: [{ result: { success: true } }] }
			];

			const result = await ShipyardService.cancelShipConstruction(1, 1);

			expect(result).toEqual({ success: true });
			expect(mockDb.execute).toHaveBeenCalledWith(
				sql`SELECT cancel_ship_construction(${1}, ${1}) as result`
			);
		});

		it('should handle cancellation errors', async () => {
			mockDb._results = [
				{ rows: [{ result: { success: false, error: 'Queue item not found' } }] }
			];

			const result = await ShipyardService.cancelShipConstruction(1, 1);

			expect(result).toEqual({
				success: false,
				error: 'Queue item not found'
			});
		});

		it('should handle database errors', async () => {
			const error = new Error('Database connection failed');
			mockDb.execute.mockRejectedValueOnce(error);

			const result = await ShipyardService.cancelShipConstruction(1, 1);

			expect(result).toEqual({
				success: false,
				error: 'Database connection failed'
			});
		});

		it('should handle missing result data', async () => {
			mockDb._results = [
				{ rows: [{}] }
			];

			const result = await ShipyardService.cancelShipConstruction(1, 1);

			expect(result).toEqual({
				success: false,
				error: 'Unknown error'
			});
		});
	});
});
