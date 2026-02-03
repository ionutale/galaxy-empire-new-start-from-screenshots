import { describe, it, expect, beforeAll, vi } from 'vitest';
import { purchaseShopItem, getActiveBoosters, getBoosterMultipliers } from './shop';
import { db } from './db';
import { users, userBoosters, transactions } from './db/schema';
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

describe('Shop Service', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	describe('purchaseShopItem', () => {
		it('should successfully purchase an item', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ darkMatter: 1000 }]) // user DM
						.mockResolvedValueOnce([]), // existing boosters
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await purchaseShopItem(1, 'metal_booster_small');

			expect(result.success).toBe(true);
			expect(result.remainingDM).toBe(800); // 1000 - 200
		});

		it('should throw error for invalid item', async () => {
			await expect(purchaseShopItem(1, 'invalid_item')).rejects.toThrow('Invalid item');
		});

		it('should throw error when insufficient Dark Matter', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ darkMatter: 50 }]) // user DM
						.mockResolvedValueOnce([{ id: 1, price: 100, maxQuantity: 10 }]), // shop item
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(purchaseItem(1, 'speed_booster', 1)).rejects.toThrow('Not enough Dark Matter');
		});

		it('should throw error when exceeding max quantity', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ darkMatter: 1000 }]) // user DM
						.mockResolvedValueOnce([{ id: 1, price: 100, maxQuantity: 5 }]) // shop item
						.mockResolvedValueOnce([{ quantity: 5 }]), // existing quantity
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(purchaseItem(1, 'speed_booster', 1)).rejects.toThrow('Maximum quantity exceeded');
		});
	});

	describe('getShopItems', () => {
		it('should return all shop items with user quantities', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([
				{
					id: 'speed_booster',
					name: 'Speed Booster',
					description: 'Increases fleet speed by 10%',
					price: 100,
					maxQuantity: 10,
					effectType: 'fleet_speed',
					effectValue: 10,
					duration: 3600,
					userQuantity: 2
				}
			]);

			const result = await getShopItems(1);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('speed_booster');
			expect(result[0].userQuantity).toBe(2);
		});
	});

	describe('getUserItems', () => {
		it('should return user items with remaining time', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 1);

			mockDb.select.mockResolvedValue([
				{
					itemId: 'speed_booster',
					quantity: 3,
					expiresAt: futureDate,
					name: 'Speed Booster',
					effectType: 'fleet_speed',
					effectValue: 10,
					duration: 3600
				}
			]);

			const result = await getUserItems(1);

			expect(result).toHaveLength(1);
			expect(result[0].itemId).toBe('speed_booster');
			expect(result[0].quantity).toBe(3);
			expect(result[0].remainingTime).toBeGreaterThan(0);
		});

		it('should filter out expired items', async () => {
			const mockDb = db as any;
			const pastDate = new Date();
			pastDate.setHours(pastDate.getHours() - 1);

			mockDb.select.mockResolvedValue([
				{
					itemId: 'speed_booster',
					quantity: 3,
					expiresAt: pastDate,
					name: 'Speed Booster',
					effectType: 'fleet_speed',
					effectValue: 10,
					duration: 3600
				}
			]);

			const result = await getUserItems(1);

			expect(result).toHaveLength(0);
		});
	});

	describe('useItem', () => {
		it('should successfully use an item', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([{
						quantity: 3,
						expiresAt: new Date(),
						effectType: 'fleet_speed',
						effectValue: 10,
						duration: 3600
					}]),
					update: vi.fn().mockResolvedValue({}),
					delete: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await useItem(1, 'speed_booster');

			expect(result).toEqual({
				success: true,
				effect: {
					type: 'fleet_speed',
					value: 10,
					duration: 3600
				},
				remainingQuantity: 2
			});
		});

		it('should throw error when item not owned', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([]),
					update: vi.fn().mockResolvedValue({}),
					delete: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(useItem(1, 'speed_booster')).rejects.toThrow('Item not owned or expired');
		});
	});

	describe('getItemEffects', () => {
		it('should return active item effects', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 1);

			mockDb.select.mockResolvedValue([
				{
					effectType: 'fleet_speed',
					effectValue: 10,
					expiresAt: futureDate
				},
				{
					effectType: 'resource_production',
					effectValue: 15,
					expiresAt: futureDate
				}
			]);

			const result = await getItemEffects(1);

			expect(result).toHaveLength(2);
			expect(result[0].type).toBe('fleet_speed');
			expect(result[0].value).toBe(10);
		});

		it('should filter out expired effects', async () => {
			const mockDb = db as any;
			const pastDate = new Date();
			pastDate.setHours(pastDate.getHours() - 1);

			mockDb.select.mockResolvedValue([
				{
					effectType: 'fleet_speed',
					effectValue: 10,
					expiresAt: pastDate
				}
			]);

			const result = await getItemEffects(1);

			expect(result).toHaveLength(0);
		});

		it('should aggregate effects of same type', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 1);

			mockDb.select.mockResolvedValue([
				{
					effectType: 'fleet_speed',
					effectValue: 10,
					expiresAt: futureDate
				},
				{
					effectType: 'fleet_speed',
					effectValue: 15,
					expiresAt: futureDate
				}
			]);

			const result = await getItemEffects(1);

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe('fleet_speed');
			expect(result[0].value).toBe(25); // 10 + 15
		});
	});
});