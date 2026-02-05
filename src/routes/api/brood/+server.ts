import { json, error } from '@sveltejs/kit';
import { broodService } from '$lib/server/brood';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	try {
		const galaxy = parseInt(url.searchParams.get('galaxy') || '1');
		const system = parseInt(url.searchParams.get('system') || '1');

		const targets = await broodService.getBroodTargets(galaxy, system);
		return json({ targets });

	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	try {
		const { fleetId, targetId } = await request.json();

		if (!fleetId || !targetId) {
			throw error(400, 'Missing fleetId or targetId');
		}

		const result = await broodService.raidBroodTarget(fleetId, targetId, locals.user.id);
		return json(result);

	} catch (e: any) {
		return json({ success: false, error: e.message }, { status: 400 });
	}
};