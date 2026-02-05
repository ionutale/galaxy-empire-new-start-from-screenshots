import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
	purchaseCommander,
	getActiveCommanders,
	getCommanderBonus,
	addCommanderExperience,
	getCommanderExperience
} from './commanders';
import { db } from './db';
import { users, userCommanders } from './db/schema';
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

describe('Commander Service', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	describe('purchaseCommander', () => {
		it('should successfully purchase a commander', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([{ darkMatter: 1000 }]),
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await purchaseCommander(1, 'geologist', 1);

			expect(result).toEqual({
				success: true,
				expiresAt: expect.any(Date),
				remainingDM: 950
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
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([{ darkMatter: 50 }]),
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(purchaseCommander(1, 'geologist', 1)).rejects.toThrow('Not enough Dark Matter');
		});
	});

	describe('getActiveCommanders', () => {
		it('should return active commanders for user', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			mockDb.select.mockResolvedValue([
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
			const mockDb = db as any;
			const pastDate = new Date();
			pastDate.setDate(pastDate.getDate() - 1);

			mockDb.select.mockResolvedValue([
				{
					commanderId: 'geologist',
					expiresAt: pastDate,
					level: 1,
					experience: 0,
					totalExperience: 0
				}
			]);

			const result = await getActiveCommanders(1);

			expect(result).toHaveLength(0);
		});
	});

	describe('getCommanderBonus', () => {
		it('should calculate total bonus from active commanders', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			mockDb.select.mockResolvedValue([
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

			expect(result).toBe(12); // 10 + (2-1)*2 = 12
		});

		it('should return 0 when no active commanders provide the bonus type', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([]);

			const result = await getCommanderBonus(1, 'mine_production');

			expect(result).toBe(0);
		});
	});

	describe('addCommanderExperience', () => {
		it('should add experience and level up commander', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([
						{
							level: 1,
							experience: 50,
							totalExperience: 50
						}
					]),
					update: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await addCommanderExperience(1, 'geologist', 60);

			expect(result).toEqual({
				newLevel: 2,
				leveledUp: true
			});
		});

		it('should not level up if experience is insufficient', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([
						{
							level: 1,
							experience: 50,
							totalExperience: 50
						}
					]),
					update: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await addCommanderExperience(1, 'geologist', 10);

			expect(result).toEqual({
				newLevel: 1,
				leveledUp: false
			});
		});

		it('should return undefined for non-owned commander', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([]),
					update: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await addCommanderExperience(1, 'geologist', 10);

			expect(result).toBeUndefined();
		});
	});

	describe('getCommanderExperience', () => {
		it('should return commander experience data', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([
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
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([]);

			const result = await getCommanderExperience(1, 'geologist');

			expect(result).toBeNull();
		});
	});

	describe('Experience calculation functions', () => {
		it('should calculate experience required for level', () => {
			const { getExperienceForLevel } = require('./commanders');

			expect(getExperienceForLevel(1)).toBe(100);
			expect(getExperienceForLevel(2)).toBe(400);
			expect(getExperienceForLevel(3)).toBe(900);
		});

		it('should calculate level from experience', () => {
			const { getLevelFromExperience } = require('./commanders');

			expect(getLevelFromExperience(50)).toBe(1);
			expect(getLevelFromExperience(150)).toBe(2);
			expect(getLevelFromExperience(350)).toBe(2);
			expect(getLevelFromExperience(450)).toBe(3);
		});
	});
});
