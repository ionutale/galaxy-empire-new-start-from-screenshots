import { json } from '@sveltejs/kit';
import { BuildingService } from '$lib/server/building-service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { planetId, buildingTypeId } = await request.json();

		if (!buildingTypeId || !planetId) {
			return json({ error: 'Missing parameters' }, { status: 400 });
		}

		const result = await BuildingService.startBuildingConstruction(
			Number(planetId),
			Number(buildingTypeId),
			locals.user.id
		);

		if (!result.success) {
			return json({ error: result.error }, { status: 400 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Building upgrade error:', error);
		return json({ error: 'Failed to start building upgrade' }, { status: 500 });
	}
};
