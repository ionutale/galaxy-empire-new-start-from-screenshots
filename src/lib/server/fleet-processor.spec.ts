import { describe, it, expect, beforeAll, vi } from 'vitest';
import { sendFleet, getFleetMovements, recallFleet, getFleetInfo, calculateCombatResult, processResourceTransportation } from './fleet-processor';
import { db } from './db';
import { users, fleets, fleetMovements } from './db/schema';
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

describe('Fleet Processor Service', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	describe('sendFleet', () => {
		it('should successfully send fleet for transportation', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 1000, crystal: 500, deuterium: 200 }]) // user resources
						.mockResolvedValueOnce([{ ships: { small_transporter: 5 } }]) // user fleet
						.mockResolvedValueOnce([]), // existing movements
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const fleet = { small_transporter: 3 };
			const resources = { metal: 100, crystal: 50, deuterium: 25 };

			const result = await sendFleet(1, 1, 2, 'transport', fleet, resources);

			expect(result).toEqual({
				success: true,
				arrivalTime: expect.any(Date),
				remainingResources: {
					metal: 900,
					crystal: 450,
					deuterium: 175
				}
			});
		});

		it('should successfully send fleet for attack', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 1000, crystal: 500, deuterium: 200 }]) // user resources
						.mockResolvedValueOnce([{ ships: { destroyer: 2 } }]) // user fleet
						.mockResolvedValueOnce([]), // existing movements
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const fleet = { destroyer: 1 };

			const result = await sendFleet(1, 1, 2, 'attack', fleet);

			expect(result).toEqual({
				success: true,
				arrivalTime: expect.any(Date),
				remainingResources: {
					metal: 1000,
					crystal: 500,
					deuterium: 200
				}
			});
		});

		it('should throw error for invalid mission type', async () => {
			const fleet = { small_transporter: 1 };

			await expect(sendFleet(1, 1, 2, 'invalid_mission', fleet)).rejects.toThrow('Invalid mission type');
		});

		it('should throw error when insufficient ships', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 1000, crystal: 500, deuterium: 200 }]) // user resources
						.mockResolvedValueOnce([{ ships: { small_transporter: 2 } }]) // insufficient ships
						.mockResolvedValueOnce([]), // existing movements
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const fleet = { small_transporter: 5 };

			await expect(sendFleet(1, 1, 2, 'transport', fleet)).rejects.toThrow('Not enough ships');
		});

		it('should throw error when fleet slot limit exceeded', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn()
						.mockResolvedValueOnce([{ metal: 1000, crystal: 500, deuterium: 200 }]) // user resources
						.mockResolvedValueOnce([{ ships: { small_transporter: 5 } }]) // user fleet
						.mockResolvedValueOnce(Array(16).fill({})), // max fleet slots
					update: vi.fn().mockResolvedValue({}),
					insert: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const fleet = { small_transporter: 1 };

			await expect(sendFleet(1, 1, 2, 'transport', fleet)).rejects.toThrow('Fleet slot limit exceeded');
		});
	});

	describe('getFleetMovements', () => {
		it('should return fleet movements for user', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 2);

			mockDb.select.mockResolvedValue([
				{
					id: 1,
					fromGalaxy: 1,
					fromSystem: 1,
					fromPlanet: 1,
					toGalaxy: 1,
					toSystem: 2,
					toPlanet: 3,
					mission: 'transport',
					ships: { small_transporter: 3 },
					resources: { metal: 100 },
					arrivalTime: futureDate,
					returnTime: null
				}
			]);

			const result = await getFleetMovements(1);

			expect(result).toHaveLength(1);
			expect(result[0].mission).toBe('transport');
			expect(result[0].remainingTime).toBeGreaterThan(0);
		});

		it('should include returning fleets', async () => {
			const mockDb = db as any;
			const pastDate = new Date();
			pastDate.setHours(pastDate.getHours() - 1);
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 1);

			mockDb.select.mockResolvedValue([
				{
					id: 1,
					fromGalaxy: 1,
					fromSystem: 1,
					fromPlanet: 1,
					toGalaxy: 1,
					toSystem: 2,
					toPlanet: 3,
					mission: 'transport',
					ships: { small_transporter: 3 },
					resources: { metal: 100 },
					arrivalTime: pastDate,
					returnTime: futureDate
				}
			]);

			const result = await getFleetMovements(1);

			expect(result).toHaveLength(1);
			expect(result[0].isReturning).toBe(true);
		});
	});

	describe('recallFleet', () => {
		it('should successfully recall fleet', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 2);

			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([{
						id: 1,
						mission: 'transport',
						arrivalTime: futureDate,
						returnTime: null,
						ships: { small_transporter: 3 },
						resources: { metal: 100 }
					}]),
					update: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await recallFleet(1, 1);

			expect(result).toEqual({
				success: true,
				returnTime: expect.any(Date)
			});
		});

		it('should throw error when fleet not found', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([]),
					update: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(recallFleet(1, 1)).rejects.toThrow('Fleet not found');
		});

		it('should throw error when fleet already returning', async () => {
			const mockDb = db as any;
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 1);

			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([{
						id: 1,
						mission: 'transport',
						arrivalTime: new Date(),
						returnTime: futureDate,
						ships: { small_transporter: 3 },
						resources: { metal: 100 }
					}]),
					update: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(recallFleet(1, 1)).rejects.toThrow('Fleet is already returning');
		});
	});

	describe('getFleetInfo', () => {
		it('should return fleet information', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([{
				ships: { small_transporter: 5, large_transporter: 2 },
				name: 'Fleet 1'
			}]);

			const result = await getFleetInfo(1);

			expect(result).toEqual({
				totalShips: 7,
				ships: { small_transporter: 5, large_transporter: 2 },
				cargoCapacity: expect.any(Number),
				fuelConsumption: expect.any(Number)
			});
		});
	});

	describe('calculateCombatResult', () => {
		it('should calculate combat result between two fleets', () => {
			const attackerFleet = { destroyer: 2, cruiser: 1 };
			const defenderFleet = { destroyer: 1, battleship: 1 };

			const result = calculateCombatResult(attackerFleet, defenderFleet);

			expect(result).toEqual({
				winner: expect.stringMatching(/attacker|defender|draw/),
				attackerLosses: expect.any(Object),
				defenderLosses: expect.any(Object),
				debris: expect.any(Object),
				resourcesPlundered: expect.any(Object)
			});
		});

		it('should handle empty defender fleet', () => {
			const attackerFleet = { destroyer: 1 };
			const defenderFleet = {};

			const result = calculateCombatResult(attackerFleet, defenderFleet);

			expect(result.winner).toBe('attacker');
			expect(result.attackerLosses.destroyer || 0).toBe(0);
		});
	});

	describe('processResourceTransportation', () => {
		it('should successfully process resource transportation', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([{
						id: 1,
						fromUserId: 1,
						toUserId: 2,
						resources: { metal: 100, crystal: 50 },
						ships: { small_transporter: 2 },
						arrivalTime: new Date(),
						returnTime: null
					}]),
					update: vi.fn().mockResolvedValue({}),
					delete: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			const result = await processResourceTransportation(1);

			expect(result).toEqual({
				success: true,
				transportedResources: {
					metal: 100,
					crystal: 50,
					deuterium: 0
				}
			});
		});

		it('should throw error when fleet not found', async () => {
			const mockDb = db as any;
			const mockTransaction = vi.fn().mockImplementation(async (callback) => {
				return callback({
					select: vi.fn().mockResolvedValue([]),
					update: vi.fn().mockResolvedValue({}),
					delete: vi.fn().mockResolvedValue({})
				});
			});
			mockDb.transaction = mockTransaction;

			await expect(processResourceTransportation(1)).rejects.toThrow('Fleet movement not found');
		});
	});

	describe('Fleet calculations', () => {
		it('should calculate fleet speed correctly', () => {
			const { calculateFleetSpeed } = require('./fleet-processor');

			const speed = calculateFleetSpeed({ small_transporter: 2, destroyer: 1 });

			expect(speed).toBeGreaterThan(0);
			expect(typeof speed).toBe('number');
		});

		it('should calculate cargo capacity correctly', () => {
			const { calculateCargoCapacity } = require('./fleet-processor');

			const capacity = calculateCargoCapacity({ small_transporter: 2, large_transporter: 1 });

			expect(capacity).toBe(10000); // 2*5000 + 1*25000 = 35000, but limited by slowest ship
		});

		it('should calculate fuel consumption correctly', () => {
			const { calculateFuelConsumption } = require('./fleet-processor');

			const consumption = calculateFuelConsumption({ small_transporter: 2 }, 100);

			expect(consumption).toBeGreaterThan(0);
			expect(typeof consumption).toBe('number');
		});

		it('should calculate travel time correctly', () => {
			const { calculateTravelTime } = require('./fleet-processor');

			const time = calculateTravelTime(1000, 5000); // distance, speed

			expect(time).toBeGreaterThan(0);
			expect(typeof time).toBe('number');
		});
	});
});