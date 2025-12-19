import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { SHOP_ITEMS, purchaseShopItem, getActiveBoosters } from '$lib/server/shop';
import { pool } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');

    const activeBoosters = await getActiveBoosters(locals.user.id);
    
    // Get current DM
    const userRes = await pool.query('SELECT dark_matter FROM users WHERE id = $1', [locals.user.id]);
    const darkMatter = userRes.rows[0]?.dark_matter || 0;

    return {
        shopItems: SHOP_ITEMS,
        activeBoosters: activeBoosters.reduce((acc, curr) => {
            acc[curr.booster_id] = curr.expires_at;
            return acc;
        }, {} as Record<string, Date>),
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
            const result = await purchaseShopItem(locals.user.id, itemId);
            return { success: true, ...result };
        } catch (e: any) {
            return fail(400, { error: e.message });
        }
    }
};
