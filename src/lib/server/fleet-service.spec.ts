import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dispatchFleet } from './fleet-service';
import { db } from './db';
import { planetShips, fleets, planetResources } from './db/schema';

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
	planetShips: { name: 'planet_ships' },
	fleets: { name: 'fleets' },
	planetResources: { name: 'planet_resources' }
}));

// Mock fleet-movement module
vi.mock('./fleet-movement', () => ({
	getFleetMovementInfo: vi.fn(),
	calculateFuelConsumption: vi.fn()
}));

describe('Fleet Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb._results = [];
	});

	describe('dispatchFleet', () => {
		it('should successfully dispatch a fleet', async () => {
			const mockValidationResult = {
				rows: [
					{
						validation: {
							valid: true,
							movement_info: {
								duration: 3600,
								fuel_consumption: 50
							}
						}
					}
				]
			};

			mockDb.execute.mockResolvedValue(mockValidationResult);
			mockDb._results = [
				[], // update planetShips
				[], // update planetResources
				[]  // insert fleet
			];

			const ships = { small_transporter: 3, destroyer: 1 };
			const resources = { metal: 100, crystal: 50, gas: 25 };

			await dispatchFleet(1, 1, 1, 2, 3, 'transport', ships, resources);

			expect(mockDb.execute).toHaveBeenCalled();
			expect(mockDb.insert).toHaveBeenCalledWith(fleets);
		});

		it('should throw error when fleet validation fails', async () => {
			const mockValidationResult = {
				rows: [
					{
						validation: {
							valid: false,
							error: 'Insufficient ships'
						}
					}
				]
			};

			mockDb.execute.mockResolvedValue(mockValidationResult);

			const ships = { small_transporter: 100 };
			await expect(
				dispatchFleet(1, 1, 1, 2, 3, 'transport', ships, {})
			).rejects.toThrow('Insufficient ships');
		});

		it('should deduct ships from planet during dispatch', async () => {
			mockDb.execute.mockResolvedValue({
				rows: [{ validation: { valid: true, movement_info: { duration: 100, fuel_consumption: 10 } } }]
			});
			mockDb._results = [[], [], []];

			const ships = { small_transporter: 5 };
			await dispatchFleet(1, 1, 1, 2, 3, 'transport', ships, {});

			expect(mockDb.update).toHaveBeenCalledWith(planetShips);
		});
	});
});
