import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updatePlanetResources } from './game';
import { db } from './db';
import { planets, planetResources } from './db/schema';

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
	planetResources: { name: 'planet_resources' },
	planetBuildings: { name: 'planet_buildings' }
}));

// Mock other services
vi.mock('./commanders', () => ({
	getCommanderBonus: vi.fn().mockResolvedValue(0)
}));

vi.mock('./shop', () => ({
	getBoosterMultipliers: vi.fn().mockResolvedValue({
		metal: 1.0, crystal: 1.0, gas: 1.0, energy: 1.0
	})
}));

vi.mock('./building-service', () => ({
	BuildingService: {
		calculatePlanetStorage: vi.fn().mockResolvedValue({
			metal: 10000, crystal: 10000, gas: 10000
		})
	}
}));

describe('Game Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb._results = [];
	});

	describe('updatePlanetResources', () => {
		it('should update planet resources correctly', async () => {
			const now = new Date();
			const lastUpdate = new Date(now.getTime() - 3600000); // 1 hour ago

			mockDb._results = [
				[{ id: 1, userId: 1, lastUpdate, temperature: 20 }], // planet
				[{ metal: 1000, crystal: 500, gas: 100, energy: 200 }], // current resources
				[{ metal_mine: 20, crystal_mine: 15, gas_extractor: 10, solar_plant: 15, fusion_reactor: 0 }], // buildings
				[] // update resources
			];

			await updatePlanetResources(1);

			expect(mockDb.update).toHaveBeenCalledWith(planetResources);
			expect(mockDb.update).toHaveBeenCalledWith(planets);
		});

		it('should return null when planet not found', async () => {
			mockDb._results = [
				[] // planet not found
			];

			const result = await updatePlanetResources(999);
			expect(result).toBeNull();
		});

		it('should not update resources when less than 1 second elapsed', async () => {
			const now = new Date();
			mockDb._results = [
				[{ id: 1, lastUpdate: now }] // just updated
			];

			await updatePlanetResources(1);
			expect(mockDb.update).not.toHaveBeenCalled();
		});
	});
});
