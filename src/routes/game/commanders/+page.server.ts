import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { COMMANDERS, DURATION_COSTS, purchaseCommander, getActiveCommanders } from '$lib/server/commanders';
import { db } from '$lib/server/db';
import { users, fleetTemplates, planets, autoExploreSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');

    const activeCommanders = await getActiveCommanders(locals.user.id);
    
    // Get current DM
    const userRes = await db.select({ darkMatter: users.darkMatter })
        .from(users)
        .where(eq(users.id, locals.user.id));
    const darkMatter = userRes[0]?.darkMatter || 0;

    // Get Fleet Templates
    const templates = await db.select().from(fleetTemplates).where(eq(fleetTemplates.userId, locals.user.id));

    // Get User Planets
    const userPlanets = await db.select().from(planets).where(eq(planets.userId, locals.user.id));

    // Get Auto Explore Settings
    const settingsRes = await db.select().from(autoExploreSettings).where(eq(autoExploreSettings.userId, locals.user.id));
    const settings = settingsRes[0] || null;

    return {
        commanders: COMMANDERS,
        durationCosts: DURATION_COSTS,
        activeCommanders: activeCommanders.reduce((acc, curr) => {
            acc[curr.commanderId] = curr.expiresAt;
            return acc;
        }, {} as Record<string, Date>),
        darkMatter,
        templates,
        userPlanets,
        autoExploreSettings: settings
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
            const userId = locals.user.id;
            const result = await purchaseCommander(userId, commanderId, duration);
            return result;
        } catch (e: any) {
            return fail(400, { error: e.message });
        }
    },

    saveSettings: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const enabled = data.get('enabled') === 'on';
        const templateId = Number(data.get('templateId'));
        const originPlanetId = Number(data.get('originPlanetId'));

        if (enabled && (!templateId || !originPlanetId)) {
            return fail(400, { error: 'Template and Planet are required when enabled' });
        }

        try {
            await db.insert(autoExploreSettings)
                .values({
                    userId: locals.user.id,
                    enabled,
                    templateId: templateId || null,
                    originPlanetId: originPlanetId || null
                })
                .onConflictDoUpdate({
                    target: autoExploreSettings.userId,
                    set: {
                        enabled,
                        templateId: templateId || null,
                        originPlanetId: originPlanetId || null
                    }
                });
            
            return { success: true };
        } catch (e: any) {
            return fail(400, { error: e.message });
        }
    }
};
