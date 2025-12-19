import { db, userResearch, planetBuildings, planetResources } from '$lib/server/db';
import { RESEARCH, getResearchCost } from '$lib/game-config';
import { updateUserPoints } from '$lib/server/points-calculator';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';

function toCamel(s: string) {
    return s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

export const load: PageServerLoad = async ({ locals, parent }) => {
    if (!locals.user) return {};
    
    const { currentPlanet } = await parent();

    // Get user research levels
    const res = await db.select().from(userResearch).where(eq(userResearch.userId, locals.user.id));
    const userResearchData = res[0] || {};

    // Get Research Lab level on current planet
    const buildRes = await db.select({ researchLab: planetBuildings.researchLab })
        .from(planetBuildings)
        .where(eq(planetBuildings.planetId, currentPlanet.id));
    const researchLabLevel = buildRes[0]?.researchLab || 0;

    return {
        userResearch: userResearchData,
        researchLabLevel,
        techs: RESEARCH
    };
};

export const actions: Actions = {
    research: async ({ request, locals }) => {
        const data = await request.formData();
        const techId = data.get('techId') as string;
        const planetId = Number(data.get('planetId'));

        if (!locals.user) return fail(401, { error: 'Unauthorized' });
        if (!RESEARCH[techId as keyof typeof RESEARCH]) return fail(400, { error: 'Invalid tech' });

        try {
            await db.transaction(async (tx) => {
                // Get current levels
                const res = await tx.select().from(userResearch).where(eq(userResearch.userId, locals.user.id));
                const currentLevel = (res[0] as any)[toCamel(techId)] || 0;
                const nextLevel = currentLevel + 1;

                // Calculate cost
                const cost = getResearchCost(techId, currentLevel);
                if (!cost) throw new Error('Cost calculation failed');

                // Check resources
                const planetRes = await tx.select()
                    .from(planetResources)
                    .where(eq(planetResources.planetId, planetId))
                    .for('update');
                
                const resources = planetRes[0];
                if (!resources) throw new Error('Planet not found');

                if (resources.metal < cost.metal || resources.crystal < cost.crystal || resources.gas < (cost.gas || 0)) {
                    throw new Error('Not enough resources');
                }

                // Check Research Lab
                const buildRes = await tx.select({ researchLab: planetBuildings.researchLab })
                    .from(planetBuildings)
                    .where(eq(planetBuildings.planetId, planetId));
                
                if ((buildRes[0]?.researchLab || 0) < 1) {
                     throw new Error('Research Lab required');
                }

                // Deduct resources
                await tx.update(planetResources)
                    .set({
                        metal: sql`${planetResources.metal} - ${cost.metal}`,
                        crystal: sql`${planetResources.crystal} - ${cost.crystal}`,
                        gas: sql`${planetResources.gas} - ${cost.gas || 0}`
                    })
                    .where(eq(planetResources.planetId, planetId));

                // Upgrade tech
                await tx.update(userResearch)
                    .set({ [toCamel(techId)]: nextLevel })
                    .where(eq(userResearch.userId, locals.user.id));
            });
            
            // Update points
            await updateUserPoints(locals.user.id);

            return { success: true, message: `Research successful` };

        } catch (e: any) {
            console.error(e);
            return fail(500, { error: e.message || 'Internal server error' });
        }
    }
};
