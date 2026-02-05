import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BuildingService } from '$lib/server/building-service';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const planetId = url.searchParams.get('planetId');
		if (!planetId) {
			return json({ error: 'Planet ID required' }, { status: 400 });
		}

		const buildings = await BuildingService.getPlanetBuildings(parseInt(planetId));
		return json({ buildings });
	} catch (error) {
		console.error('Buildings fetch error:', error);
		return json({ error: 'Failed to fetch buildings' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { building_type_id, planet_id } = await request.json();

		if (!building_type_id || !planet_id) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const result = await BuildingService.startBuildingConstruction(
			parseInt(planet_id),
			parseInt(building_type_id),
			locals.user.id
		);

		if (!result.success) {
			return json({ error: result.error }, { status: 400 });
		}

		return json({
			success: true,
			completionTime: result.completionTime
		});
	} catch (error) {
		console.error('Building construction start error:', error);
		return json({ error: 'Failed to start building construction' }, { status: 500 });
	}
};
