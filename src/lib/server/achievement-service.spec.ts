import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { AchievementService } from './achievement-service';
import { db } from './db';
import { achievements, userAchievements, users } from './db/schema';
import { eq, sql } from 'drizzle-orm';

// Mock the database for testing
vi.mock('./db', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		execute: vi.fn(),
		delete: vi.fn()
	}
}));

describe('AchievementService', () => {
	beforeAll(async () => {
		// Initialize achievements in test database
		await AchievementService.initializeAchievements();
	});

	afterAll(async () => {
		// Clean up test data
		vi.clearAllMocks();
	});

	describe('initializeAchievements', () => {
		it('should create achievement definitions', async () => {
			const mockDb = db as any;
			mockDb.insert.mockResolvedValue({});

			await AchievementService.initializeAchievements();

			expect(mockDb.insert).toHaveBeenCalledWith(achievements);
			expect(mockDb.insert).toHaveBeenCalledTimes(AchievementService.getAllAchievements.length);
		});
	});

	describe('checkAchievementRequirement', () => {
		it('should return true for stat_value requirement when value meets threshold', () => {
			const achievement = {
				requirementType: 'stat_value',
				requirementTarget: 'battles_won',
				requirementValue: 5
			};
			const userStats = { battles_won: 10 };

			const result = (AchievementService as any).checkAchievementRequirement(
				achievement,
				userStats
			);

			expect(result).toBe(true);
		});

		it('should return false for stat_value requirement when value is below threshold', () => {
			const achievement = {
				requirementType: 'stat_value',
				requirementTarget: 'battles_won',
				requirementValue: 5
			};
			const userStats = { battles_won: 3 };

			const result = (AchievementService as any).checkAchievementRequirement(
				achievement,
				userStats
			);

			expect(result).toBe(false);
		});

		it('should return true for boolean_flag requirement when condition is met', () => {
			const achievement = {
				requirementType: 'boolean_flag',
				requirementTarget: 'in_alliance',
				requirementValue: 1
			};
			const userStats = { in_alliance: 1 };

			const result = (AchievementService as any).checkAchievementRequirement(
				achievement,
				userStats
			);

			expect(result).toBe(true);
		});
	});

	describe('getCurrentProgress', () => {
		it('should return current stat value for progress tracking', () => {
			const achievement = {
				requirementTarget: 'metal_mine_level'
			};
			const userStats = { metal_mine_level: 15 };

			const result = (AchievementService as any).getCurrentProgress(achievement, userStats);

			expect(result).toBe(15);
		});

		it('should return 0 for missing stat', () => {
			const achievement = {
				requirementTarget: 'unknown_stat'
			};
			const userStats = { metal_mine_level: 15 };

			const result = (AchievementService as any).getCurrentProgress(achievement, userStats);

			expect(result).toBe(0);
		});
	});

	describe('grantReward', () => {
		it('should grant dark matter reward', async () => {
			const mockDb = db as any;
			mockDb.update.mockResolvedValue({});

			await (AchievementService as any).grantReward(1, 'dark_matter', 100);

			expect(mockDb.update).toHaveBeenCalledWith(
				users,
				{
					darkMatter: sql`${users.darkMatter} + ${100}`
				},
				{
					where: eq(users.id, 1)
				}
			);
		});
	});

	describe('getUserStatsForAchievements', () => {
		it('should return basic user stats', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([
				{
					darkMatter: 500,
					points: 1000
				}
			]);

			const result = await AchievementService.getUserStatsForAchievements(1);

			expect(result).toEqual({
				dark_matter_spent: 0,
				battles_won: 0,
				ships_destroyed: 0,
				metal_total: 0,
				planets_owned: 1,
				research_completed: 0,
				messages_sent: 0,
				in_alliance: 0,
				metal_mine_level: 0,
				solar_plant_count: 0
			});
		});

		it('should return empty object for non-existent user', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([]);

			const result = await AchievementService.getUserStatsForAchievements(999);

			expect(result).toEqual({});
		});
	});

	describe('checkAchievements', () => {
		it('should award newly unlocked achievements', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([]); // No existing achievements
			mockDb.insert.mockResolvedValue({});
			mockDb.update.mockResolvedValue({});

			const userStats = { battles_won: 1 };
			const result = await AchievementService.checkAchievements(1, userStats);

			expect(result.length).toBeGreaterThan(0);
			expect(mockDb.insert).toHaveBeenCalled();
		});

		it('should not award already unlocked achievements', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([
				{
					achievementId: 1,
					isCompleted: true
				}
			]);
			mockDb.insert.mockResolvedValue({});

			const userStats = { battles_won: 1 };
			const result = await AchievementService.checkAchievements(1, userStats);

			expect(result.length).toBe(0);
		});
	});

	describe('getUserAchievements', () => {
		it('should return user achievements with details', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([
				{
					id: 1,
					userId: 1,
					achievementId: 1,
					unlockedAt: new Date(),
					progress: 5,
					isCompleted: false,
					achievement: {
						id: 1,
						name: 'Test Achievement',
						description: 'Test description',
						category: 'test',
						icon: '🏆',
						rewardType: 'dark_matter',
						rewardAmount: 100
					}
				}
			]);

			const result = await AchievementService.getUserAchievements(1);

			expect(result).toHaveLength(1);
			expect(result[0].achievement?.name).toBe('Test Achievement');
		});
	});

	describe('getAllAchievements', () => {
		it('should return all achievement definitions', async () => {
			const mockDb = db as any;
			mockDb.select.mockResolvedValue([
				{ id: 1, name: 'Achievement 1' },
				{ id: 2, name: 'Achievement 2' }
			]);

			const result = await AchievementService.getAllAchievements();

			expect(result).toHaveLength(2);
		});
	});
});
