import { db } from './db';
import { achievements, userAchievements, users } from './db/schema';
import { eq, sql } from 'drizzle-orm';

export interface AchievementDefinition {
	id: number;
	code: string;
	name: string;
	description: string;
	category: string;
	icon: string;
	rewardType: string | null;
	rewardAmount: number | null;
	requirementType: string;
	requirementTarget: string;
	requirementValue: number | null;
	isHidden: boolean | null;
	sortOrder: number | null;
	createdAt: Date | null;
}

export interface UserAchievement {
	id: number;
	userId: number | null;
	achievementId: number | null;
	unlockedAt: Date | null;
	progress: number | null;
	isCompleted: boolean | null;
	achievement?: AchievementDefinition;
}

// Predefined achievements
export const ACHIEVEMENT_DEFINITIONS = [
	// Building Achievements
	{
		code: 'first_mine',
		name: 'First Steps',
		description: 'Build your first Metal Mine',
		category: 'building',
		icon: '🏭',
		rewardType: 'dark_matter',
		rewardAmount: 50,
		requirementType: 'stat_value',
		requirementTarget: 'metal_mine_level',
		requirementValue: 1,
		isHidden: false,
		sortOrder: 1
	},
	{
		code: 'industrial_giant',
		name: 'Industrial Giant',
		description: 'Reach Metal Mine level 20',
		category: 'building',
		icon: '🏭',
		rewardType: 'dark_matter',
		rewardAmount: 500,
		requirementType: 'stat_value',
		requirementTarget: 'metal_mine_level',
		requirementValue: 20,
		isHidden: false,
		sortOrder: 2
	},
	{
		code: 'power_house',
		name: 'Power House',
		description: 'Build 10 Solar Power Plants',
		category: 'building',
		icon: '☀️',
		rewardType: 'dark_matter',
		rewardAmount: 200,
		requirementType: 'stat_value',
		requirementTarget: 'solar_plant_count',
		requirementValue: 10,
		isHidden: false,
		sortOrder: 3
	},

	// Combat Achievements
	{
		code: 'first_battle',
		name: 'First Blood',
		description: 'Win your first battle',
		category: 'combat',
		icon: '⚔️',
		rewardType: 'dark_matter',
		rewardAmount: 100,
		requirementType: 'stat_value',
		requirementTarget: 'battles_won',
		requirementValue: 1,
		isHidden: false,
		sortOrder: 4
	},
	{
		code: 'fleet_commander',
		name: 'Fleet Commander',
		description: 'Win 50 battles',
		category: 'combat',
		icon: '🚀',
		rewardType: 'dark_matter',
		rewardAmount: 1000,
		requirementType: 'stat_value',
		requirementTarget: 'battles_won',
		requirementValue: 50,
		isHidden: false,
		sortOrder: 5
	},
	{
		code: 'ship_destroyer',
		name: 'Ship Destroyer',
		description: 'Destroy 1000 enemy ships',
		category: 'combat',
		icon: '💥',
		rewardType: 'dark_matter',
		rewardAmount: 750,
		requirementType: 'stat_value',
		requirementTarget: 'ships_destroyed',
		requirementValue: 1000,
		isHidden: false,
		sortOrder: 6
	},

	// Economy Achievements
	{
		code: 'wealthy_merchant',
		name: 'Wealthy Merchant',
		description: 'Accumulate 1,000,000 Metal',
		category: 'economy',
		icon: '💰',
		rewardType: 'dark_matter',
		rewardAmount: 300,
		requirementType: 'stat_value',
		requirementTarget: 'metal_total',
		requirementValue: 1000000,
		isHidden: false,
		sortOrder: 7
	},
	{
		code: 'dark_matter_tycoon',
		name: 'Dark Matter Tycoon',
		description: 'Spend 5000 Dark Matter',
		category: 'economy',
		icon: '💎',
		rewardType: 'dark_matter',
		rewardAmount: 1000,
		requirementType: 'stat_value',
		requirementTarget: 'dark_matter_spent',
		requirementValue: 5000,
		isHidden: false,
		sortOrder: 8
	},

	// Exploration Achievements
	{
		code: 'explorer',
		name: 'Explorer',
		description: 'Colonize your second planet',
		category: 'exploration',
		icon: '🪐',
		rewardType: 'dark_matter',
		rewardAmount: 250,
		requirementType: 'stat_value',
		requirementTarget: 'planets_owned',
		requirementValue: 2,
		isHidden: false,
		sortOrder: 9
	},
	{
		code: 'galactic_empire',
		name: 'Galactic Empire',
		description: 'Control 10 planets',
		category: 'exploration',
		icon: '🌌',
		rewardType: 'dark_matter',
		rewardAmount: 2000,
		requirementType: 'stat_value',
		requirementTarget: 'planets_owned',
		requirementValue: 10,
		isHidden: false,
		sortOrder: 10
	},

	// Research Achievements
	{
		code: 'scientist',
		name: 'Scientist',
		description: 'Complete your first research',
		category: 'research',
		icon: '🔬',
		rewardType: 'dark_matter',
		rewardAmount: 150,
		requirementType: 'stat_value',
		requirementTarget: 'research_completed',
		requirementValue: 1,
		isHidden: false,
		sortOrder: 11
	},
	{
		code: 'master_researcher',
		name: 'Master Researcher',
		description: 'Complete 25 different researches',
		category: 'research',
		icon: '🧪',
		rewardType: 'dark_matter',
		rewardAmount: 800,
		requirementType: 'stat_value',
		requirementTarget: 'research_completed',
		requirementValue: 25,
		isHidden: false,
		sortOrder: 12
	},

	// Social Achievements
	{
		code: 'social_butterfly',
		name: 'Social Butterfly',
		description: 'Send 100 chat messages',
		category: 'social',
		icon: '💬',
		rewardType: 'dark_matter',
		rewardAmount: 100,
		requirementType: 'stat_value',
		requirementTarget: 'messages_sent',
		requirementValue: 100,
		isHidden: false,
		sortOrder: 13
	},
	{
		code: 'alliance_member',
		name: 'Alliance Member',
		description: 'Join an alliance',
		category: 'social',
		icon: '🤝',
		rewardType: 'dark_matter',
		rewardAmount: 200,
		requirementType: 'boolean_flag',
		requirementTarget: 'in_alliance',
		requirementValue: 1,
		isHidden: false,
		sortOrder: 14
	}
];

export class AchievementService {
	/**
	 * Initialize achievements in the database
	 */
	static async initializeAchievements() {
		for (const achievement of ACHIEVEMENT_DEFINITIONS) {
			await db.insert(achievements).values(achievement).onConflictDoNothing();
		}
	}

	/**
	 * Check and award achievements for a user based on their stats
	 */
	static async checkAchievements(userId: number, userStats: Record<string, any>) {
		const userAchievementsResult = await db
			.select()
			.from(userAchievements)
			.where(eq(userAchievements.userId, userId));

		const unlockedAchievementIds = new Set(
			userAchievementsResult.filter((ua) => ua.isCompleted).map((ua) => ua.achievementId)
		);

		const allAchievements = await db.select().from(achievements);

		const newlyUnlocked: AchievementDefinition[] = [];

		for (const achievement of allAchievements) {
			if (unlockedAchievementIds.has(achievement.id)) {
				continue; // Already unlocked
			}

			const isCompleted = this.checkAchievementRequirement(achievement, userStats);

			if (isCompleted) {
				// Award achievement
				await db.insert(userAchievements).values({
					userId,
					achievementId: achievement.id,
					isCompleted: true,
					progress: achievement.requirementValue
				});

				// Grant reward
				if (achievement.rewardType && achievement.rewardAmount) {
					await this.grantReward(userId, achievement.rewardType, achievement.rewardAmount);
				}

				newlyUnlocked.push(achievement);
			} else {
				// Update progress for progress-tracking achievements
				const currentProgress = this.getCurrentProgress(achievement, userStats);
				await db
					.insert(userAchievements)
					.values({
						userId,
						achievementId: achievement.id,
						isCompleted: false,
						progress: currentProgress
					})
					.onConflictDoUpdate({
						target: [userAchievements.userId, userAchievements.achievementId],
						set: { progress: currentProgress }
					});
			}
		}

		return newlyUnlocked;
	}

	/**
	 * Check if a user meets the requirement for an achievement
	 */
	private static checkAchievementRequirement(
		achievement: AchievementDefinition,
		userStats: Record<string, any>
	): boolean {
		const targetValue = userStats[achievement.requirementTarget] || 0;

		switch (achievement.requirementType) {
			case 'stat_value':
				return targetValue >= (achievement.requirementValue || 0);
			case 'boolean_flag':
				return targetValue === (achievement.requirementValue || 0);
			case 'count_value':
				return targetValue >= (achievement.requirementValue || 0);
			default:
				return false;
		}
	}

	/**
	 * Get current progress for an achievement
	 */
	private static getCurrentProgress(
		achievement: AchievementDefinition,
		userStats: Record<string, any>
	): number {
		return userStats[achievement.requirementTarget] || 0;
	}

	/**
	 * Grant reward to user
	 */
	private static async grantReward(userId: number, rewardType: string, amount: number) {
		switch (rewardType) {
			case 'dark_matter':
				await db
					.update(users)
					.set({
						darkMatter: sql`${users.darkMatter} + ${amount}`
					})
					.where(eq(users.id, userId));
				break;
			// Add other reward types as needed
		}
	}

	/**
	 * Get user's achievements with progress
	 */
	static async getUserAchievements(userId: number): Promise<UserAchievement[]> {
		const result = await db
			.select({
				id: userAchievements.id,
				userId: userAchievements.userId,
				achievementId: userAchievements.achievementId,
				unlockedAt: userAchievements.unlockedAt,
				progress: userAchievements.progress,
				isCompleted: userAchievements.isCompleted,
				achievement: {
					id: achievements.id,
					code: achievements.code,
					name: achievements.name,
					description: achievements.description,
					category: achievements.category,
					icon: achievements.icon,
					rewardType: achievements.rewardType,
					rewardAmount: achievements.rewardAmount,
					requirementType: achievements.requirementType,
					requirementTarget: achievements.requirementTarget,
					requirementValue: achievements.requirementValue,
					isHidden: achievements.isHidden,
					sortOrder: achievements.sortOrder,
					createdAt: achievements.createdAt
				}
			})
			.from(userAchievements)
			.innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
			.where(eq(userAchievements.userId, userId))
			.orderBy(achievements.sortOrder);

		return result;
	}

	/**
	 * Get all available achievements
	 */
	static async getAllAchievements(): Promise<AchievementDefinition[]> {
		return await db.select().from(achievements).orderBy(achievements.sortOrder);
	}

	/**
	 * Get user stats for achievement checking
	 */
	static async getUserStatsForAchievements(userId: number): Promise<Record<string, any>> {
		// This would aggregate various stats from different tables
		// For now, return basic stats - this should be expanded based on actual game stats
		const userResult = await db
			.select({
				darkMatter: users.darkMatter,
				points: users.points,
				allianceId: users.allianceId
			})
			.from(users)
			.where(eq(users.id, userId));

		if (userResult.length === 0) {
			return {};
		}

		const user = userResult[0];

		// Get additional stats - this is a simplified version
		// In a real implementation, you'd aggregate from various tables
		return {
			dark_matter_spent: 0, // Would need to calculate from transactions
			battles_won: 0, // Would need combat reports
			ships_destroyed: 0, // Would need combat reports
			metal_total: 0, // Would need from planets
			planets_owned: 1, // Basic assumption
			research_completed: 0, // Would need from research tables
			messages_sent: 0, // Would need from chat messages
			in_alliance: user.allianceId ? 1 : 0,
			metal_mine_level: 0, // Would need from planet buildings
			solar_plant_count: 0 // Would need from planet buildings
		};
	}
}
