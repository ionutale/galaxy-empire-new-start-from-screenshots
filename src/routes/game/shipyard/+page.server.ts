import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, fetch, depends }) => {
	depends('app:game-data');
	
	const { currentPlanet } = await parent();

	if (!currentPlanet) {
		return { shipyardData: null };
	}

	try {
		const response = await fetch(`/api/shipyard?planetId=${currentPlanet.id}`);
		const shipyardData = await response.json();

		return { shipyardData };
	} catch (error) {
		console.error('Error loading shipyard data:', error);
		return { shipyardData: null };
	}
};
