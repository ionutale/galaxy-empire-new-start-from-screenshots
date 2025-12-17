import { pool } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { SHIPS } from '$lib/game-config';
import { updatePlanetResources } from '$lib/server/game';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
    const { currentPlanet } = await parent();

    if (!currentPlanet) {
        return { ships: null };
    }

    const shipsRes = await pool.query(
        'SELECT * FROM planet_ships WHERE planet_id = $1',
        [currentPlanet.id]
    );

    const buildRes = await pool.query(
        'SELECT shipyard FROM planet_buildings WHERE planet_id = $1',
        [currentPlanet.id]
    );
    const shipyardLevel = buildRes.rows[0]?.shipyard || 0;

    return {
        ships: shipsRes.rows[0],
        shipyardLevel
    };
};

export const actions = {
    build: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const data = await request.formData();
        const shipType = data.get('type') as string;
        const amount = Number(data.get('amount') || 1);
        const planetId = Number(data.get('planet_id'));

        if (!shipType || !planetId || amount < 1) return fail(400);

        const shipConfig = SHIPS[shipType as keyof typeof SHIPS];
        if (!shipConfig) return fail(400, { error: 'Invalid ship type' });

        // Update resources first
        await updatePlanetResources(planetId);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check Shipyard Level
            const buildRes = await client.query(
                'SELECT shipyard FROM planet_buildings WHERE planet_id = $1',
                [planetId]
            );
            if ((buildRes.rows[0]?.shipyard || 0) < 1) {
                await client.query('ROLLBACK');
                return fail(400, { error: 'Shipyard required' });
            }

            // Update resources (re-fetch inside transaction to be safe, though updatePlanetResources does it outside)
            // Ideally updatePlanetResources should be inside transaction or we lock resources.
            // For now, we rely on the check below.
            
            // Check resources
            const resCheck = await client.query(
                'SELECT metal, crystal, gas FROM planet_resources WHERE planet_id = $1 FOR UPDATE',
                [planetId]
            );
            const resources = resCheck.rows[0];

            const totalCost = {
                metal: shipConfig.cost.metal * amount,
                crystal: shipConfig.cost.crystal * amount,
                gas: shipConfig.cost.gas * amount
            };

            if (resources.metal < totalCost.metal || 
                resources.crystal < totalCost.crystal || 
                resources.gas < totalCost.gas) {
                await client.query('ROLLBACK');
                return fail(400, { error: 'Not enough resources' });
            }

            // Deduct resources
            await client.query(
                `UPDATE planet_resources 
                 SET metal = metal - $1, crystal = crystal - $2, gas = gas - $3 
                 WHERE planet_id = $4`,
                [totalCost.metal, totalCost.crystal, totalCost.gas, planetId]
            );

            // Ensure planet_ships row exists
            await client.query(
                'INSERT INTO planet_ships (planet_id) VALUES ($1) ON CONFLICT (planet_id) DO NOTHING',
                [planetId]
            );

            // Add ships (Instant build for now)
            await client.query(
                `UPDATE planet_ships 
                 SET ${shipType} = ${shipType} + $1 
                 WHERE planet_id = $2`,
                [amount, planetId]
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
