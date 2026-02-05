import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ResearchService } from '$lib/server/research-service';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const research = await ResearchService.getUserResearch(locals.user.id);
		return json({ research });
	} catch (error) {
		console.error('Research fetch error:', error);
		return json({ error: 'Failed to fetch research' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { research_type_id, planet_id } = await request.json();

		if (!research_type_id || !planet_id) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const result = await ResearchService.startResearch(locals.user.id, research_type_id, planet_id);

		if (!result.success) {
			return json({ error: result.error }, { status: 400 });
		}

		return json({
			success: true,
			completionTime: result.completionTime
		});
	} catch (error) {
		console.error('Research start error:', error);
		return json({ error: 'Failed to start research' }, { status: 500 });
	}
};
