import { describe, it, expect, beforeAll, vi } from 'vitest';
import { startResearch, getResearchQueue, cancelResearch, getResearchInfo, getResearchProgress, completeResearch } from './research';
import { db } from './db';
import { users, research, researchQueue } from './db/schema';
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

describe('Research Service', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	describe('startResearch', () => {
		it('should successfully start research', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 1000, crystal: 500, deuterium: 200 }]) // user resources
						.mockResolvedValueOnce([]) // research level
						.mockResolvedValueOnce([]) // research queue
						.mockResolvedValueOnce([{ level: 1 }]) // lab level
						.mockResolvedValueOnce([{ level: 1 }]), // prerequisite research
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await startResearch(1, 'energy_technology');

			expect(result).toEqual({
				success: true,
				completionTime: expect.any(Date),
				remainingResources: {
					metal: expect.any(Number),
					crystal: expect.any(Number),
					deuterium: expect.any(Number)
				}
			});
		});

		it('should throw error for invalid research', async () => {
			await expect(startResearch(1, 'invalid_research')).rejects.toThrow('Invalid research');
		});

		it('should throw error when insufficient resources', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 50, crystal: 20, deuterium: 10 }]) // insufficient resources
						.mockResolvedValueOnce([]) // research level
						.mockResolvedValueOnce([]) // research queue
						.mockResolvedValueOnce([{ level: 1 }]) // lab level
						.mockResolvedValueOnce([{ level: 1 }]), // prerequisite research
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(startResearch(1, 'energy_technology')).rejects.toThrow('Not enough resources');
		});

		it('should throw error when prerequisites not met', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 1000, crystal: 500, deuterium: 200 }]) // user resources
						.mockResolvedValueOnce([]) // research level
						.mockResolvedValueOnce([]) // research queue
						.mockResolvedValueOnce([{ level: 1 }]) // lab level
						.mockResolvedValueOnce([]), // missing prerequisite
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(startResearch(1, 'laser_technology')).rejects.toThrow('Prerequisites not met');
		});

		it('should throw error when research lab level insufficient', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 1000, crystal: 500, deuterium: 200 }]) // user resources
						.mockResolvedValueOnce([]) // research level
						.mockResolvedValueOnce([]) // research queue
						.mockResolvedValueOnce([{ level: 1 }]) // insufficient lab level
						.mockResolvedValueOnce([{ level: 1 }]), // prerequisite research
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(startResearch(1, 'graviton_technology')).rejects.toThrow('Research lab level too low');
		});
	});

	describe('getResearchQueue', () => {
		it('should return research queue with completion times', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 2);

			mockDb.select.mockResolvedValue([
				{
					id: 1,
					researchId: 'energy_technology',
					level: 2,
					completionTime: futureDate,
					name: 'Energy Technology'
				}
			]);

			const result = await getResearchQueue(1);

			expect(result).toHaveLength(1);
			expect(result[0].researchId).toBe('energy_technology');
			expect(result[0].remainingTime).toBeGreaterThan(0);
		});
	});

	describe('cancelResearch', () => {
		it('should successfully cancel research', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([{
						researchId: 'energy_technology',
						level: 2,
						metalCost: 200,
						crystalCost: 100,
						deuteriumCost: 50
					}]),
					update: vi.fn().mockResolvedValue({}),
					delete: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await cancelResearch(1, 1);

			expect(result).toEqual({
				success: true,
				refundedResources: {
					metal: 200,
					crystal: 100,
					deuterium: 50
				}
			});
		});

		it('should throw error when research not found', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([]),
					update: vi.fn().mockResolvedValue({}),
					delete: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(cancelResearch(1, 1)).rejects.toThrow('Research not found');
		});
	});

	describe('getResearchInfo', () => {
		it('should return research information with current level and costs', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([{
				level: 2,
				name: 'Energy Technology',
				description: 'Improves energy production'
			}]);

			const result = await getResearchInfo(1, 'energy_technology');

			expect(result).toEqual({
				researchId: 'energy_technology',
				currentLevel: 2,
				name: 'Energy Technology',
				description: 'Improves energy production',
				nextLevelCost: expect.any(Object),
				prerequisites: expect.any(Array),
				requiredLabLevel: expect.any(Number)
			});
		});
	});

	describe('getResearchProgress', () => {
		it('should return research progress for active researches', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 1);

			mockDb.select.mockResolvedValue([
				{
					researchId: 'energy_technology',
					level: 2,
					completionTime: futureDate,
					startTime: new Date(),
					name: 'Energy Technology'
				}
			]);

			const result = await getResearchProgress(1);

			expect(result).toHaveLength(1);
			expect(result[0].researchId).toBe('energy_technology');
			expect(result[0].progress).toBeGreaterThan(0);
			expect(result[0].progress).toBeLessThanOrEqual(100);
		});
	});

	describe('completeResearch', () => {
		it('should successfully complete research', async () => {
			const mockDb = db as any;
			const pastDate = new Date();
			pastDate.setHours(pastDate.getHours() - 1);

			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([{
						id: 1,
						researchId: 'energy_technology',
						level: 2,
						completionTime: pastDate
					}]),
					update: vi.fn().mockResolvedValue({}),
					delete: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await completeResearch(1);

			expect(result).toEqual({
				completedResearches: [
					{
						researchId: 'energy_technology',
						newLevel: 2
					}
				]
			});
		});

		it('should return empty array when no research completed', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 1);

			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([{
						id: 1,
						researchId: 'energy_technology',
						level: 2,
						completionTime: futureDate
					}]),
					update: vi.fn().mockResolvedValue({}),
					delete: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await completeResearch(1);

			expect(result).toEqual({
				completedResearches: []
			});
		});
	});

	describe('Research cost calculations', () => {
		it('should calculate research costs for given level', () => {
			const { getResearchCosts } = require('./research');

			const costs = getResearchCosts('energy_technology', 2);

			expect(costs).toEqual({
				metal: expect.any(Number),
				crystal: expect.any(Number),
				deuterium: expect.any(Number),
				time: expect.any(Number)
			});
		});

		it('should return increasing costs for higher levels', () => {
			const { getResearchCosts } = require('./research');

			const level1Costs = getResearchCosts('energy_technology', 1);
			const level2Costs = getResearchCosts('energy_technology', 2);

			expect(level2Costs.metal).toBeGreaterThan(level1Costs.metal);
			expect(level2Costs.time).toBeGreaterThan(level1Costs.time);
		});
	});

	describe('Research prerequisites', () => {
		it('should return prerequisites for research', () => {
			const { getResearchPrerequisites } = require('./research');

			const prereqs = getResearchPrerequisites('laser_technology');

			expect(prereqs).toEqual([
				{
					researchId: 'energy_technology',
					requiredLevel: 1
				}
			]);
		});

		it('should return empty array for research with no prerequisites', () => {
			const { getResearchPrerequisites } = require('./research');

			const prereqs = getResearchPrerequisites('energy_technology');

			expect(prereqs).toEqual([]);
		});
	});
});