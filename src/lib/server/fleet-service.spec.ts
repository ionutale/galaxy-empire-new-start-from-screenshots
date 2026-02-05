import { describe, it, expect, beforeAll, vi } from 'vitest';
import { dispatchFleet } from './fleet-service';
import { db } from './db';
import { planetShips, fleets, planetResources, userResearch, planets } from './db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';

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

// Mock fleet-movement module
vi.mock('./fleet-movement', () => ({
	getFleetMovementInfo: vi.fn(),
	calculateFuelConsumption: vi.fn()
}));

describe('Fleet Service', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	describe('dispatchFleet', () => {
		it('should successfully dispatch a fleet', async () => {
			const mockDb = db as any;
			const mockValidationResult = {
				rows: [
					{
						validation: {
							valid: true,
							movement_info: {
								duration: 3600, // 1 hour
								fuel_consumption: 50
							}
						}
					}
				]
			};

			mockDb.execute.mockResolvedValue(mockValidationResult);

			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const ships = { small_transporter: 3, destroyer: 1 };
			const resources = { metal: 100, crystal: 50, gas: 25 };

			await dispatchFleet(1, 1, 1, 2, 3, 'transport', ships, resources);

			expect(mockDb.execute).toHaveBeenCalledWith(sql`
				SELECT validate_fleet_dispatch(
					${1}, ${1}, ${JSON.stringify(ships)}::jsonb, ${'transport'},
					${1}, ${2}, ${3}, ${JSON.stringify(resources)}::jsonb
				) as validation
			`);

			expect(mockTransaction).toHaveBeenCalled();
		});

		it('should throw error when fleet validation fails', async () => {
			const mockDb = db as any;
			const mockValidationResult = {
				rows: [
					{
						validation: {
							valid: false,
							error: 'Not enough ships available'
						}
					}
				]
			};

			mockDb.execute.mockResolvedValue(mockValidationResult);

			const ships = { small_transporter: 100 };
			const resources = { metal: 0, crystal: 0, gas: 0 };

			await expect(dispatchFleet(1, 1, 1, 2, 3, 'transport', ships, resources)).rejects.toThrow(
				'Not enough ships available'
			);
		});

		it('should deduct ships from planet during dispatch', async () => {
			const mockDb = db as any;
			const mockValidationResult = {
				rows: [
					{
						validation: {
							valid: true,
							movement_info: {
								duration: 1800,
								fuel_consumption: 25
							}
						}
					}
				]
			};

			mockDb.execute.mockResolvedValue(mockValidationResult);

			const updateCalls: any[] = [];
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					update: vi.fn().mockImplementation((...args) => {
						updateCalls.push(args);
						return {};
					}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const ships = { small_transporter: 2, destroyer: 1 };
			const resources = { metal: 50, crystal: 25, gas: 10 };

			await dispatchFleet(1, 1, 1, 2, 3, 'attack', ships, resources);

			// Should have 3 update calls: 2 for ships, 1 for resources
			expect(updateCalls).toHaveLength(3);

			// Check ship deductions
			const shipUpdates = updateCalls.slice(0, 2);
			expect(
				shipUpdates.some(
					(call) =>
						call[0] === planetShips &&
						call[1].set.smallCargo === sql`${planetShips.smallCargo} - ${2}`
				)
			).toBe(true);

			expect(
				shipUpdates.some(
					(call) =>
						call[0] === planetShips &&
						call[1].set.destroyer === sql`${planetShips.destroyer} - ${1}`
				)
			).toBe(true);
		});

		it('should deduct resources and fuel from planet', async () => {
			const mockDb = db as any;
			const mockValidationResult = {
				rows: [
					{
						validation: {
							valid: true,
							movement_info: {
								duration: 2400,
								fuel_consumption: 75
							}
						}
					}
				]
			};

			mockDb.execute.mockResolvedValue(mockValidationResult);

			const updateCalls: any[] = [];
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					update: vi.fn().mockImplementation((...args) => {
						updateCalls.push(args);
						return {};
					}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const ships = { small_transporter: 1 };
			const resources = { metal: 100, crystal: 50, gas: 25 };

			await dispatchFleet(1, 1, 1, 2, 3, 'transport', ships, resources);

			// Find the resource update call
			const resourceUpdate = updateCalls.find((call) => call[0] === planetResources);
			expect(resourceUpdate).toBeDefined();
			expect(resourceUpdate[1].set).toEqual({
				metal: sql`${planetResources.metal} - ${100}`,
				crystal: sql`${planetResources.crystal} - ${50}`,
				gas: sql`${planetResources.gas} - ${25 + 75}` // resources.gas + fuel
			});
		});

		it('should create fleet record with correct data', async () => {
			const mockDb = db as any;
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

			let insertCall: any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockImplementation((...args) => {
						insertCall = args;
						return {};
					})
				});
			});
			mockDb.transaction = mockTransaction;

			const ships = { destroyer: 2 };
			const resources = { metal: 200, crystal: 100, gas: 50 };

			await dispatchFleet(1, 1, 1, 2, 3, 'attack', ships, resources);

			expect(insertCall[0]).toBe(fleets);
			expect(insertCall[1].values).toEqual({
				userId: 1,
				originPlanetId: 1,
				targetGalaxy: 1,
				targetSystem: 2,
				targetPlanet: 3,
				mission: 'attack',
				ships: ships,
				resources: resources,
				arrivalTime: expect.any(Date),
				status: 'active'
			});
		});

		it('should calculate correct arrival time', async () => {
			const mockDb = db as any;
			const mockValidationResult = {
				rows: [
					{
						validation: {
							valid: true,
							movement_info: {
								duration: 7200, // 2 hours
								fuel_consumption: 100
							}
						}
					}
				]
			};

			mockDb.execute.mockResolvedValue(mockValidationResult);

			let insertCall: any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockImplementation((...args) => {
						insertCall = args;
						return {};
					})
				});
			});
			mockDb.transaction = mockTransaction;

			const beforeTime = Date.now();
			const ships = { small_transporter: 1 };
			const resources = { metal: 0, crystal: 0, gas: 0 };

			await dispatchFleet(1, 1, 1, 2, 3, 'transport', ships, resources);

			const afterTime = Date.now();
			const arrivalTime = insertCall[1].values.arrivalTime.getTime();

			// Arrival time should be current time + duration (7200 seconds = 2 hours)
			expect(arrivalTime).toBeGreaterThanOrEqual(beforeTime + 7200000);
			expect(arrivalTime).toBeLessThanOrEqual(afterTime + 7200000);
		});
	});
});
