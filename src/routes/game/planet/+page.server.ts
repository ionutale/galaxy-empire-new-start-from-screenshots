import { CacheService } from '$lib/server/cache';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	if (!user) {
		throw new Error('Unauthorized');
	}

	// Get all user's planets with caching
	const planets = await CacheService.getUserPlanets(user.id);

	return {
		planets
	};
};
