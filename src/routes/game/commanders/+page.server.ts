import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { COMMANDERS, DURATION_COSTS, purchaseCommander, getActiveCommanders } from '$lib/server/commanders';
import { db, users } from '$lib/server/db';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');

    const activeCommanders = await getActiveCommanders(locals.user.id);
    
    // Get current DM
    const userRes = await db.select({ darkMatter: users.darkMatter })
        .from(users)
        .where(eq(users.id, locals.user.id));
    const darkMatter = userRes[0]?.darkMatter || 0;

    return {
        commanders: COMMANDERS,
        durationCosts: DURATION_COSTS,
        activeCommanders: activeCommanders.reduce((acc, curr) => {
            acc[curr.commanderId] = curr.expiresAt;
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
