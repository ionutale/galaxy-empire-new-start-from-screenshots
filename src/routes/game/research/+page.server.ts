import { ResearchService } from '$lib/server/research-service';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, parent }) => {
	if (!locals.user) return {};

	const { currentPlanet } = await parent();

	try {
		const research = await ResearchService.getUserResearch(locals.user.id);
		return {
			research,
			currentPlanet
		};
	} catch (error) {
		console.error('Research load error:', error);
		return { research: [] };
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
	}
};
