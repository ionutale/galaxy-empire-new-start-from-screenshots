import { describe, it, expect, beforeEach, vi } from 'vitest';
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
import { users, userCommanders } from './db/schema';

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
	users: { name: 'users', darkMatter: 'darkMatter' },
	userCommanders: { name: 'user_commanders' }
}));

describe('Commander Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb._results = [];
	});

	describe('purchaseCommander', () => {
		it('should successfully purchase a commander', async () => {
			mockDb._results = [
				[{ darkMatter: 1000 }], // check user DM
				[], // update DM
				[], // insert transaction
				[]  // insert userCommander
			];

			const result = await purchaseCommander(1, 'geologist', 1);

			expect(result.success).toBe(true);
			expect(result.remainingDM).toBe(900);
			expect(mockDb.update).toHaveBeenCalledWith(users);
		});

		it('should throw error when insufficient Dark Matter', async () => {
			mockDb._results = [
				[{ darkMatter: 50 }] // only 50 DM, cost is 100
			];

			await expect(purchaseCommander(1, 'geologist', 1)).rejects.toThrow('Not enough Dark Matter');
		});
	});

	describe('getActiveCommanders', () => {
		it('should return active commanders for user', async () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			mockDb._results = [
				[
					{
						commanderId: 'geologist',
						expiresAt: futureDate,
						level: 1,
						experience: 0
					}
				]
			];

			const result = await getActiveCommanders(1);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('geologist');
		});
	});

	describe('getCommanderBonus', () => {
		it('should calculate total bonus from active commanders', async () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			mockDb._results = [
				[
					{
						commanderId: 'geologist',
						expiresAt: futureDate,
						level: 1, // 10% base bonus
						experience: 0
					}
				]
			];

			const bonus = await getCommanderBonus(1, 'mine_production');

			expect(bonus).toBe(10);
		});
	});

	describe('getExperienceForLevel', () => {
		it('should calculate experience correctly', () => {
			expect(getExperienceForLevel(1)).toBe(0);
			expect(getExperienceForLevel(2)).toBe(100);
			expect(getExperienceForLevel(3)).toBe(300);
		});
	});

	describe('getLevelFromExperience', () => {
		it('should calculate level correctly', () => {
			expect(getLevelFromExperience(0)).toBe(1);
			expect(getLevelFromExperience(100)).toBe(2);
			expect(getLevelFromExperience(299)).toBe(2);
			expect(getLevelFromExperience(300)).toBe(3);
		});
	});
});
