import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;

// Predefined achievements
const ACHIEVEMENT_DEFINITIONS = [
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

async function initializeAchievements() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error('DATABASE_URL is not set');
	}

	const pool = new Pool({ connectionString });
	const db = drizzle(pool);

	try {
		console.log('Initializing achievements...');

		// First create the tables if they don't exist
		await db.execute(`
			CREATE TABLE IF NOT EXISTS achievements (
				id SERIAL PRIMARY KEY,
				code VARCHAR(100) NOT NULL UNIQUE,
				name VARCHAR(255) NOT NULL,
				description TEXT NOT NULL,
				category VARCHAR(50) NOT NULL,
				icon VARCHAR(50) NOT NULL,
				reward_type VARCHAR(50),
				reward_amount INTEGER,
				requirement_type VARCHAR(50) NOT NULL,
				requirement_target VARCHAR(100) NOT NULL,
				requirement_value INTEGER,
				is_hidden BOOLEAN DEFAULT FALSE,
				sort_order INTEGER DEFAULT 0,
				created_at TIMESTAMP DEFAULT NOW()
			);

			CREATE TABLE IF NOT EXISTS user_achievements (
				id SERIAL PRIMARY KEY,
				user_id INTEGER REFERENCES users(id),
				achievement_id INTEGER REFERENCES achievements(id),
				unlocked_at TIMESTAMP DEFAULT NOW(),
				progress INTEGER DEFAULT 0,
				is_completed BOOLEAN DEFAULT FALSE
			);
		`);

		// Insert achievement definitions
		for (const achievement of ACHIEVEMENT_DEFINITIONS) {
			const rewardType = achievement.rewardType || null;
			const rewardAmount = achievement.rewardAmount || null;
			const requirementValue = achievement.requirementValue || null;

			await db.execute(`
				INSERT INTO achievements (code, name, description, category, icon, reward_type, reward_amount, requirement_type, requirement_target, requirement_value, is_hidden, sort_order)
				VALUES ('${achievement.code}', '${achievement.name.replace(/'/g, "''")}', '${achievement.description.replace(/'/g, "''")}', '${achievement.category}', '${achievement.icon}', ${rewardType ? `'${rewardType}'` : 'NULL'}, ${rewardAmount || 'NULL'}, '${achievement.requirementType}', '${achievement.requirementTarget}', ${requirementValue || 'NULL'}, ${achievement.isHidden}, ${achievement.sortOrder})
				ON CONFLICT (code) DO NOTHING
			`);
		}

		console.log('Achievements initialized successfully!');
	} catch (error) {
		console.error('Failed to initialize achievements:', error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

initializeAchievements();
