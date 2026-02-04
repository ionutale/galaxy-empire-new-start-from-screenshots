import { json, error } from '@sveltejs/kit';
import { dispatchFleet } from '$lib/server/fleet-service';
import { createFleetTemplate, deleteFleetTemplate } from '$lib/server/fleet-templates';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	try {
		const { action, ...data } = await request.json();

		if (action === 'dispatch') {
			const { planetId, galaxy, system, planet, mission, ships, resources } = data;
			try {
				await dispatchFleet(
					locals.user.id,
					planetId,
					galaxy,
					system,
					planet,
					mission,
					ships,
					resources
				);
				return json({ success: true });
			} catch (e: any) {
				console.error('Dispatch error:', e);
				// Pass specific error messages back to the client
				if (
					e.message.startsWith('Not enough') ||
					e.message.startsWith('No ships') ||
					e.message.includes('Max expedition limit') ||
					e.message.includes('Max fleet limit') ||
					e.message.includes('Target') ||
					e.message.includes('Invalid')
				) {
					return json({ success: false, error: e.message }, { status: 400 });
				}
				throw error(500, 'Internal server error');
			}
		} else if (action === 'createTemplate') {
			const { name, ships } = data;
			try {
				await createFleetTemplate(locals.user.id, name, ships);
				return json({ success: true });
			} catch (e: any) {
				return json({ success: false, error: e.message }, { status: 400 });
			}
		} else if (action === 'deleteTemplate') {
			const { id } = data;
			try {
				await deleteFleetTemplate(locals.user.id, id);
				return json({ success: true });
			} catch (e: any) {
				return json({ success: false, error: e.message }, { status: 400 });
			}
		}

		throw error(400, 'Invalid action');
	} catch (e: any) {
		console.error('API Error:', e);
		throw error(500, 'Internal server error');
	}
};
