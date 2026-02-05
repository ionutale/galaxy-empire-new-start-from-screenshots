import { json, error } from '@sveltejs/kit';
import { getPlayerGalactoniteItems, purchaseGalactoniteItem } from '$lib/server/shop';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	try {
		const items = await getPlayerGalactoniteItems(locals.user.id);
		return json({ items });
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	try {
		const { type, rarity, cost } = await request.json();

		if (!type || !rarity || cost == null) {
			throw error(400, 'Missing parameters');
		}

		const result = await purchaseGalactoniteItem(locals.user.id, type, rarity, cost);
		return json(result);
	} catch (e: any) {
		return json({ success: false, error: e.message }, { status: 400 });
	}
};
