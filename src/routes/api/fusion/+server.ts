import { json, error } from '@sveltejs/kit';
import { fuseItems, getActiveFusionBoosts } from '$lib/server/shop';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	try {
		const boosts = await getActiveFusionBoosts(locals.user.id);
		return json({ boosts });
	} catch (e: any) {
		return json({ error: e.message }, { status: 400 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	try {
		const { itemIds, recipeId } = await request.json();

		if (!itemIds || !recipeId) {
			throw error(400, 'Missing itemIds or recipeId');
		}

		const result = await fuseItems(locals.user.id, itemIds, recipeId);
		return json(result);
	} catch (e: any) {
		return json({ success: false, error: e.message }, { status: 400 });
	}
};
