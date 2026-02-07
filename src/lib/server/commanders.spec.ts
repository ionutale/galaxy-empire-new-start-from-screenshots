import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
	purchaseCommander,
	getActiveCommanders,
	getCommanderBonus,
	addCommanderExperience,
	getCommanderExperience,
	getExperienceForLevel,
	getLevelFromExperience
} from './commanders';
import { db } from './db';

// Mock database interface
interface MockDb {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	transaction: ReturnType<typeof vi.fn>;
}

// Mock the database with proper chaining support
vi.mock('./db', () => {
	const mockQuery = {
		from: vi.fn(() => mockQuery),
		where: vi.fn(),
		values: vi.fn(() => Promise.resolve()),
		set: vi.fn(() => mockQuery),
		limit: vi.fn(() => mockQuery)
	};
	
	const mockDb = {
		select: vi.fn(() => mockQuery),
		insert: vi.fn(() => mockQuery),
		update: vi.fn(() => mockQuery),
		transaction: vi.fn()
	};

	// Expose mockQuery for tests
	(mockDb as any).__mockQuery = mockQuery;

	return {
		db: mockDb,
		users: { id: { name: 'id' } },
		userCommanders: { id: { name: 'id' } }
	};
});

// Mock drizzle-orm functions
vi.mock('drizzle-orm', () => ({
	eq: vi.fn(),
	and: vi.fn(),
	gt: vi.fn()
}));

describe('Commander Service', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	describe('purchaseCommander', () => {
		it('should successfully purchase a commander', async () => {
			const mockDb = db as unknown as MockDb;
			
			// Mock the transaction to call the callback with a mock tx
			const mockQuery = {
				from: vi.fn(() => mockQuery),
				where: vi.fn(),
				values: vi.fn(() => Promise.resolve()),
				set: vi.fn(() => mockQuery),
				limit: vi.fn(() => mockQuery)
			};
			
			const mockTx = {
				select: vi.fn(() => mockQuery),
				insert: vi.fn(() => mockQuery),
				update: vi.fn(() => mockQuery)
			};
			
			// Set up the where mocks for this test
			let whereCallCount = 0;
			mockQuery.where.mockImplementation(() => {
				whereCallCount++;
				if (whereCallCount === 1) {
					return Promise.resolve([{ darkMatter: 1000 }]); // users query
				} else if (whereCallCount === 2) {
					return Promise.resolve([]); // userCommanders query
				}
				return Promise.resolve([]);
			});
			
			mockDb.transaction.mockImplementation(async (callback) => {
				return callback(mockTx);
			});

			const result = await purchaseCommander(1, 'geologist', 1);

			expect(result).toEqual({
				success: true,
				expiresAt: expect.any(Date),
				remainingDM: 900
			});
		});

		it('should throw error for invalid commander', async () => {
			await expect(purchaseCommander(1, 'invalid_commander', 1)).rejects.toThrow(
				'Invalid commander'
			);
		});

		it('should throw error for invalid duration', async () => {
			await expect(purchaseCommander(1, 'geologist', 99)).rejects.toThrow('Invalid duration');
		});

		it('should throw error when insufficient Dark Matter', async () => {
			const mockDb = db as unknown as MockDb;
			
			const mockQuery = {
				from: vi.fn(() => mockQuery),
				where: vi.fn()
			};
			
			const mockTx = {
				select: vi.fn(() => mockQuery)
			};
			
			mockQuery.where.mockResolvedValue([{ darkMatter: 50 }]);
			
			mockDb.transaction.mockImplementation(async (callback) => {
				return callback(mockTx);
			});

			await expect(purchaseCommander(1, 'geologist', 1)).rejects.toThrow('Not enough Dark Matter');
		});
	});

	describe('getActiveCommanders', () => {
		it('should return active commanders for user', async () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			// Access the mock query
			const mockQuery = (db as any).__mockQuery;
			mockQuery.where.mockResolvedValue([
				{
					commanderId: 'geologist',
					expiresAt: futureDate,
					level: 1,
					experience: 0,
					totalExperience: 0
				}
			]);

			const result = await getActiveCommanders(1);

			expect(result).toHaveLength(1);
			expect(result[0].commanderId).toBe('geologist');
		});

		it('should filter out expired commanders', async () => {
			const mockQuery = (db as any).__mockQuery;
			mockQuery.where.mockResolvedValue([]);

			const result = await getActiveCommanders(1);

			expect(result).toHaveLength(0);
		});
	});

	describe('getCommanderBonus', () => {
		it('should calculate total bonus from active commanders', async () => {
			const mockQuery = (db as any).__mockQuery;
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			mockQuery.where.mockResolvedValue([
				{
					commanderId: 'geologist',
					expiresAt: futureDate,
					level: 1,
					experience: 0,
					totalExperience: 0
				},
				{
					commanderId: 'admiral',
					expiresAt: futureDate,
					level: 2,
					experience: 0,
					totalExperience: 100
				}
			]);

			const result = await getCommanderBonus(1, 'mine_production');

			expect(result).toBe(10); // 10 + (1-1)*2 = 10 (only geologist, admiral is fleet_speed)
		});

		it('should return 0 when no active commanders provide the bonus type', async () => {
			const mockQuery = (db as any).__mockQuery;
			mockQuery.where.mockResolvedValue([]);

			const result = await getCommanderBonus(1, 'mine_production');

			expect(result).toBe(0);
		});
	});

	describe('addCommanderExperience', () => {
		it('should add experience and level up commander', async () => {
			const mockDb = db as unknown as MockDb;
			
			const mockQuery = {
				from: vi.fn(() => mockQuery),
				where: vi.fn(),
				set: vi.fn(() => mockQuery)
			};
			
			const mockTx = {
				select: vi.fn(() => mockQuery),
				update: vi.fn(() => mockQuery)
			};
			
			mockQuery.where.mockResolvedValue([
				{
					level: 1,
					experience: 50,
					totalExperience: 50
				}
			]);
			
			mockDb.transaction.mockImplementation(async (callback) => {
				return callback(mockTx);
			});

			const result = await addCommanderExperience(1, 'geologist', 60);

			expect(result).toEqual({
				newLevel: 2,
				leveledUp: true
			});
		});

		it('should not level up if experience is insufficient', async () => {
			const mockDb = db as unknown as MockDb;
			
			const mockQuery = {
				from: vi.fn(() => mockQuery),
				where: vi.fn(),
				set: vi.fn(() => mockQuery)
			};
			
			const mockTx = {
				select: vi.fn(() => mockQuery),
				update: vi.fn(() => mockQuery)
			};
			
			mockQuery.where.mockResolvedValue([
				{
					level: 1,
					experience: 50,
					totalExperience: 50
				}
			]);
			
			mockDb.transaction.mockImplementation(async (callback) => {
				return callback(mockTx);
			});

			const result = await addCommanderExperience(1, 'geologist', 10);

			expect(result).toEqual({
				newLevel: 1,
				leveledUp: false
			});
		});

		it('should return undefined for non-owned commander', async () => {
			const mockDb = db as unknown as MockDb;
			
			const mockQuery = {
				from: vi.fn(() => mockQuery),
				where: vi.fn()
			};
			
			const mockTx = {
				select: vi.fn(() => mockQuery)
			};
			
			mockQuery.where.mockResolvedValue([]);
			
			mockDb.transaction.mockImplementation(async (callback) => {
				return callback(mockTx);
			});

			const result = await addCommanderExperience(1, 'geologist', 10);

			expect(result).toBeUndefined();
		});
	});

	describe('getCommanderExperience', () => {
		it('should return commander experience data', async () => {
			const mockQuery = (db as any).__mockQuery;
			mockQuery.where.mockResolvedValue([
				{
					level: 2,
					experience: 50,
					totalExperience: 150
				}
			]);

			const result = await getCommanderExperience(1, 'geologist');

			expect(result).toEqual({
				level: 2,
				experience: 50,
				totalExperience: 150,
				experienceToNext: 50, // 200 - 150 = 50
				maxLevel: 20
			});
		});

		it('should return null for non-owned commander', async () => {
			const mockQuery = (db as any).__mockQuery;
			mockQuery.where.mockResolvedValue([]);

			const result = await getCommanderExperience(1, 'geologist');

			expect(result).toBeNull();
		});
	});

	describe('Experience calculation functions', () => {
		it('should calculate experience required for level', () => {
			expect(getExperienceForLevel(1)).toBe(100);
			expect(getExperienceForLevel(2)).toBe(400);
			expect(getExperienceForLevel(3)).toBe(900);
		});

		it('should calculate level from experience', () => {
			expect(getLevelFromExperience(50)).toBe(1);
			expect(getLevelFromExperience(150)).toBe(2);
			expect(getLevelFromExperience(350)).toBe(2);
			expect(getLevelFromExperience(450)).toBe(3);
		});
	});
});
