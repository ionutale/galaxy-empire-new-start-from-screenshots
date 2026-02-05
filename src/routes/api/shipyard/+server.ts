import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ShipyardService } from '$lib/server/shipyard-service';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const planetId = parseInt(url.searchParams.get('planetId') || '0');
	if (!planetId) {
		throw error(400, 'Planet ID required');
	}

	try {
		const shipyardData = await ShipyardService.getShipyardInfo(planetId, locals.user.id);
		return json(shipyardData);
	} catch (err) {
		console.error('Error fetching shipyard data:', err);
		throw error(500, 'Internal server error');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const { action, planetId, shipType, amount, queueId } = await request.json();

		if (action === 'build') {
			if (!planetId || !shipType || !amount) {
				throw error(400, 'Missing required fields');
			}

			const result = await ShipyardService.startShipConstruction(
				locals.user.id,
				planetId,
				shipType,
				amount
			);

			if (!result.success) {
				throw error(400, result.error);
			}

			return json({ success: true });
		} else if (action === 'cancel') {
			if (!queueId) {
				throw error(400, 'Queue ID required');
			}

			const result = await ShipyardService.cancelShipConstruction(locals.user.id, queueId);

			if (!result.success) {
				throw error(400, result.error);
			}

			return json({ success: true });
		} else {
			throw error(400, 'Invalid action');
		}
	} catch (err: unknown) {
		console.error('Error in shipyard API:', err);
		throw error(500, 'Internal server error');
	}
};
