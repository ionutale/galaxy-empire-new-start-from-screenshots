import { db } from '../src/lib/server/db';

async function createAchievementTables() {
	try {
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
		console.log('Achievement tables created successfully');
	} catch (error) {
		console.error('Error creating tables:', error);
	}
}

createAchievementTables();