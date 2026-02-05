import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

// Type definitions for database results
interface CombatRulesConfig {
	rounds_per_battle: number;
	attacker_loss_multiplier: number;
	defender_loss_multiplier: number;
	draw_loss_multiplier: number;
	loot_percentage: number;
	rapidfire_enabled: boolean;
}

interface ExpeditionRewardsConfig {
	resource_min: number;
	resource_max: number;
	ship_reward_chance: number;
}

interface ShipStats {
	ship_type: string;
	category: string;
	attack: number;
	defense: number;
	shield: number;
	capacity: number;
	speed: number;
}

interface CombatResult {
	winner: string;
	attackerLosses: Record<string, number>;
	defenderLosses: Record<string, number>;
}

interface CleanupSettingsConfig {
	completed_fleets_days: number;
	old_messages_days: number;
	audit_logs_days: number;
}

describe('Advanced Game Features', () => {
	beforeAll(async () => {
		// Run the test procedure to populate test results
		await db.execute(sql`CALL test_combat_simulation()`);
	});

	describe('Game Configuration', () => {
		it('should have combat rules configuration', async () => {
			// Reset to default config first
			const defaultConfig = {
				rounds_per_battle: 1,
				attacker_loss_multiplier: 0.5,
				defender_loss_multiplier: 1.0,
				draw_loss_multiplier: 0.5,
				loot_percentage: 0.5,
				rapidfire_enabled: false
			};

			await db.execute(
				sql`CALL update_game_config('combat_rules', ${JSON.stringify(defaultConfig)}::jsonb, 'Reset to default combat rules')`
			);

			const result = await db.execute(sql`SELECT get_game_config('combat_rules') as config`);
			const config = result.rows[0].config as CombatRulesConfig;

			expect(config).toBeDefined();
			expect(config.rounds_per_battle).toBe(1);
			expect(config.attacker_loss_multiplier).toBe(0.5);
			expect(config.defender_loss_multiplier).toBe(1.0);
		});

		it('should have expedition rewards configuration', async () => {
			const result = await db.execute(sql`SELECT get_game_config('expedition_rewards') as config`);
			const config = result.rows[0].config as ExpeditionRewardsConfig;

			expect(config).toBeDefined();
			expect(config.resource_min).toBe(1000);
			expect(config.resource_max).toBe(5000);
			expect(config.ship_reward_chance).toBe(0.25);
		});

		it('should allow updating game configuration', async () => {
			const newConfig = {
				rounds_per_battle: 2,
				attacker_loss_multiplier: 0.3,
				defender_loss_multiplier: 0.8,
				draw_loss_multiplier: 0.7,
				loot_percentage: 0.6,
				rapidfire_enabled: true
			};

			await db.execute(
				sql`CALL update_game_config('combat_rules', ${JSON.stringify(newConfig)}::jsonb, 'Updated combat rules')`
			);

			const result = await db.execute(sql`SELECT get_game_config('combat_rules') as config`);
			const config = result.rows[0].config as CombatRulesConfig;

			expect(config.rounds_per_battle).toBe(2);
			expect(config.attacker_loss_multiplier).toBe(0.3);
			expect(config.rapidfire_enabled).toBe(true);
		});
	});

	describe('Ship Statistics', () => {
		it('should have all ship types with correct stats', async () => {
			const result = await db.execute(
				sql`SELECT * FROM game_ship_stats WHERE category = 'ship' ORDER BY ship_type`
			);
			const ships = result.rows;

			expect(ships.length).toBeGreaterThan(10);

			const lightFighter = ships.find(
				(s: Record<string, unknown>) => s.ship_type === 'light_fighter'
			) as unknown as ShipStats;
			expect(lightFighter).toBeDefined();
			expect(lightFighter.attack).toBe(50);
			expect(lightFighter.defense).toBe(10);
			expect(lightFighter.capacity).toBe(50);
			expect(lightFighter.speed).toBe(12500);
		});

		it('should have all defense types with correct stats', async () => {
			const result = await db.execute(
				sql`SELECT * FROM game_ship_stats WHERE category = 'defense' ORDER BY ship_type`
			);
			const defenses = result.rows;

			expect(defenses.length).toBeGreaterThan(5);

			const rocketLauncher = defenses.find(
				(d: Record<string, unknown>) => d.ship_type === 'rocket_launcher'
			) as unknown as ShipStats;
			expect(rocketLauncher).toBeDefined();
			expect(rocketLauncher.attack).toBe(80);
			expect(rocketLauncher.defense).toBe(20);
			expect(rocketLauncher.shield).toBe(20);
		});
	});

	describe('Combat Simulation', () => {
		it('should simulate combat correctly', async () => {
			const result = await db.execute(sql`
        SELECT simulate_combat(
          '{"light_fighter": 100}'::jsonb,
          '{"light_fighter": 10}'::jsonb,
          '{}'::jsonb
        ) as combat_result
      `);

			const combatResult = result.rows[0].combat_result as CombatResult;
			expect(combatResult.winner).toBe('attacker');
			expect(combatResult.attackerLosses.light_fighter).toBeDefined();
			expect(combatResult.defenderLosses.light_fighter).toBeDefined();
		});

		it('should have test results in procedure_tests table', async () => {
			const result = await db.execute(
				sql`SELECT * FROM procedure_tests WHERE procedure_name = 'simulate_combat'`
			);
			const tests = result.rows;

			expect(tests.length).toBeGreaterThan(0);
			expect(tests.some((t) => t.passed)).toBe(true);
		});
	});

	describe('Performance Monitoring', () => {
		it('should have performance monitoring function', async () => {
			const result = await db.execute(sql`SELECT * FROM monitor_procedure_performance()`);
			const metrics = result.rows;

			// Should return performance data structure even if no data
			expect(Array.isArray(metrics)).toBe(true);
		});

		it('should have game tick metrics table', async () => {
			const result = await db.execute(sql`SELECT COUNT(*) as count FROM game_tick_metrics`);
			expect(result.rows[0].count).toBeDefined();
		});
	});

	describe('Cleanup Settings', () => {
		it('should have cleanup configuration', async () => {
			const result = await db.execute(sql`SELECT get_game_config('cleanup_settings') as config`);
			const config = result.rows[0].config as CleanupSettingsConfig;

			expect(config).toBeDefined();
			expect(config.completed_fleets_days).toBe(30);
			expect(config.old_messages_days).toBe(90);
			expect(config.audit_logs_days).toBe(30);
		});
	});
});
