import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BuildingService } from '$lib/server/building-service';

// Get all buildings for a planet
export const GET: RequestHandler = async ({ params }) => {
	try {
		const planetId = parseInt(params.planetId || '0');
		if (!planetId) {
			throw error(400, 'Invalid planet ID');
		}

		// TODO: Check if user owns the planet
		const buildings = await BuildingService.getPlanetBuildings(planetId);

		return json(buildings);
	} catch (err) {
		console.error('Error fetching planet buildings:', err);
		throw error(500, 'Failed to fetch buildings');
	}
};

// Start building construction
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const planetId = parseInt(params.planetId || '0');
		if (!planetId) {
			throw error(400, 'Invalid planet ID');
		}

		const { buildingTypeId } = await request.json();
		if (!buildingTypeId) {
			throw error(400, 'Building type ID is required');
		}

		// TODO: Get user ID from session
		const userId = 1; // Placeholder

		const result = await BuildingService.startBuildingConstruction(
			planetId,
			buildingTypeId,
			userId
		);

		if (!result.success) {
			throw error(400, result.error || 'Failed to start construction');
		}

		return json({
			success: true,
			completionTime: result.completionTime
		});
	} catch (err) {
		console.error('Error starting building construction:', err);
		throw error(500, 'Failed to start construction');
	}
};
