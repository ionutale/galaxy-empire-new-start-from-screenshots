import { json } from '@sveltejs/kit';
import { ResearchService } from '$lib/server/research-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

    try {
        const { researchTypeId, planetId } = await request.json();

		if (!researchTypeId || !planetId) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }

		const result = await ResearchService.startResearch(locals.user.id, Number(researchTypeId), Number(planetId));

		if (!result.success) {
            return json({ error: result.error }, { status: 400 });
		}

		return json({ success: true, completionTime: result.completionTime });
	} catch (error) {
		console.error('Research start error:', error);
		return json({ error: 'Failed to start research' }, { status: 500 });
	}
};
