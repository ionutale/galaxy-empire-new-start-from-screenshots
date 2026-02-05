import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BuildingService } from '$lib/server/building-service';

// Get planet production and storage
export const GET: RequestHandler = async ({ params }) => {
	try {
		const planetId = parseInt(params.planetId || '0');
		if (!planetId) {
			throw error(400, 'Invalid planet ID');
		}

		const [production, storage] = await Promise.all([
			BuildingService.calculatePlanetProduction(planetId),
			BuildingService.calculatePlanetStorage(planetId)
		]);

		return json({
			production,
			storage
		});
	} catch (err) {
		console.error('Error fetching planet production:', err);
		throw error(500, 'Failed to fetch planet production');
	}
};
