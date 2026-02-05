import { ResearchService } from '$lib/server/research-service';
import { db } from '$lib/server/db';
import { researchQueue } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent, depends }) => {
	depends('app:game-data');
	
	if (!locals.user) return {};

	const { currentPlanet } = await parent();

	try {
		const research = await ResearchService.getUserResearch(locals.user.id);

		// Get research queue
		const queue = await db
			.select({
				id: researchQueue.id,
				researchTypeId: researchQueue.researchTypeId,
				level: researchQueue.level,
				completionAt: researchQueue.completionAt,
				planetId: researchQueue.planetId
			})
			.from(researchQueue)
			.where(eq(researchQueue.userId, locals.user.id))
			.orderBy(researchQueue.completionAt);

		// Check if user has a research lab
		const researchLabResult = await db.execute(sql`
			SELECT COUNT(*) > 0 as has_research_lab
			FROM planet_buildings pb
			JOIN planets p ON p.id = pb.planet_id
			WHERE p.user_id = ${locals.user.id} AND pb.building_type_id = (
				SELECT id FROM building_types WHERE name = 'Research Lab'
			)
		`);
		const hasResearchLab = researchLabResult.rows[0].has_research_lab;

		return {
			research,
			queue,
			currentPlanet,
			hasResearchLab
		};
	} catch (error) {
		console.error('Research load error:', error);
		return { research: [], queue: [], hasResearchLab: false };
	}
};
