import { db } from '$lib/server/db';
import { planetShips, fleets, planetResources } from '$lib/server/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { SHIPS } from '$lib/game-config';
import { getFleetTemplates, createFleetTemplate, deleteFleetTemplate } from '$lib/server/fleet-templates';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
    const { currentPlanet, user } = await parent();

    if (!currentPlanet) {
        return { ships: null, fleets: [], activeFleetsCount: 0, templates: [] };
    }

    // Fetch ships
    const shipsRes = await db.select().from(planetShips).where(eq(planetShips.planetId, currentPlanet.id));

    // Fetch active fleets count
    const fleetsCountRes = await db.select({ count: sql<number>`count(*)` })
        .from(fleets)
        .where(and(
            eq(fleets.userId, user.id),
            or(eq(fleets.status, 'active'), eq(fleets.status, 'returning'))
        ));
    
    const activeFleetsCount = Number(fleetsCountRes[0]?.count || 0);

    // Fetch templates
    const templates = await getFleetTemplates(user.id);

    return {
        ships: shipsRes[0],
        activeFleetsCount,
        templates
    };
};


export const actions = {
    createTemplate: async ({ request, locals }) => {
        if (!locals.user) return fail(401);
        const data = await request.formData();
        const name = data.get('name') as string;
        
        const ships: Record<string, number> = {};
        const shipTypes = ['light_fighter', 'heavy_fighter', 'cruiser', 'battleship', 'small_cargo', 'large_cargo', 'colony_ship', 'espionage_probe', 'recycler', 'bomber', 'destroyer', 'death_star', 'battle_cruiser'];
        
        for (const type of shipTypes) {
            const count = Number(data.get(type) || 0);
            if (count > 0) {
                ships[type] = count;
            }
        }

        try {
            await createFleetTemplate(locals.user.id, name, ships);
            return { success: true };
        } catch (e: any) {
            return fail(400, { error: e.message });
        }
    },

    deleteTemplate: async ({ request, locals }) => {
        if (!locals.user) return fail(401);
        const data = await request.formData();
        const id = Number(data.get('id'));

        try {
            await deleteFleetTemplate(locals.user.id, id);
            return { success: true };
        } catch (e: any) {
            return fail(400, { error: e.message });
        }
    },

    dispatch: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const data = await request.formData();
        const planetId = Number(data.get('planet_id'));
        const galaxy = Number(data.get('galaxy'));
        const system = Number(data.get('system'));
        const planet = Number(data.get('planet'));
        const mission = data.get('mission') as string;
        
        // Parse resources
        const metal = Number(data.get('metal') || 0);
        const crystal = Number(data.get('crystal') || 0);
        const gas = Number(data.get('gas') || 0);
        const totalResources = metal + crystal + gas;

        // Parse ships
        const ships: Record<string, number> = {};
        // Using keys from SHIPS to be more comprehensive than the original list
        const shipTypes = Object.keys(SHIPS); 
        
        let totalShips = 0;
        let totalCapacity = 0;
        
        for (const type of shipTypes) {
            const count = Number(data.get(type) || 0);
            if (count > 0) {
                ships[type] = count;
                totalShips += count;
                totalCapacity += (SHIPS[type]?.capacity || 0) * count;
            }
        }

        if (totalShips === 0) {
            return fail(400, { error: 'No ships selected' });
        }

        if (totalResources > totalCapacity) {
            return fail(400, { error: `Not enough cargo capacity. Capacity: ${totalCapacity}, Resources: ${totalResources}` });
        }

        try {
            await db.transaction(async (tx) => {
                // Check if user has enough ships
                const shipCheck = await tx.select()
                    .from(planetShips)
                    .where(eq(planetShips.planetId, planetId))
                    .for('update');
                
                if (shipCheck.length === 0) throw new Error('Planet ships not found');
                const availableShips = shipCheck[0];

                for (const [type, count] of Object.entries(ships)) {
                    // Convert snake_case type to camelCase key for Drizzle object
                    const shipKey = type.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) as keyof typeof planetShips;
                    
                    // Check if key exists on availableShips (it should)
                    const available = availableShips[shipKey];
                    
                    if (typeof available !== 'number' || available < count) {
                        throw new Error(`Not enough ${type}`);
                    }
                }

                // Check if user has enough resources
                const resourceCheck = await tx.select({
                    metal: planetResources.metal,
                    crystal: planetResources.crystal,
                    gas: planetResources.gas
                })
                .from(planetResources)
                .where(eq(planetResources.planetId, planetId))
                .for('update');

                if (resourceCheck.length === 0) throw new Error('Planet resources not found');
                const availableResources = resourceCheck[0];

                if ((availableResources.metal || 0) < metal) throw new Error('Not enough Metal');
                if ((availableResources.crystal || 0) < crystal) throw new Error('Not enough Crystal');
                if ((availableResources.gas || 0) < gas) throw new Error('Not enough Gas');

                // Deduct ships
                for (const [type, count] of Object.entries(ships)) {
                    const shipKey = type.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) as keyof typeof planetShips;
                    const shipColumn = planetShips[shipKey];
                    
                    await tx.update(planetShips)
                        .set({ [shipKey]: sql`${shipColumn} - ${count}` })
                        .where(eq(planetShips.planetId, planetId));
                }

                // Deduct resources
                await tx.update(planetResources)
                    .set({
                        metal: sql`${planetResources.metal} - ${metal}`,
                        crystal: sql`${planetResources.crystal} - ${crystal}`,
                        gas: sql`${planetResources.gas} - ${gas}`
                    })
                    .where(eq(planetResources.planetId, planetId));

                // Calculate arrival time
                let durationSeconds = 30; // Default 30 seconds for demo
                
                if (mission === 'expedition') {
                    durationSeconds = 1800; // 30 minutes for expeditions
                }

                const arrivalTime = new Date(Date.now() + durationSeconds * 1000);

                // Create fleet
                await tx.insert(fleets).values({
                    userId: locals.user.id,
                    originPlanetId: planetId,
                    targetGalaxy: galaxy,
                    targetSystem: system,
                    targetPlanet: planet,
                    mission: mission,
                    ships: ships, // Drizzle handles JSON stringification
                    resources: { metal, crystal, gas },
                    arrivalTime: arrivalTime,
                    status: 'active'
                });
            });

            return { success: true };

        } catch (e: any) {
            if (e.message.startsWith('Not enough')) {
                return fail(400, { error: e.message });
            }
            console.error(e);
            return fail(500, { error: 'Internal server error' });
        }
    }
} satisfies Actions;
