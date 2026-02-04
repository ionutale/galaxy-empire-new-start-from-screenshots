import { describe, it, expect, beforeAll, vi } from 'vitest';
import { updateUserPoints, updateAllUserPoints, calculateBuildingPoints, calculateResearchPoints } from './points-calculator';
import { db } from './db';
import { planets, planetBuildings, planetShips, planetDefenses, userResearch, fleets, users } from './db/schema';
import { eq } from 'drizzle-orm';

// Mock the database
vi.mock('./db', async (importOriginal) => {
	const actual: any = await importOriginal();
	return {
		...actual,
		db: {
			select: vi.fn(),
			insert: vi.fn(),
			update: vi.fn(),
			execute: vi.fn(),
			delete: vi.fn(),
			transaction: vi.fn()
		}
	};
});

describe('Points Calculator', () => {
	beforeAll(() => {
		vi.clearAllMocks();
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
			const points = calculateResearchPoints('energy_technology', 2);

			expect(points).toBeGreaterThan(0);
			expect(typeof points).toBe('number');
		});

		it('should return 0 for invalid research', () => {
			const points = calculateResearchPoints('invalid_research', 1);

			expect(points).toBe(0);
		});

		it('should return 0 for level 0', () => {
			const points = calculateResearchPoints('energy_technology', 0);

			expect(points).toBe(0);
		});

		it('should increase points with higher levels', () => {
			const level1 = calculateResearchPoints('energy_technology', 1);
			const level2 = calculateResearchPoints('energy_technology', 2);

			expect(level2).toBeGreaterThan(level1);
		});
	});

	describe('updateUserPoints', () => {
		it('should calculate and update user points correctly', async () => {
			const mockDb = db as any;

			// Mock user planets
			mockDb.select
				.mockResolvedValueOnce([{ id: 1 }]) // user planets
				.mockResolvedValueOnce([{ metal_mine: 3, crystal_mine: 2 }]) // buildings
				.mockResolvedValueOnce([{ small_transporter: 5, destroyer: 2 }]) // ships
				.mockResolvedValueOnce([{ rocket_launcher: 10 }]) // defenses
				.mockResolvedValueOnce([{ energy_technology: 2, laser_technology: 1 }]) // research
				.mockResolvedValueOnce([
					{ ships: { small_transporter: 3 } },
					{ ships: { destroyer: 1 } }
				]) // fleets
				.mockResolvedValueOnce([]); // update result

			mockDb.update.mockResolvedValue({});

			await updateUserPoints(1);

			expect(mockDb.update).toHaveBeenCalledWith(users);
			const updateCall = mockDb.update.mock.calls[0];
			expect(updateCall[1].set.points).toBeGreaterThan(0);
			expect(typeof updateCall[1].set.points).toBe('number');
		});

		it('should handle users with no planets', async () => {
			const mockDb = db as any;

			mockDb.select
				.mockResolvedValueOnce([]) // no planets
				.mockResolvedValueOnce([]) // no research
				.mockResolvedValueOnce([]) // no fleets

			mockDb.update.mockResolvedValue({});

			await updateUserPoints(1);

			expect(mockDb.update).toHaveBeenCalledWith(users);
			const updateCall = mockDb.update.mock.calls[0];
			expect(updateCall[1].set.points).toBe(0);
		});

		it('should handle empty building/ship/defense data', async () => {
			const mockDb = db as any;

			mockDb.select
				.mockResolvedValueOnce([{ id: 1 }]) // user planets
				.mockResolvedValueOnce([]) // no buildings
				.mockResolvedValueOnce([]) // no ships
				.mockResolvedValueOnce([]) // no defenses
				.mockResolvedValueOnce([]) // no research
				.mockResolvedValueOnce([]); // no fleets

			mockDb.update.mockResolvedValue({});

			await updateUserPoints(1);

			expect(mockDb.update).toHaveBeenCalledWith(users);
			const updateCall = mockDb.update.mock.calls[0];
			expect(updateCall[1].set.points).toBe(0);
		});

		it('should calculate points from buildings correctly', async () => {
			const mockDb = db as any;

			mockDb.select
				.mockResolvedValueOnce([{ id: 1 }]) // user planets
				.mockResolvedValueOnce([{ metal_mine: 2, crystal_mine: 1 }]) // buildings
				.mockResolvedValueOnce([]) // no ships
				.mockResolvedValueOnce([]) // no defenses
				.mockResolvedValueOnce([]) // no research
				.mockResolvedValueOnce([]); // no fleets

			mockDb.update.mockResolvedValue({});

			await updateUserPoints(1);

			const updateCall = mockDb.update.mock.calls[0];
			const points = updateCall[1].set.points;

			const expectedBuildingPoints = calculateBuildingPoints('metal_mine', 2) + calculateBuildingPoints('crystal_mine', 1);
			expect(points).toBe(Math.floor(expectedBuildingPoints));
		});

		it('should calculate points from ships correctly', async () => {
			const mockDb = db as any;

			mockDb.select
				.mockResolvedValueOnce([{ id: 1 }]) // user planets
				.mockResolvedValueOnce([]) // no buildings
				.mockResolvedValueOnce([{ small_transporter: 3 }]) // ships
				.mockResolvedValueOnce([]) // no defenses
				.mockResolvedValueOnce([]) // no research
				.mockResolvedValueOnce([]); // no fleets

			mockDb.update.mockResolvedValue({});

			await updateUserPoints(1);

			const updateCall = mockDb.update.mock.calls[0];
			const points = updateCall[1].set.points;

			const { SHIPS } = require('$lib/game-config');
			const shipCost = SHIPS.small_transporter.cost.metal + SHIPS.small_transporter.cost.crystal + (SHIPS.small_transporter.cost.gas || 0);
			const expectedPoints = (shipCost * 3) / 1000;

			expect(points).toBe(Math.floor(expectedPoints));
		});

		it('should calculate points from research correctly', async () => {
			const mockDb = db as any;

			mockDb.select
				.mockResolvedValueOnce([]) // no planets
				.mockResolvedValueOnce([{ energy_technology: 2 }]) // research
				.mockResolvedValueOnce([]); // no fleets

			mockDb.update.mockResolvedValue({});

			await updateUserPoints(1);

			const updateCall = mockDb.update.mock.calls[0];
			const points = updateCall[1].set.points;

			const expectedResearchPoints = calculateResearchPoints('energy_technology', 2);
			expect(points).toBe(Math.floor(expectedResearchPoints));
		});

		it('should calculate points from fleet ships correctly', async () => {
			const mockDb = db as any;

			mockDb.select
				.mockResolvedValueOnce([]) // no planets
				.mockResolvedValueOnce([]) // no research
				.mockResolvedValueOnce([
					{ ships: { destroyer: 2 } },
					{ ships: { cruiser: 1 } }
				]); // fleets

			mockDb.update.mockResolvedValue({});

			await updateUserPoints(1);

			const updateCall = mockDb.update.mock.calls[0];
			const points = updateCall[1].set.points;

			const { SHIPS } = require('$lib/game-config');
			const destroyerCost = SHIPS.destroyer.cost.metal + SHIPS.destroyer.cost.crystal + (SHIPS.destroyer.cost.gas || 0);
			const cruiserCost = SHIPS.cruiser.cost.metal + SHIPS.cruiser.cost.crystal + (SHIPS.cruiser.cost.gas || 0);
			const expectedPoints = (destroyerCost * 2 + cruiserCost * 1) / 1000;

			expect(points).toBe(Math.floor(expectedPoints));
		});

		it('should handle errors gracefully', async () => {
			const mockDb = db as any;
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			mockDb.select.mockRejectedValue(new Error('Database error'));

			await updateUserPoints(1);

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error updating points for user 1:',
				expect.any(Error)
			);

			consoleSpy.mockRestore();
		});
	});

	describe('updateAllUserPoints', () => {
		it('should update points for all users', async () => {
			const mockDb = db as any;

			mockDb.select
				.mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }]) // all users
				.mockResolvedValueOnce([]) // no planets for user 1
				.mockResolvedValueOnce([]) // no research for user 1
				.mockResolvedValueOnce([]) // no fleets for user 1
				.mockResolvedValueOnce([]) // no planets for user 2
				.mockResolvedValueOnce([]) // no research for user 2
				.mockResolvedValueOnce([]) // no fleets for user 2
				.mockResolvedValueOnce([]) // no planets for user 3
				.mockResolvedValueOnce([]) // no research for user 3
				.mockResolvedValueOnce([]); // no fleets for user 3

			mockDb.update.mockResolvedValue({});
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			await updateAllUserPoints();

			expect(mockDb.update).toHaveBeenCalledTimes(3);
			expect(consoleSpy).toHaveBeenCalledWith('Updated points for all users.');

			consoleSpy.mockRestore();
		});

		it('should handle errors gracefully', async () => {
			const mockDb = db as any;
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			mockDb.select.mockRejectedValue(new Error('Database error'));

			await updateAllUserPoints();

			expect(consoleSpy).toHaveBeenCalledWith('Error updating points:', expect.any(Error));

			consoleSpy.mockRestore();
		});
	});
});