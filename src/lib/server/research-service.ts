import { db } from './db';
import { sql } from 'drizzle-orm';
import { users } from './db/schema';

export interface ResearchCost {
	metal: number;
	crystal: number;
	gas: number;
}

interface ResearchRow {
	id: number;
	name: string;
	description: string;
	category: string;
	level: number;
	base_cost: ResearchCost;
	base_research_time: number;
	is_researching: boolean;
	research_completion: Date | null;
	prerequisites: unknown; // JSON field
	icon: string;
}

export interface ResearchValidationResult {
	valid: boolean;
	error?: string;
	cost?: ResearchCost;
	target_level?: number;
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

		return result.rows.map((row) => this.formatResearchInfo(row));
	}

	/**
	 * Get a specific research for a user
	 */
	static async getUserResearchById(
		userId: number,
		researchTypeId: number
	): Promise<ResearchInfo | null> {
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
		// Validate research start using stored procedure
		const validationResult = await db.execute(sql`
			SELECT validate_research_start(${userId}, ${researchTypeId}, ${planetId}) as validation
		`);

		const validation = validationResult.rows[0].validation as ResearchValidationResult;
		if (!validation.valid) {
			return { success: false, error: validation.error };
		}

		// Get research lab level for time calculation
		const labResult = await db.execute(sql`
			SELECT COALESCE(MAX(level), 0) as lab_level
			FROM planet_buildings pb
			JOIN planets p ON p.id = pb.planet_id
			WHERE p.user_id = ${userId} AND pb.building_type_id = (SELECT id FROM building_types WHERE name = 'Research Lab')
		`);
		const labLevel = labResult.rows[0].lab_level;

		// Calculate completion time using stored function
		const timeResult = await db.execute(sql`
			SELECT extract(epoch from calculate_research_time(${researchTypeId}, ${validation.target_level}, ${labLevel})) as research_seconds
		`);
		const researchSeconds = timeResult.rows[0].research_seconds as number;
		const completionTime = new Date(Date.now() + researchSeconds * 1000);

		// Start transaction
		await db.transaction(async (tx) => {
			// Deduct resources from planet
			await tx.execute(sql`
				UPDATE planets
				SET resources = jsonb_set(
					jsonb_set(
						jsonb_set(resources, '{metal}', (COALESCE(resources->>'metal', '0')::int - ${validation.cost.metal})::text::jsonb),
						'{crystal}', (COALESCE(resources->>'crystal', '0')::int - ${validation.cost.crystal})::text::jsonb
					),
					'{gas}', (COALESCE(resources->>'gas', '0')::int - ${validation.cost.gas})::text::jsonb
				)
				WHERE id = ${planetId}
			`);

			// Update or insert user research level
			await tx.execute(sql`
				INSERT INTO user_research_levels (user_id, research_type_id, level, is_researching, research_completion_at)
				VALUES (${userId}, ${researchTypeId}, ${validation.target_level - 1}, true, ${completionTime})
				ON CONFLICT (user_id, research_type_id)
				DO UPDATE SET
					is_researching = true,
					research_completion_at = ${completionTime}
			`);

			// Add to research queue
			await tx.execute(sql`
				INSERT INTO research_queue (user_id, research_type_id, level, completion_at, planet_id, resources_reserved)
				VALUES (${userId}, ${researchTypeId}, ${validation.target_level}, ${completionTime}, ${planetId}, ${JSON.stringify(validation.cost)})
			`);
		});

		return { success: true, completionTime };
	}

	/**
	 * Process completed research for all users
	 */
	static async processCompletedResearch(): Promise<void>;
	/**
	 * Process completed research for a specific user
	 */
	static async processCompletedResearch(userId: number): Promise<void>;
	static async processCompletedResearch(userId?: number): Promise<void> {
		if (userId !== undefined) {
			// Process for specific user
			await db.execute(sql`CALL process_completed_research(${userId})`);
		} else {
			// Process for all users
			const usersResult = await db.select({ id: users.id }).from(users);
			for (const user of usersResult) {
				await db.execute(sql`CALL process_completed_research(${user.id})`);
			}
		}
	}

	/**
	 * Check if user meets research prerequisites
	 */
	private static async checkPrerequisites(
		userId: number,
		prerequisites: Record<string, number>
	): Promise<boolean> {
		if (Object.keys(prerequisites).length === 0) return true;

		const result = await db.execute(sql`
			SELECT rt.name, COALESCE(url.level, 0) as level
			FROM research_types rt
			LEFT JOIN user_research_levels url ON url.research_type_id = rt.id AND url.user_id = ${userId}
			WHERE rt.name = ANY(${Object.keys(prerequisites)})
		`);

		const userLevels: Record<string, number> = {};
		result.rows.forEach((row) => {
			userLevels[row.name as string] = row.level as number;
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
		return (
			(resources.metal as number) >= cost.metal &&
			(resources.crystal as number) >= cost.crystal &&
			(resources.gas as number) >= cost.gas
		);
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
	private static formatResearchInfo(row: ResearchRow): ResearchInfo {
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
