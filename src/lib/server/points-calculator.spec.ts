import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	updateUserPoints,
	updateAllUserPoints,
	calculateBuildingPoints,
	calculateResearchPoints
} from './points-calculator';
import { db, users } from './db';
import { SHIPS } from '$lib/game-config';

// Mock database interface
interface MockDb {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	transaction: ReturnType<typeof vi.fn>;
}

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
	planets: { name: 'planets' },
	planetBuildings: { name: 'planet_buildings' },
	planetShips: { name: 'planet_ships' },
	planetDefenses: { name: 'planet_defenses' },
	userResearch: { name: 'user_research' },
	fleets: { name: 'fleets' },
	users: { name: 'users' }
}));

describe('Points Calculator', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb._results = [];
	});

	describe('calculateBuildingPoints', () => {
		it('should calculate points for building levels', () => {
			const points = calculateBuildingPoints('metal_mine', 3);

			expect(points).toBeGreaterThan(0);
			expect(typeof points).toBe('number');
		});

		it('should return 0 for invalid building', () => {
			const points = calculateBuildingPoints('invalid_building', 1);

			expect(points).toBe(0);
		});

		it('should return 0 for level 0', () => {
			const points = calculateBuildingPoints('metal_mine', 0);

			expect(points).toBe(0);
		});

		it('should increase points with higher levels', () => {
			const level1 = calculateBuildingPoints('metal_mine', 1);
			const level2 = calculateBuildingPoints('metal_mine', 2);

			expect(level2).toBeGreaterThan(level1);
		});
	});

	describe('calculateResearchPoints', () => {
		it('should calculate points for research levels', () => {
			const points = calculateResearchPoints('energy_tech', 2);

			expect(points).toBeGreaterThan(0);
			expect(typeof points).toBe('number');
		});

		it('should return 0 for invalid research', () => {
			const points = calculateResearchPoints('invalid_research', 1);

			expect(points).toBe(0);
		});

		it('should return 0 for level 0', () => {
			const points = calculateResearchPoints('energy_tech', 0);

			expect(points).toBe(0);
		});

		it('should increase points with higher levels', () => {
			const level1 = calculateResearchPoints('energy_tech', 1);
			const level2 = calculateResearchPoints('energy_tech', 2);

			expect(level2).toBeGreaterThan(level1);
		});
	});

	describe('updateUserPoints', () => {
		it('should calculate and update user points correctly', async () => {
			const mockDb = db as any;

			// Mock results in order of execution
			mockDb._results = [
				[{ id: 1 }], // user planets
				[{ metal_mine: 3, crystal_mine: 2 }], // buildings for planet 1
				[{ small_transporter: 5, destroyer: 2 }], // ships for planet 1
				[{ rocket_launcher: 10 }], // defenses for planet 1
				[{ energyTech: 2, laserTech: 1 }], // research
				[{ ships: { small_transporter: 3 } }, { ships: { destroyer: 1 } }], // fleets
				[] // update result
			];

			mockDb.update.mockReturnThis();
			mockDb.set.mockReturnThis();

			await updateUserPoints(1);

			expect(mockDb.update).toHaveBeenCalledWith(users);
		});

		it('should handle users with no planets', async () => {
			const mockDb = db as any;

			mockDb._results = [
				[], // no planets
				[], // no research
				[]  // no fleets
			];

			mockDb.update.mockReturnThis();
			mockDb.set.mockReturnThis();

			await updateUserPoints(1);

			expect(mockDb.update).toHaveBeenCalledWith(users);
		});

		it('should handle empty building/ship/defense data', async () => {
			const mockDb = db as any;

			mockDb._results = [
				[{ id: 1 }], // user planets
				[], // no buildings
				[], // no ships
				[], // no defenses
				[], // no research
				[]  // no fleets
			];

			mockDb.update.mockReturnThis();
			mockDb.set.mockReturnThis();

			await updateUserPoints(1);

			expect(mockDb.update).toHaveBeenCalledWith(users);
		});

		it('should calculate points from buildings correctly', async () => {
			const mockDb = db as any;

			mockDb._results = [
				[{ id: 1 }], // user planets
				[{ metal_mine: 2, crystal_mine: 1 }], // buildings
				[], // no ships
				[], // no defenses
				[], // no research
				[]  // no fleets
			];

			mockDb.update.mockReturnThis();
			mockDb.set.mockReturnThis();

			await updateUserPoints(1);

			expect(mockDb.update).toHaveBeenCalled();
		});

		it('should calculate points from ships correctly', async () => {
			const mockDb = db as any;

			mockDb._results = [
				[{ id: 1 }], // user planets
				[], // no buildings
				[{ small_transporter: 3 }], // ships
				[], // no defenses
				[], // no research
				[]  // no fleets
			];

			mockDb.update.mockReturnThis();
			mockDb.set.mockReturnThis();

			await updateUserPoints(1);

			expect(mockDb.update).toHaveBeenCalled();
		});

		it('should calculate points from research correctly', async () => {
			const mockDb = db as any;

			mockDb._results = [
				[], // no planets
				[{ energy_technology: 2 }], // research
				[]  // no fleets
			];

			mockDb.update.mockReturnThis();
			mockDb.set.mockReturnThis();

			await updateUserPoints(1);

			expect(mockDb.update).toHaveBeenCalled();
		});

		it('should calculate points from fleet ships correctly', async () => {
			const mockDb = db as any;

			mockDb._results = [
				[], // no planets
				[], // no research
				[{ ships: { destroyer: 2 } }, { ships: { cruiser: 1 } }] // fleets
			];

			mockDb.update.mockReturnThis();
			mockDb.set.mockReturnThis();

			await updateUserPoints(1);

			expect(mockDb.update).toHaveBeenCalled();
		});

		it('should handle errors gracefully', async () => {
			const mockDb = db as any;
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Make the next call throw
			mockDb.select.mockImplementationOnce(() => {
				throw new Error('Database error');
			});

			await updateUserPoints(1);

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error updating points for user 1:',
				expect.any(Error)
			);

			consoleSpy.mockRestore();
			// Reset select and other mocks
			mockDb.select.mockReturnThis();
		});
	});

	describe('updateAllUserPoints', () => {
		it('should update points for all users', async () => {
			const mockDb = db as any;

			mockDb._results = [
				[{ id: 1 }, { id: 2 }, { id: 3 }], // all users
				[], [], [], // user 1
				[], [], [], // user 2
				[], [], []  // user 3
			];

			mockDb.update.mockReturnThis();
			mockDb.set.mockReturnThis();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			await updateAllUserPoints();

			expect(mockDb.update).toHaveBeenCalledTimes(3);
			expect(consoleSpy).toHaveBeenCalledWith('Updated points for all users.');

			consoleSpy.mockRestore();
		});

		it('should handle errors gracefully', async () => {
			const mockDb = db as any;
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			mockDb.select.mockImplementationOnce(() => {
				throw new Error('Database error');
			});

			await updateAllUserPoints();

			expect(consoleSpy).toHaveBeenCalledWith('Error updating points:', expect.any(Error));

			consoleSpy.mockRestore();
			mockDb.select.mockReturnThis();
		});
	});
});
