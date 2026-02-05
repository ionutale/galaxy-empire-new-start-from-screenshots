import { describe, it, expect, beforeAll, vi } from 'vitest';
import { updatePlanetResources } from './game';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Mock the database
interface MockDb {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	execute: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	transaction: ReturnType<typeof vi.fn>;
}

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

// Mock other services
const mockCommanderBonus = vi.fn().mockReturnValue(10);
const mockBoosterMultipliers = vi.fn().mockReturnValue({
	metal: 1.0,
	crystal: 1.0,
	gas: 1.0,
	energy: 1.0
});
const mockStorageCapacity = vi.fn().mockReturnValue({
	metal: 10000,
	crystal: 10000,
	gas: 10000
});

vi.mock('./commanders', () => ({
	getCommanderBonus: mockCommanderBonus
}));

vi.mock('./shop', () => ({
	getBoosterMultipliers: mockBoosterMultipliers
}));

vi.mock('./building-service', () => ({
	BuildingService: {
		calculatePlanetStorage: mockStorageCapacity
	}
}));

describe('Game Service', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	describe('updatePlanetResources', () => {
		it('should update planet resources based on production and time elapsed', async () => {
			const mockDb = db as unknown as MockDb;
			const mockCommanderBonus = vi.fn().mockResolvedValue(10); // 10% bonus
			const mockBoosterMultipliers = vi.fn().mockResolvedValue({
				metal: 1.0,
				crystal: 1.0,
				gas: 1.0,
				energy: 1.0
			});
			const mockStorageCapacity = vi.fn().mockResolvedValue({
				metal: 10000,
				crystal: 10000,
				gas: 10000
			});

			const mockData = {
				metal: 1000,
				crystal: 500,
				gas: 200,
				energy: 100,
				lastUpdate: new Date(Date.now() - 3600000), // 1 hour ago
				metalMine: 5,
				crystalMine: 4,
				gasExtractor: 3,
				solarPlant: 6,
				userId: 1,
				secondsElapsed: 3600
			};

			mockDb.transaction.mockImplementation(async (callback: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
				return callback({
					select: vi.fn().mockResolvedValue([mockData]),
					update: vi.fn().mockResolvedValue({})
				});
			});

			const result = await updatePlanetResources(1);

			expect(result).not.toBeNull();
			expect(result!.metal).toBeGreaterThan(1000);
			expect(result!.crystal).toBeGreaterThan(500);
			expect(result!.gas).toBeGreaterThan(200);
			expect(typeof result!.energy).toBe('number');

			expect(mockCommanderBonus).toHaveBeenCalledWith(1, 'mine_production');
			expect(mockCommanderBonus).toHaveBeenCalledWith(1, 'energy_production');
			expect(mockBoosterMultipliers).toHaveBeenCalledWith(1);
			expect(mockStorageCapacity).toHaveBeenCalledWith(1);
		});

		it('should return null when planet not found', async () => {
			const mockDb = db as unknown as MockDb;

			mockDb.transaction.mockImplementation(async (callback: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
				return callback({
					select: vi.fn().mockResolvedValue([]),
					update: vi.fn().mockResolvedValue({})
				});
			});

			const result = await updatePlanetResources(1);

			expect(result).toBeNull();
		});

		it('should not update resources when less than 1 second elapsed', async () => {
			const mockDb = db as unknown as MockDb;
			const mockData = {
				metal: 1000,
				crystal: 500,
				gas: 200,
				energy: 100,
				lastUpdate: new Date(),
				metalMine: 5,
				crystalMine: 4,
				gasExtractor: 3,
				solarPlant: 6,
				userId: 1,
				secondsElapsed: 0.5
			};

			mockDb.transaction.mockImplementation(async (callback: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
				return callback({
					select: vi.fn().mockResolvedValue([mockData]),
					update: vi.fn().mockResolvedValue({})
				});
			});

			const result = await updatePlanetResources(1);

			expect(result).toEqual(mockData);
		});

		it('should apply commander bonuses to production', async () => {
			const mockDb = db as unknown as MockDb;
			const mockCommanderBonus = vi
				.fn()
				.mockResolvedValueOnce(20) // mine bonus
				.mockResolvedValueOnce(15); // energy bonus

			const mockData = {
				metal: 1000,
				crystal: 500,
				gas: 200,
				energy: 100,
				lastUpdate: new Date(Date.now() - 3600000), // 1 hour ago
				metalMine: 1,
				crystalMine: 1,
				gasExtractor: 1,
				solarPlant: 1,
				userId: 1,
				secondsElapsed: 3600
			};

			mockDb.transaction.mockImplementation(async (callback: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
				return callback({
					select: vi.fn().mockResolvedValue([mockData]),
					update: vi.fn().mockResolvedValue({})
				});
			});

			await updatePlanetResources(1);

			expect(mockCommanderBonus).toHaveBeenCalledWith(1, 'mine_production');
			expect(mockCommanderBonus).toHaveBeenCalledWith(1, 'energy_production');
		});

		it('should apply booster multipliers to production', async () => {
			const mockDb = db as unknown as MockDb;
			const mockBoosterMultipliers = vi.fn().mockResolvedValue({
				metal: 1.5,
				crystal: 1.2,
				gas: 1.8,
				energy: 1.3
			});

			const mockData = {
				metal: 1000,
				crystal: 500,
				gas: 200,
				energy: 100,
				lastUpdate: new Date(Date.now() - 3600000), // 1 hour ago
				metalMine: 1,
				crystalMine: 1,
				gasExtractor: 1,
				solarPlant: 1,
				userId: 1,
				secondsElapsed: 3600
			};

			mockDb.transaction.mockImplementation(async (callback: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
				return callback({
					select: vi.fn().mockResolvedValue([mockData]),
					update: vi.fn().mockResolvedValue({})
				});
			});

			await updatePlanetResources(1);

			expect(mockBoosterMultipliers).toHaveBeenCalledWith(1);
		});

		it('should cap resources to storage capacity', async () => {
			const mockDb = db as unknown as MockDb;
			const mockStorageCapacity = vi.fn().mockResolvedValue({
				metal: 1500, // Low capacity
				crystal: 10000,
				gas: 10000
			});

			const mockData = {
				metal: 1400,
				crystal: 500,
				gas: 200,
				energy: 100,
				lastUpdate: new Date(Date.now() - 3600000), // 1 hour ago
				metalMine: 10,
				crystalMine: 1,
				gasExtractor: 1,
				solarPlant: 1,
				userId: 1,
				secondsElapsed: 3600
			};

			mockDb.transaction.mockImplementation(async (callback: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
				return callback({
					select: vi.fn().mockResolvedValue([mockData]),
					update: vi.fn().mockResolvedValue({})
				});
			});

			const result = await updatePlanetResources(1);

			expect(result!.metal).toBeLessThanOrEqual(1500);
			expect(mockStorageCapacity).toHaveBeenCalledWith(1);
		});

		it('should reduce production when energy is negative', async () => {
			const mockDb = db as unknown as MockDb;

			const mockData = {
				metal: 1000,
				crystal: 500,
				gas: 200,
				energy: 100,
				lastUpdate: new Date(Date.now() - 3600000), // 1 hour ago
				metalMine: 20, // High energy consumption
				crystalMine: 20,
				gasExtractor: 20,
				solarPlant: 1, // Low energy production
				userId: 1,
				secondsElapsed: 3600
			};

			mockDb.transaction.mockImplementation(async (callback: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
				return callback({
					select: vi.fn().mockResolvedValue([mockData]),
					update: vi.fn().mockResolvedValue({})
				});
			});

			const result = await updatePlanetResources(1);

			// With negative energy, production should be reduced
			expect(result!.energy).toBeLessThan(0);
			// Production should still occur but at reduced rate
			expect(result!.metal).toBeGreaterThan(1000);
		});

		it('should update the lastUpdate timestamp', async () => {
			const mockDb = db as unknown as MockDb;

			const mockData = {
				metal: 1000,
				crystal: 500,
				gas: 200,
				energy: 100,
				lastUpdate: new Date(Date.now() - 3600000),
				metalMine: 1,
				crystalMine: 1,
				gasExtractor: 1,
				solarPlant: 1,
				userId: 1,
				secondsElapsed: 3600
			};

			let updateCall: any; // eslint-disable-line @typescript-eslint/no-explicit-any
			mockDb.transaction.mockImplementation(async (callback: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
				return callback({
					select: vi.fn().mockResolvedValue([mockData]),
					update: vi.fn().mockImplementation((...args) => {
						updateCall = args;
						return {};
					})
				});
			});

			await updatePlanetResources(1);

			expect(updateCall[1].set.lastUpdate).toEqual(sql`NOW()`);
		});
	});
});
