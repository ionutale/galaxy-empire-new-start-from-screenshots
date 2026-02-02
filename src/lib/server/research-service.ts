import { db } from './db';
import { sql } from 'drizzle-orm';
import { researchTypes, userResearchLevels, researchQueue, users } from './db/schema';

export interface ResearchCost {
	metal: number;
	crystal: number;
	gas: number;
}

export interface ResearchInfo {
	id: number;
	name: string;
	description: string;
	category: string;
	level: number;
	cost: ResearchCost;
	researchTime: number;
	canResearch: boolean;
	isResearching: boolean;
	researchCompletion?: Date;
	prerequisites: Record<string, number>;
	icon: string;
}

export class ResearchService {
	/**
	 * Get all research for a user
	 */
	static async getUserResearch(userId: number): Promise<ResearchInfo[]> {
		const result = await db.execute(sql`
			SELECT
				rt.id,
				rt.name,
				rt.description,
				rt.category,
				COALESCE(url.level, 0) as level,
				rt.base_cost as base_cost,
				rt.base_research_time as base_research_time,
				COALESCE(url.is_researching, false) as is_researching,
				url.research_completion_at as research_completion,
				rt.prerequisites,
				rt.icon
			FROM research_types rt
			LEFT JOIN user_research_levels url ON url.research_type_id = rt.id AND url.user_id = ${userId}
			ORDER BY rt.category, rt.name
		`);

		return result.rows.map(row => this.formatResearchInfo(row));
	}

	/**
	 * Get a specific research for a user
	 */
	static async getUserResearchById(userId: number, researchTypeId: number): Promise<ResearchInfo | null> {
		const result = await db.execute(sql`
			SELECT
				rt.id,
				rt.name,
				rt.description,
				rt.category,
				COALESCE(url.level, 0) as level,
				rt.base_cost as base_cost,
				rt.base_research_time as base_research_time,
				COALESCE(url.is_researching, false) as is_researching,
				url.research_completion_at as research_completion,
				rt.prerequisites,
				rt.icon
			FROM research_types rt
			LEFT JOIN user_research_levels url ON url.research_type_id = rt.id AND url.user_id = ${userId}
			WHERE rt.id = ${researchTypeId}
		`);

		if (result.rows.length === 0) return null;
		return this.formatResearchInfo(result.rows[0]);
	}

	/**
	 * Start research
	 */
	static async startResearch(
		userId: number,
		researchTypeId: number,
		planetId: number
	): Promise<{ success: boolean; error?: string; completionTime?: Date }> {
		// Check if user exists
		const userResult = await db.execute(sql`
			SELECT id FROM users WHERE id = ${userId}
		`);
		if (userResult.rows.length === 0) {
			return { success: false, error: 'User not found' };
		}

		// Get research info
		const research = await this.getUserResearchById(userId, researchTypeId);
		if (!research) {
			return { success: false, error: 'Research not found' };
		}

		// Check if already researching
		if (research.isResearching) {
			return { success: false, error: 'Already researching this technology' };
		}

		// Check prerequisites
		if (!this.checkPrerequisites(userId, research.prerequisites)) {
			return { success: false, error: 'Prerequisites not met' };
		}

		// Check if can afford
		const canAfford = await this.checkResearchCost(userId, research.cost);
		if (!canAfford) {
			return { success: false, error: 'Insufficient resources' };
		}

		// Deduct resources
		await this.deductResearchCost(userId, research.cost);

		// Calculate completion time
		const completionTime = new Date(Date.now() + research.researchTime * 1000);

		// Start transaction
		await db.transaction(async (tx) => {
			// Update or insert user research level
			await tx.execute(sql`
				INSERT INTO user_research_levels (user_id, research_type_id, level, is_researching, research_completion_at)
				VALUES (${userId}, ${researchTypeId}, ${research.level}, true, ${completionTime})
				ON CONFLICT (user_id, research_type_id)
				DO UPDATE SET
					is_researching = true,
					research_completion_at = ${completionTime}
			`);

			// Add to research queue
			await tx.execute(sql`
				INSERT INTO research_queue (user_id, research_type_id, level, completion_at, planet_id)
				VALUES (${userId}, ${researchTypeId}, ${research.level + 1}, ${completionTime}, ${planetId})
			`);
		});

		return { success: true, completionTime };
	}

	/**
	 * Process completed research
	 */
	static async processCompletedResearch(userId: number): Promise<void> {
		const now = new Date();

		// Get completed research
		const completedResult = await db.execute(sql`
			SELECT rq.*, rt.name
			FROM research_queue rq
			JOIN research_types rt ON rt.id = rq.research_type_id
			WHERE rq.user_id = ${userId} AND rq.completion_at <= ${now}
			ORDER BY rq.completion_at ASC
		`);

		for (const queueItem of completedResult.rows) {
			await db.transaction(async (tx) => {
				// Update research level
				await tx.execute(sql`
					UPDATE user_research_levels
					SET level = ${queueItem.level},
						is_researching = false,
						research_completion_at = NULL,
						updated_at = NOW()
					WHERE user_id = ${userId} AND research_type_id = ${queueItem.research_type_id}
				`);

				// Remove from queue
				await tx.execute(sql`
					DELETE FROM research_queue
					WHERE id = ${queueItem.id}
				`);
			});
		}
	}

	/**
	 * Check if user meets research prerequisites
	 */
	private static async checkPrerequisites(userId: number, prerequisites: Record<string, number>): Promise<boolean> {
		if (Object.keys(prerequisites).length === 0) return true;

		const result = await db.execute(sql`
			SELECT rt.name, COALESCE(url.level, 0) as level
			FROM research_types rt
			LEFT JOIN user_research_levels url ON url.research_type_id = rt.id AND url.user_id = ${userId}
			WHERE rt.name = ANY(${Object.keys(prerequisites)})
		`);

		const userLevels: Record<string, number> = {};
		result.rows.forEach(row => {
			userLevels[row.name] = row.level;
		});

		for (const [techName, requiredLevel] of Object.entries(prerequisites)) {
			if ((userLevels[techName] || 0) < requiredLevel) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Check if user can afford research
	 */
	private static async checkResearchCost(userId: number, cost: ResearchCost): Promise<boolean> {
		// For now, check against a single planet's resources
		// TODO: Allow research from any planet with research lab
		const result = await db.execute(sql`
			SELECT pr.metal, pr.crystal, pr.gas
			FROM planet_resources pr
			JOIN planets p ON p.id = pr.planet_id
			WHERE p.user_id = ${userId}
			LIMIT 1
		`);

		if (result.rows.length === 0) return false;

		const resources = result.rows[0];
		return resources.metal >= cost.metal &&
			   resources.crystal >= cost.crystal &&
			   resources.gas >= cost.gas;
	}

	/**
	 * Deduct research cost from user resources
	 */
	private static async deductResearchCost(userId: number, cost: ResearchCost): Promise<void> {
		// Deduct from first available planet
		await db.execute(sql`
			UPDATE planet_resources
			SET metal = metal - ${cost.metal},
				crystal = crystal - ${cost.crystal},
				gas = gas - ${cost.gas}
			WHERE planet_id IN (
				SELECT id FROM planets WHERE user_id = ${userId} LIMIT 1
			)
		`);
	}

	/**
	 * Format research info from database row
	 */
	private static formatResearchInfo(row: any): ResearchInfo {
		const level = row.level || 0;
		const baseCost = row.base_cost as ResearchCost;
		const baseResearchTime = row.base_research_time || 60;

		// Calculate current cost (exponential scaling)
		const costMultiplier = Math.pow(1.75, level); // Research is more expensive than buildings
		const cost: ResearchCost = {
			metal: Math.floor(baseCost.metal * costMultiplier),
			crystal: Math.floor(baseCost.crystal * costMultiplier),
			gas: Math.floor(baseCost.gas * costMultiplier)
		};

		// Calculate research time
		const researchTime = Math.floor(baseResearchTime * Math.pow(1.5, level));

		return {
			id: row.id,
			name: row.name,
			description: row.description,
			category: row.category,
			level,
			cost,
			researchTime,
			canResearch: level < 100, // Max level check
			isResearching: row.is_researching || false,
			researchCompletion: row.research_completion ? new Date(row.research_completion) : undefined,
			prerequisites: row.prerequisites || {},
			icon: row.icon || '🔬'
		};
	}
}