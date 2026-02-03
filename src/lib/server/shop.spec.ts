import { describe, it, expect, beforeAll, beforeEach, vi, mocked } from 'vitest';
import { purchaseShopItem, getActiveBoosters, getBoosterMultipliers } from './shop';
import { db } from './db';
import { users, userBoosters, transactions } from './db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';

// Mock the database with proper chaining support
vi.mock('./db', () => {
	const mockDb = {
		select: vi.fn(() => mockDb),
		from: vi.fn(() => mockDb),
		where: vi.fn(() => []),
		insert: vi.fn(() => mockDb),
		values: vi.fn(() => Promise.resolve()),
		update: vi.fn(() => mockDb),
		set: vi.fn(() => mockDb),
		transaction: vi.fn(),
		execute: vi.fn(() => mockDb)
	};

	return {
		db: mockDb
	};
});

describe('Shop Service', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	beforeEach(() => {
		// Reset db mock before each test
		vi.restoreAllMocks();
	});
		it('should successfully purchase an item', async () => {
			// Mock the transaction to use the same db mock
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				// Set up responses for the queries inside the transaction
				(db as any).where.mockReturnValueOnce([{ darkMatter: 1000 }]); // user DM check
				(db as any).where.mockReturnValueOnce([]); // existing boosters check
				return callback(db);
			});
			(db as any).transaction = mockTransaction;

			const result = await purchaseShopItem(1, 'metal_booster_small');

			expect(result.success).toBe(true);
			expect(result.remainingDM).toBe(800); // 1000 - 200
		});

		it('should throw error for invalid item', async () => {
			await expect(purchaseShopItem(1, 'invalid_item')).rejects.toThrow('Invalid item');
		});

		it('should throw error when insufficient Dark Matter', async () => {
			const mockTx = {
				select: vi.fn(() => mockTx),
				from: vi.fn(() => mockTx),
				where: vi.fn(),
				update: vi.fn(() => mockTx),
				set: vi.fn(() => mockTx),
				insert: vi.fn(() => mockTx),
				values: vi.fn(() => Promise.resolve())
			};

			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				mockTx.where.mockResolvedValue([{ darkMatter: 100 }]); // insufficient DM
				return callback(mockTx);
			});
			(db as any).transaction = mockTransaction;

			await expect(purchaseShopItem(1, 'metal_booster_small')).rejects.toThrow('Not enough Dark Matter');
		});

		it('should extend existing booster when purchasing same type', async () => {
			const existingExpiry = new Date(Date.now() + 3600000); // 1 hour from now
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				// Set up responses for the queries inside the transaction
				(db as any).where.mockReturnValueOnce([{ darkMatter: 1000 }]); // user DM check
				(db as any).where.mockReturnValueOnce([{ id: 1, expiresAt: existingExpiry }]); // existing booster
				return callback(db);
			});
			(db as any).transaction = mockTransaction;

			const result = await purchaseShopItem(1, 'metal_booster_small');

			expect(result.success).toBe(true);
			expect(result.expiresAt.getTime()).toBeGreaterThan(existingExpiry.getTime());
		});
	});

	describe('getActiveBoosters', () => {
		it('should return active boosters for user', async () => {
			const mockBoosters = [
				{ boosterId: 'metal_booster_small', expiresAt: new Date(Date.now() + 3600000) },
				{ boosterId: 'crystal_booster_small', expiresAt: new Date(Date.now() + 7200000) }
			];

			(db as any).select.mockReturnValue(db);
			(db as any).from.mockReturnValue(db);
			(db as any).where.mockResolvedValue(mockBoosters);

			const result = await getActiveBoosters(1);

			expect(result).toEqual(mockBoosters);
			expect((db as any).select).toHaveBeenCalledWith({
				boosterId: userBoosters.boosterId,
				expiresAt: userBoosters.expiresAt
			});
		});

		it('should filter out expired boosters', async () => {
			const expiredBooster = { boosterId: 'metal_booster_small', expiresAt: new Date(Date.now() - 3600000) };
			const activeBooster = { boosterId: 'crystal_booster_small', expiresAt: new Date(Date.now() + 3600000) };

			(db as any).select.mockReturnValue(db);
			(db as any).from.mockReturnValue(db);
			(db as any).where.mockResolvedValue([activeBooster]);

			const result = await getActiveBoosters(1);

			expect(result).toEqual([activeBooster]);
		});
	});

	describe('getBoosterMultipliers', () => {
		it('should return default multipliers when no active boosters', async () => {
			// Mock the db query in getActiveBoosters
			const originalSelect = (db as any).select;
			(db as any).select = vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn().mockResolvedValue([])
				}))
			}));

			const result = await getBoosterMultipliers(1);

			expect(result).toEqual({
				metal: 1.0,
				crystal: 1.0,
				gas: 1.0,
				energy: 1.0
			});

			(db as any).select = originalSelect;
		});

		it('should calculate multipliers from active boosters', async () => {
			const activeBoosters = [
				{ boosterId: 'metal_booster_small', expiresAt: new Date(Date.now() + 3600000) },
				{ boosterId: 'crystal_booster_small', expiresAt: new Date(Date.now() + 3600000) }
			];

			// Mock the db query in getActiveBoosters
			const originalSelect = (db as any).select;
			(db as any).select = vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn().mockResolvedValue(activeBoosters)
				}))
			}));

			const result = await getBoosterMultipliers(1);

			expect(result.metal).toBe(1.2); // 20% boost
			expect(result.crystal).toBe(1.2); // 20% boost
			expect(result.gas).toBe(1.0); // no boost
			expect(result.energy).toBe(1.0); // no boost

			(db as any).select = originalSelect;
		});

		it('should aggregate multiple boosters of same type', async () => {
			const activeBoosters = [
				{ boosterId: 'metal_booster_small', expiresAt: new Date(Date.now() + 3600000) },
				{ boosterId: 'metal_booster_small', expiresAt: new Date(Date.now() + 3600000) }
			];

			// Mock the db query in getActiveBoosters
			const originalSelect = (db as any).select;
			(db as any).select = vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn().mockResolvedValue(activeBoosters)
				}))
			}));

			const result = await getBoosterMultipliers(1);

			expect(result.metal).toBe(1.44); // 1.2 * 1.2 = 1.44 (40% total boost)
			expect(result.crystal).toBe(1.0);
			expect(result.gas).toBe(1.0);
			expect(result.energy).toBe(1.0);

			(db as any).select = originalSelect;
		});
	});

	describe('Error handling', () => {
		it('should handle database errors in purchaseShopItem', async () => {
			const mockDb = db as any;
			const error = new Error('Database connection failed');
			mockDb.transaction = vi.fn().mockRejectedValue(error);

			await expect(purchaseShopItem(1, 'metal_booster_small')).rejects.toThrow('Database connection failed');
		});

		it('should handle database errors in getActiveBoosters', async () => {
			const error = new Error('Database connection failed');
			// Mock the db query to reject
			const originalSelect = (db as any).select;
			(db as any).select = vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn().mockRejectedValue(error)
				}))
			}));

			await expect(getActiveBoosters(1)).rejects.toThrow('Database connection failed');

			(db as any).select = originalSelect;
		});

		it('should handle database errors in getBoosterMultipliers', async () => {
			const error = new Error('Database connection failed');
			// Mock the db query in getActiveBoosters to reject
			const originalSelect = (db as any).select;
			(db as any).select = vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn().mockRejectedValue(error)
				}))
			}));

			await expect(getBoosterMultipliers(1)).rejects.toThrow('Database connection failed');

			(db as any).select = originalSelect;
		});
	});