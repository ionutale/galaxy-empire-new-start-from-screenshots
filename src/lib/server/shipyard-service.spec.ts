import { describe, it, expect, beforeAll, vi } from 'vitest';
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
			return Promise.resolve(this._results).then(resolve);
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

interface MockDb {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	execute: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	transaction: ReturnType<typeof vi.fn>;
}

describe('Shipyard Service', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	describe('getShipyardInfo', () => {
		it('should return complete shipyard information', async () => {
			const mockDb = db as unknown as MockDb;
			mockDb.select
				.mockResolvedValueOnce([{ small_transporter: 5, destroyer: 2 }]) // ships
				.mockResolvedValueOnce([{ shipyard: 3 }]) // shipyard level
				.mockResolvedValueOnce([{ metal: 1000, crystal: 500, gas: 200, energy: 100 }]) // resources
				.mockResolvedValueOnce([]); // queue

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
			const mockDb = db as unknown as MockDb;
			mockDb.select
				.mockResolvedValueOnce([]) // no ships
				.mockResolvedValueOnce([]) // no shipyard
				.mockResolvedValueOnce([]) // no resources
				.mockResolvedValueOnce([]); // no queue

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
			const mockDb = db as unknown as MockDb;
			mockDb.select
				.mockResolvedValueOnce([]) // no ships
				.mockResolvedValueOnce([{ shipyard: 0 }]) // no shipyard
				.mockResolvedValueOnce([{ metal: 10000, crystal: 10000, gas: 10000, energy: 100 }]) // plenty resources
				.mockResolvedValueOnce([]); // no queue

			const result = await ShipyardService.getShipyardInfo(1, 1);

			result.shipyardInfo.forEach((ship) => {
				expect(ship.canBuild).toBe(false);
				expect(ship.reason).toBe('Shipyard required');
			});
		});

		it('should mark ships as not buildable when insufficient resources', async () => {
			const mockDb = db as unknown as MockDb;
			mockDb.select
				.mockResolvedValueOnce([]) // no ships
				.mockResolvedValueOnce([{ shipyard: 3 }]) // shipyard level 3
				.mockResolvedValueOnce([{ metal: 10, crystal: 5, gas: 2, energy: 100 }]) // low resources
				.mockResolvedValueOnce([]); // no queue

			const result = await ShipyardService.getShipyardInfo(1, 1);

			const expensiveShip = result.shipyardInfo.find((ship) => ship.cost.metal > 10);
			expect(expensiveShip?.canBuild).toBe(false);
			expect(expensiveShip?.reason).toBe('Not enough metal');
		});
	});

	describe('startShipConstruction', () => {
		it('should successfully start ship construction', async () => {
			const mockDb = db as unknown as MockDb;
			mockDb.execute.mockResolvedValue({});

			const result = await ShipyardService.startShipConstruction(1, 1, 'small_transporter', 5);

			expect(result).toEqual({ success: true });
			expect(mockDb.execute).toHaveBeenCalledWith(
				sql`CALL start_ship_construction(${1}, ${1}, ${'small_transporter'}, ${5})`
			);
		});

		it('should handle construction errors', async () => {
			const mockDb = db as unknown as MockDb;
			const error = new Error('Invalid ship type');
			mockDb.execute.mockRejectedValue(error);

			const result = await ShipyardService.startShipConstruction(1, 1, 'invalid_ship', 1);

			expect(result).toEqual({
				success: false,
				error: 'Invalid ship type'
			});
		});
	});

	describe('processCompletedShipConstruction', () => {
		it('should process completed ship construction', async () => {
			const mockDb = db as unknown as MockDb;
			mockDb.execute.mockResolvedValue({});

			await ShipyardService.processCompletedShipConstruction();

			expect(mockDb.execute).toHaveBeenCalledWith(sql`CALL process_completed_ship_construction()`);
		});

		it('should handle processing errors gracefully', async () => {
			const mockDb = db as unknown as MockDb;
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const error = new Error('Database error');
			mockDb.execute.mockRejectedValue(error);

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
			const mockDb = db as unknown as MockDb;
			mockDb.execute.mockResolvedValue({
				rows: [{ result: { success: true } }]
			});

			const result = await ShipyardService.cancelShipConstruction(1, 1);

			expect(result).toEqual({ success: true });
			expect(mockDb.execute).toHaveBeenCalledWith(
				sql`SELECT cancel_ship_construction(${1}, ${1}) as result`
			);
		});

		it('should handle cancellation errors', async () => {
			const mockDb = db as unknown as MockDb;
			mockDb.execute.mockResolvedValue({
				rows: [{ result: { success: false, error: 'Queue item not found' } }]
			});

			const result = await ShipyardService.cancelShipConstruction(1, 1);

			expect(result).toEqual({
				success: false,
				error: 'Queue item not found'
			});
		});

		it('should handle database errors', async () => {
			const mockDb = db as unknown as MockDb;
			const error = new Error('Database connection failed');
			mockDb.execute.mockRejectedValue(error);

			const result = await ShipyardService.cancelShipConstruction(1, 1);

			expect(result).toEqual({
				success: false,
				error: 'Database connection failed'
			});
		});

		it('should handle missing result data', async () => {
			const mockDb = db as unknown as MockDb;
			mockDb.execute.mockResolvedValue({
				rows: [{}]
			});

			const result = await ShipyardService.cancelShipConstruction(1, 1);

			expect(result).toEqual({
				success: false,
				error: 'Unknown error'
			});
		});
	});
});
