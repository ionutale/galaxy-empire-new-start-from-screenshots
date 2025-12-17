import { pool } from '$lib/server/db';
import { RESEARCH, getResearchCost } from '$lib/game-config';
import { updatePlanetResources } from '$lib/server/game';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, parent }) => {
    if (!locals.user) return {};
    
    const { currentPlanet } = await parent();

    // Get user research levels
    const res = await pool.query('SELECT * FROM user_research WHERE user_id = $1', [locals.user.id]);
    const userResearch = res.rows[0] || {};

    // Get Research Lab level on current planet
    const buildRes = await pool.query(
        'SELECT research_lab FROM planet_buildings WHERE planet_id = $1',
        [currentPlanet.id]
    );
    const researchLabLevel = buildRes.rows[0]?.research_lab || 0;

    return {
        userResearch,
        researchLabLevel,
        techs: RESEARCH
    };
};

export const actions: Actions = {
    research: async ({ request, locals }) => {
        const data = await request.formData();
        const techId = data.get('techId') as string;
        const planetId = data.get('planetId') as string;

        if (!locals.user) return fail(401, { error: 'Unauthorized' });
        if (!RESEARCH[techId as keyof typeof RESEARCH]) return fail(400, { error: 'Invalid tech' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get current levels
            const res = await client.query('SELECT * FROM user_research WHERE user_id = $1', [locals.user.id]);
            const currentLevel = res.rows[0][techId] || 0;
            const nextLevel = currentLevel + 1;

            // Calculate cost
            const cost = getResearchCost(techId, currentLevel);
            if (!cost) return fail(500, { error: 'Cost calculation failed' });

            // Check resources
            const { resources } = await updatePlanetResources(parseInt(planetId));
            
            if (resources.metal < cost.metal || resources.crystal < cost.crystal || resources.gas < cost.gas) {
                await client.query('ROLLBACK');
                return fail(400, { error: 'Not enough resources' });
            }

            // Check Research Lab
            const buildRes = await client.query(
                'SELECT research_lab FROM planet_buildings WHERE planet_id = $1',
                [planetId]
            );
            if ((buildRes.rows[0]?.research_lab || 0) < 1) {
                 await client.query('ROLLBACK');
                 return fail(400, { error: 'Research Lab required' });
            }

            // Deduct resources
            await client.query(
                `UPDATE planet_resources 
                 SET metal = metal - $1, crystal = crystal - $2, gas = gas - $3 
                 WHERE planet_id = $4`,
                [cost.metal, cost.crystal, cost.gas, planetId]
            );

            // Upgrade tech (Instant for now)
            await client.query(
                `UPDATE user_research SET ${techId} = ${techId} + 1 WHERE user_id = $1`,
                [locals.user.id]
            );

            await client.query('COMMIT');
            return { success: true, message: `Researched ${RESEARCH[techId as keyof typeof RESEARCH].name} level ${nextLevel}` };

        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Internal server error' });
        } finally {
            client.release();
        }
    }
};
