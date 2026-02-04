import { json, error } from '@sveltejs/kit';
import { purchaseShopItem } from '$lib/server/shop';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	try {
		const { itemId } = await request.json();

		if (!itemId) {
			throw error(400, 'Missing item ID');
		}

		const result = await purchaseShopItem(locals.user.id, itemId);
		return json(result);

	} catch (e: any) {
		return json({ success: false, error: e.message }, { status: 400 });
	}
};
