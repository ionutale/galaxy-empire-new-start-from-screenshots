import { describe, it, expect, beforeAll, vi } from 'vitest';
import { BuildingService } from './building-service';
import { db } from './db';
import { users, planetBuildings, buildingQueue } from './db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';

// Mock the database
vi.mock('./db', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		execute: vi.fn(),
		delete: vi.fn(),
		transaction: vi.fn()
	}
}));

describe('Building Service', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	describe('startBuildingConstruction', () => {
		it('should successfully start building construction', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 1000, crystal: 500, deuterium: 200 }]) // user resources
						.mockResolvedValueOnce([{ level: 1 }]) // building level
						.mockResolvedValueOnce([]), // building queue
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await BuildingService.startBuildingConstruction(1, 1, 1);

			expect(result).toEqual({
				success: true,
				completionTime: expect.any(Date),
				remainingResources: {
					metal: 900,
					crystal: 450,
					deuterium: 180
				}
			});
		});

		it('should throw error for invalid building', async () => {
			await expect(startBuildingConstruction(1, 'invalid_building')).rejects.toThrow('Invalid building');
		});

		it('should throw error when insufficient resources', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 50, crystal: 20, deuterium: 10 }]) // insufficient resources
						.mockResolvedValueOnce([{ level: 1 }]) // building level
						.mockResolvedValueOnce([]), // building queue
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(startBuildingConstruction(1, 'metal_mine')).rejects.toThrow('Not enough resources');
		});

		it('should throw error when building queue is full', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 1000, crystal: 500, deuterium: 200 }]) // user resources
						.mockResolvedValueOnce([{ level: 1 }]) // building level
						.mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }]), // full queue
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(startBuildingConstruction(1, 'metal_mine')).rejects.toThrow('Building queue is full');
		});
	});

	describe('getBuildingQueue', () => {
		it('should return building queue with completion times', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setMinutes(futureDate.getMinutes() + 30);

			mockDb.select.mockResolvedValue([
				{
					id: 1,
					buildingId: 'metal_mine',
					level: 2,
					completionTime: futureDate,
					name: 'Metal Mine'
				}
			]);

			const result = await getBuildingQueue(1);

			expect(result).toHaveLength(1);
			expect(result[0].buildingId).toBe('metal_mine');
			expect(result[0].remainingTime).toBeGreaterThan(0);
		});
	});

	describe('cancelBuildingConstruction', () => {
		it('should successfully cancel building construction', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([{
						buildingId: 'metal_mine',
						level: 2,
						metalCost: 100,
						crystalCost: 50,
						deuteriumCost: 20
					}]),
					update: vi.fn().mockResolvedValue({}),
					delete: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await cancelBuildingConstruction(1, 1);

			expect(result).toEqual({
				success: true,
				refundedResources: {
					metal: 100,
					crystal: 50,
					deuterium: 20
				}
			});
		});

		it('should throw error when construction not found', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([]),
					update: vi.fn().mockResolvedValue({}),
					delete: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(cancelBuildingConstruction(1, 1)).rejects.toThrow('Construction not found');
		});
	});

	describe('getBuildingInfo', () => {
		it('should return building information with current level and costs', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([{
				level: 3,
				name: 'Metal Mine',
				description: 'Produces metal resources'
			}]);

			const result = await getBuildingInfo(1, 'metal_mine');

			expect(result).toEqual({
				buildingId: 'metal_mine',
				currentLevel: 3,
				name: 'Metal Mine',
				description: 'Produces metal resources',
				nextLevelCost: expect.any(Object),
				production: expect.any(Object)
			});
		});
	});

	describe('upgradeBuilding', () => {
		it('should successfully upgrade building', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 1000, crystal: 500, deuterium: 200 }]) // user resources
						.mockResolvedValueOnce([{ level: 1 }]) // building level
						.mockResolvedValueOnce([]), // building queue
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await upgradeBuilding(1, 'metal_mine');

			expect(result).toEqual({
				success: true,
				newLevel: 2,
				completionTime: expect.any(Date),
				remainingResources: expect.any(Object)
			});
		});

		it('should throw error when building already in queue', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 1000, crystal: 500, deuterium: 200 }]) // user resources
						.mockResolvedValueOnce([{ level: 1 }]) // building level
						.mockResolvedValueOnce([{ buildingId: 'metal_mine' }]), // building in queue
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(upgradeBuilding(1, 'metal_mine')).rejects.toThrow('Building already in construction queue');
		});
	});

	describe('getBuildingCosts', () => {
		it('should calculate building costs for given level', () => {
			const { getBuildingCosts } = require('./buildings');

			const costs = getBuildingCosts('metal_mine', 2);

			expect(costs).toEqual({
				metal: expect.any(Number),
				crystal: expect.any(Number),
				deuterium: expect.any(Number),
				time: expect.any(Number)
			});
		});

		it('should return increasing costs for higher levels', () => {
			const { getBuildingCosts } = require('./buildings');

			const level1Costs = getBuildingCosts('metal_mine', 1);
			const level2Costs = getBuildingCosts('metal_mine', 2);

			expect(level2Costs.metal).toBeGreaterThan(level1Costs.metal);
			expect(level2Costs.time).toBeGreaterThan(level1Costs.time);
		});
	});

	describe('Building production calculations', () => {
		it('should calculate production for metal mine', () => {
			const { getBuildingProduction } = require('./buildings');

			const production = getBuildingProduction('metal_mine', 1);

			expect(production).toEqual({
				metal: expect.any(Number),
				energy: expect.any(Number)
			});
		});

		it('should increase production with level', () => {
			const { getBuildingProduction } = require('./buildings');

			const level1Prod = getBuildingProduction('metal_mine', 1);
			const level2Prod = getBuildingProduction('metal_mine', 2);

			expect(level2Prod.metal).toBeGreaterThan(level1Prod.metal);
		});
	});
});