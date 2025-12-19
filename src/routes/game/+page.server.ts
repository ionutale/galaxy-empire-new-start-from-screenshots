import { db } from '$lib/server/db';
import { planetBuildings, planetDefenses, planetResources } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { getBuildingCost, DEFENSES } from '$lib/game-config';
import { updatePlanetResources } from '$lib/server/game';
import { updateUserPoints } from '$lib/server/points-calculator';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
    const { currentPlanet } = await parent();

    if (!currentPlanet) {
        return { buildings: null, defenses: null };
    }

    const [buildingsRes, defensesRes] = await Promise.all([
        db.select().from(planetBuildings).where(eq(planetBuildings.planetId, currentPlanet.id)),
        db.select().from(planetDefenses).where(eq(planetDefenses.planetId, currentPlanet.id))
    ]);

    return {
        buildings: buildingsRes[0],
        defenses: defensesRes[0]
    };
};

export const actions = {
    upgrade: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const data = await request.formData();
        const buildingType = data.get('type') as string;
        const planetId = Number(data.get('planet_id'));

        if (!buildingType || !planetId) return fail(400);

        // Update resources first to get accurate count
        await updatePlanetResources(planetId);

        try {
            await db.transaction(async (tx) => {
                // Get current level and resources
                // We need to map buildingType (snake_case) to column (camelCase)
                const buildingKey = buildingType.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) as keyof typeof planetBuildings;
                const buildingColumn = planetBuildings[buildingKey];
                
                if (!buildingColumn) throw new Error('Invalid building type column');

                const planetRes = await tx.select({
                    metal: planetResources.metal,
                    crystal: planetResources.crystal,
                    gas: planetResources.gas,
                    level: buildingColumn
                })
                .from(planetResources)
                .innerJoin(planetBuildings, eq(planetResources.planetId, planetBuildings.planetId))
                .where(eq(planetResources.planetId, planetId))
                .for('update'); // Lock resources
                
                if (planetRes.length === 0) return fail(404);
                
                const { metal, crystal, gas, level } = planetRes[0];
                const currentLevel = level || 0;
                const cost = getBuildingCost(buildingType, currentLevel);

                if (!cost) throw new Error('Invalid building');

                if ((metal || 0) < cost.metal || (crystal || 0) < cost.crystal || (cost.gas && (gas || 0) < cost.gas)) {
                    throw new Error('Not enough resources');
                }

                // Deduct resources
                await tx.update(planetResources)
                    .set({
                        metal: sql`${planetResources.metal} - ${cost.metal}`,
                        crystal: sql`${planetResources.crystal} - ${cost.crystal}`,
                        gas: sql`${planetResources.gas} - ${cost.gas || 0}`
                    })
                    .where(eq(planetResources.planetId, planetId));

                // Upgrade building
                await tx.update(planetBuildings)
                    .set({ [buildingKey]: sql`${buildingColumn} + 1` })
                    .where(eq(planetBuildings.planetId, planetId));
            });
            
            // Update points
            await updateUserPoints(locals.user.id);
            return { success: true };

        } catch (e: any) {
            if (e.message === 'Not enough resources' || e.message === 'Invalid building') {
                return fail(400, { error: e.message });
            }
            console.error(e);
            return fail(500, { error: 'Internal server error' });
        }
    },

    build_defense: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const data = await request.formData();
        const defenseType = data.get('type') as string;
        const amount = Number(data.get('amount') || 1);
        const planetId = Number(data.get('planet_id'));

        if (!defenseType || !planetId || amount < 1) return fail(400);

        const defenseConfig = DEFENSES[defenseType as keyof typeof DEFENSES];
        if (!defenseConfig) return fail(400, { error: 'Invalid defense type' });

        // Update resources first
        await updatePlanetResources(planetId);

        try {
            await db.transaction(async (tx) => {
                // Check Shipyard Level
                const buildRes = await tx.select({ shipyard: planetBuildings.shipyard })
                    .from(planetBuildings)
                    .where(eq(planetBuildings.planetId, planetId));
                
                if ((buildRes[0]?.shipyard || 0) < 1) {
                    throw new Error('Shipyard required');
                }

                // Check resources
                const resCheck = await tx.select({
                    metal: planetResources.metal,
                    crystal: planetResources.crystal,
                    gas: planetResources.gas
                })
                .from(planetResources)
                .where(eq(planetResources.planetId, planetId))
                .for('update');
                
                const resources = resCheck[0];

                const totalCost = {
                    metal: defenseConfig.cost.metal * amount,
                    crystal: defenseConfig.cost.crystal * amount,
                    gas: (defenseConfig.cost.gas || 0) * amount
                };

                if ((resources.metal || 0) < totalCost.metal || 
                    (resources.crystal || 0) < totalCost.crystal || 
                    (resources.gas || 0) < totalCost.gas) {
                    throw new Error('Not enough resources');
                }

                // Check max limit (for shields)
                const defenseKey = defenseType.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) as keyof typeof planetDefenses;
                const defenseColumn = planetDefenses[defenseKey];
                
                if (!defenseColumn) throw new Error('Invalid defense column');

                if (defenseConfig.max) {
                    const currentDefRes = await tx.select({ level: defenseColumn })
                        .from(planetDefenses)
                        .where(eq(planetDefenses.planetId, planetId));
                    
                    const currentAmount = currentDefRes[0]?.level || 0;
                    if (currentAmount + amount > defenseConfig.max) {
                        throw new Error(`Max limit reached for ${defenseConfig.name}`);
                    }
                }

                // Deduct resources
                await tx.update(planetResources)
                    .set({
                        metal: sql`${planetResources.metal} - ${totalCost.metal}`,
                        crystal: sql`${planetResources.crystal} - ${totalCost.crystal}`,
                        gas: sql`${planetResources.gas} - ${totalCost.gas}`
                    })
                    .where(eq(planetResources.planetId, planetId));

                // Build defense
                await tx.update(planetDefenses)
                    .set({ [defenseKey]: sql`${defenseColumn} + ${amount}` })
                    .where(eq(planetDefenses.planetId, planetId));
            });
            
            // Update points
            await updateUserPoints(locals.user.id);
            return { success: true };

        } catch (e: any) {
            if (e.message.startsWith('Not enough') || e.message.startsWith('Max limit') || e.message === 'Shipyard required') {
                return fail(400, { error: e.message });
            }
            console.error(e);
            return fail(500, { error: 'Internal server error' });
        }
    }
} satisfies Actions;
