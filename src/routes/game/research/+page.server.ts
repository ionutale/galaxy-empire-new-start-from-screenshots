import { ResearchService } from '$lib/server/research-service';
import { db } from '$lib/server/db';
import { researchQueue, userResearchLevels } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, parent }) => {
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

export const actions: Actions = {
	research: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const researchTypeId = Number(data.get('research_type_id'));
		const planetId = Number(data.get('planet_id'));

		if (!researchTypeId || !planetId) return fail(400, { error: 'Missing required fields' });

		try {
			const result = await ResearchService.startResearch(locals.user.id, researchTypeId, planetId);

			if (!result.success) {
				return fail(400, { error: result.error });
			}

			return { success: true, completionTime: result.completionTime };
		} catch (error) {
			console.error('Research start error:', error);
			return fail(500, { error: 'Failed to start research' });
		}
	},

	cancel: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const queueId = Number(data.get('queue_id'));

		if (!queueId) return fail(400, { error: 'Missing queue ID' });

		try {
			// Get queue item and verify ownership
			const queueItem = await db
				.select({
					researchTypeId: researchQueue.researchTypeId,
					level: researchQueue.level
				})
				.from(researchQueue)
				.where(eq(researchQueue.id, queueId))
				.limit(1);

			if (!queueItem.length) return fail(404, { error: 'Queue item not found' });

			// Reset research status
			await db
				.update(userResearchLevels)
				.set({
					isResearching: false,
					researchCompletionAt: null
				})
				.where(
					and(
						eq(userResearchLevels.userId, locals.user.id),
						eq(userResearchLevels.researchTypeId, queueItem[0].researchTypeId)
					)
				);

			// Remove from queue
			await db
				.delete(researchQueue)
				.where(eq(researchQueue.id, queueId));

			return { success: true };
		} catch (error) {
			console.error('Research cancel error:', error);
			return fail(500, { error: 'Failed to cancel research' });
		}
	}
};
