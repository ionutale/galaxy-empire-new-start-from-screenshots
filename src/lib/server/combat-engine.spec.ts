import { describe, it, expect, beforeAll, vi } from 'vitest';
import { simulateCombat } from './combat-engine';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Mock database interface
interface MockDb {
	execute: ReturnType<typeof vi.fn>;
}

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

describe('Combat Engine', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	describe('simulateCombat', () => {
		it('should simulate combat between fleets and defenses', async () => {
			const mockDb = db as unknown as MockDb;
			const mockCombatResult = {
				winner: 'attacker',
				attackerLosses: { small_transporter: 2 },
				defenderLosses: { destroyer: 1, rocket_launcher: 5 },
				rounds: 3
			};

			mockDb.execute.mockResolvedValue({
				rows: [{ combat_result: mockCombatResult }]
			});

			const attackerFleet = { destroyer: 3, cruiser: 2 };
			const defenderFleet = { destroyer: 2, battleship: 1 };
			const defenderDefenses = { rocket_launcher: 10, light_laser: 5 };

			const result = await simulateCombat(attackerFleet, defenderFleet, defenderDefenses);

			expect(result).toEqual({
				winner: 'attacker',
				attackerLosses: { small_transporter: 2 },
				defenderLosses: { destroyer: 1, rocket_launcher: 5 },
				rounds: 3
			});

			expect(mockDb.execute).toHaveBeenCalledWith(sql`
				SELECT simulate_combat(${JSON.stringify(attackerFleet)}::jsonb, ${JSON.stringify(defenderFleet)}::jsonb, ${JSON.stringify(defenderDefenses)}::jsonb) as combat_result
			`);
		});

		it('should handle defender victory', async () => {
			const mockDb = db as unknown as MockDb;
			const mockCombatResult = {
				winner: 'defender',
				attackerLosses: { destroyer: 3, cruiser: 2 },
				defenderLosses: { destroyer: 1 },
				rounds: 2
			};

			mockDb.execute.mockResolvedValue({
				rows: [{ combat_result: mockCombatResult }]
			});

			const attackerFleet = { destroyer: 3, cruiser: 2 };
			const defenderFleet = { battleship: 2 };
			const defenderDefenses = { heavy_laser: 20 };

			const result = await simulateCombat(attackerFleet, defenderFleet, defenderDefenses);

			expect(result.winner).toBe('defender');
			expect(result.attackerLosses.destroyer).toBe(3);
			expect(result.attackerLosses.cruiser).toBe(2);
		});

		it('should handle draw', async () => {
			const mockDb = db as unknown as MockDb;
			const mockCombatResult = {
				winner: 'draw',
				attackerLosses: { destroyer: 2 },
				defenderLosses: { destroyer: 2 },
				rounds: 4
			};

			mockDb.execute.mockResolvedValue({
				rows: [{ combat_result: mockCombatResult }]
			});

			const attackerFleet = { destroyer: 2 };
			const defenderFleet = { destroyer: 2 };
			const defenderDefenses = {};

			const result = await simulateCombat(attackerFleet, defenderFleet, defenderDefenses);

			expect(result.winner).toBe('draw');
			expect(result.attackerLosses.destroyer).toBe(2);
			expect(result.defenderLosses.destroyer).toBe(2);
		});

		it('should handle empty defender forces', async () => {
			const mockDb = db as unknown as MockDb;
			const mockCombatResult = {
				winner: 'attacker',
				attackerLosses: {},
				defenderLosses: {},
				rounds: 1
			};

			mockDb.execute.mockResolvedValue({
				rows: [{ combat_result: mockCombatResult }]
			});

			const attackerFleet = { small_transporter: 5 };
			const defenderFleet = {};
			const defenderDefenses = {};

			const result = await simulateCombat(attackerFleet, defenderFleet, defenderDefenses);

			expect(result.winner).toBe('attacker');
			expect(result.attackerLosses).toEqual({});
			expect(result.defenderLosses).toEqual({});
		});

		it('should handle empty attacker fleet', async () => {
			const mockDb = db as unknown as MockDb;
			const mockCombatResult = {
				winner: 'defender',
				attackerLosses: {},
				defenderLosses: {},
				rounds: 1
			};

			mockDb.execute.mockResolvedValue({
				rows: [{ combat_result: mockCombatResult }]
			});

			const attackerFleet = {};
			const defenderFleet = { destroyer: 1 };
			const defenderDefenses = { rocket_launcher: 10 };

			const result = await simulateCombat(attackerFleet, defenderFleet, defenderDefenses);

			expect(result.winner).toBe('defender');
			expect(result.attackerLosses).toEqual({});
			expect(result.defenderLosses).toEqual({});
		});

		it('should provide default values when combat result is incomplete', async () => {
			const mockDb = db as unknown as MockDb;
			const mockCombatResult = {
				winner: 'attacker'
				// Missing losses and rounds
			};

			mockDb.execute.mockResolvedValue({
				rows: [{ combat_result: mockCombatResult }]
			});

			const attackerFleet = { destroyer: 1 };
			const defenderFleet = { destroyer: 1 };
			const defenderDefenses = {};

			const result = await simulateCombat(attackerFleet, defenderFleet, defenderDefenses);

			expect(result).toEqual({
				winner: 'attacker',
				attackerLosses: {},
				defenderLosses: {},
				rounds: 1
			});
		});

		it('should handle database errors', async () => {
			const mockDb = db as unknown as MockDb;
			const error = new Error('Database connection failed');
			mockDb.execute.mockRejectedValue(error);

			const attackerFleet = { destroyer: 1 };
			const defenderFleet = { destroyer: 1 };
			const defenderDefenses = {};

			await expect(simulateCombat(attackerFleet, defenderFleet, defenderDefenses)).rejects.toThrow(
				'Database connection failed'
			);
		});
	});
});
