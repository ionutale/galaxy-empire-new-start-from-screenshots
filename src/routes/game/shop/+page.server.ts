import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { SHOP_ITEMS, purchaseShopItem, getActiveBoosters } from '$lib/server/shop';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const activeBoosters = await getActiveBoosters(locals.user.id);

	// Get current DM
	const userRes = await db
		.select({ darkMatter: users.darkMatter })
		.from(users)
		.where(eq(users.id, locals.user.id));

	const darkMatter = userRes[0]?.darkMatter || 0;

	return {
		shopItems: SHOP_ITEMS,
		activeBoosters: activeBoosters.reduce(
			(acc, curr) => {
				acc[curr.boosterId] = curr.expiresAt;
				return acc;
			},
			{} as Record<string, Date>
		),
		darkMatter
	};
};

export const actions: Actions = {
	purchase: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const itemId = data.get('itemId') as string;

		if (!itemId) {
			return fail(400, { error: 'Missing item ID' });
		}

		try {
			const userId = locals.user.id;
			const result = await purchaseShopItem(userId, itemId);
			return result;
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	}
};
