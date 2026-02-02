import { ShipyardService } from '$lib/server/shipyard-service';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent, fetch }) => {
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

export const actions = {
	build: async ({ request, locals, fetch }) => {
		if (!locals.user) return { success: false, error: 'Unauthorized' };

		const data = await request.formData();
		const shipType = data.get('type') as string;
		const amount = Number(data.get('amount') || 1);
		const planetId = Number(data.get('planet_id'));

		if (!shipType || !planetId || amount < 1) {
			return { success: false, error: 'Invalid data' };
		}

		try {
			const response = await fetch('/api/shipyard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'build',
					planetId,
					shipType,
					amount
				})
			});

			const result = await response.json();

			if (!result.success) {
				return { success: false, error: result.error || 'Failed to start construction' };
			}

			return { success: true };
		} catch (error) {
			console.error('Error building ships:', error);
			return { success: false, error: 'Internal server error' };
		}
	},

	cancel: async ({ request, locals, fetch }) => {
		if (!locals.user) return { success: false, error: 'Unauthorized' };

		const data = await request.formData();
		const queueId = Number(data.get('queue_id'));

		if (!queueId) {
			return { success: false, error: 'Invalid queue ID' };
		}

		try {
			const response = await fetch('/api/shipyard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'cancel',
					queueId
				})
			});

			const result = await response.json();

			if (!result.success) {
				return { success: false, error: result.error || 'Failed to cancel construction' };
			}

			return { success: true };
		} catch (error) {
			console.error('Error canceling construction:', error);
			return { success: false, error: 'Internal server error' };
		}
	}
} satisfies Actions;
