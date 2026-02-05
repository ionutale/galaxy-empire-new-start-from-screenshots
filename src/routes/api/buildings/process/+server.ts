import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BuildingService } from '$lib/server/building-service';

// Process completed building constructions
export const POST: RequestHandler = async () => {
	try {
		await BuildingService.processCompletedBuildings();

		return json({ success: true });
	} catch (err) {
		console.error('Error processing completed buildings:', err);
		throw error(500, 'Failed to process completed buildings');
	}
};
