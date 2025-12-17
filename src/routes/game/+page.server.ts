import { pool } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { getBuildingCost } from '$lib/game-config';
import { updatePlanetResources } from '$lib/server/game';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
    const { currentPlanet } = await parent();

    if (!currentPlanet) {
        return { buildings: null };
    }

    const buildingsRes = await pool.query(
        'SELECT * FROM planet_buildings WHERE planet_id = $1',
        [currentPlanet.id]
    );

    return {
        buildings: buildingsRes.rows[0]
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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get current level and resources
            const planetRes = await client.query(
                `SELECT r.metal, r.crystal, r.gas, b.${buildingType} as level 
                 FROM planet_resources r
                 JOIN planet_buildings b ON r.planet_id = b.planet_id
                 WHERE r.planet_id = $1`,
                [planetId]
            );
            
            if (planetRes.rows.length === 0) return fail(404);
            
            const { metal, crystal, level } = planetRes.rows[0];
            const cost = getBuildingCost(buildingType, level);

            if (!cost) return fail(400, { error: 'Invalid building' });

            if (metal < cost.metal || crystal < cost.crystal) {
                return fail(400, { error: 'Not enough resources' });
            }

            // Deduct resources
            await client.query(
                `UPDATE planet_resources 
                 SET metal = metal - $1, crystal = crystal - $2 
                 WHERE planet_id = $3`,
                [cost.metal, cost.crystal, planetId]
            );

            // Upgrade building
            await client.query(
                `UPDATE planet_buildings 
                 SET ${buildingType} = ${buildingType} + 1 
                 WHERE planet_id = $1`,
                [planetId]
            );

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        return { success: true };
    }
} satisfies Actions;
