import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { COMMANDERS, DURATION_COSTS, purchaseCommander, getActiveCommanders } from '$lib/server/commanders';
import { pool } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');

    const activeCommanders = await getActiveCommanders(locals.user.id);
    
    // Get current DM
    const userRes = await pool.query('SELECT dark_matter FROM users WHERE id = $1', [locals.user.id]);
    const darkMatter = userRes.rows[0]?.dark_matter || 0;

    return {
        commanders: COMMANDERS,
        durationCosts: DURATION_COSTS,
        activeCommanders: activeCommanders.reduce((acc, curr) => {
            acc[curr.commander_id] = curr.expires_at;
            return acc;
        }, {} as Record<string, Date>),
        darkMatter
    };
};

export const actions: Actions = {
    purchase: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const commanderId = data.get('commanderId') as string;
        const duration = parseInt(data.get('duration') as string);

        if (!commanderId || !duration) {
            return fail(400, { error: 'Missing parameters' });
        }

        try {
            const result = await purchaseCommander(locals.user.id, commanderId, duration);
            return { success: true, ...result };
        } catch (e: any) {
            return fail(400, { error: e.message });
        }
    }
};
