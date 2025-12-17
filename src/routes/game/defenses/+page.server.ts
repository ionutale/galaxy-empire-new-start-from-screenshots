import { pool } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { DEFENSES } from '$lib/game-config';
import { updatePlanetResources } from '$lib/server/game';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
    const { currentPlanet } = await parent();

    if (!currentPlanet) {
        return { defenses: null, shipyardLevel: 0 };
    }

    const defensesRes = await pool.query(
        'SELECT * FROM planet_defenses WHERE planet_id = $1',
        [currentPlanet.id]
    );

    const buildRes = await pool.query(
        'SELECT shipyard FROM planet_buildings WHERE planet_id = $1',
        [currentPlanet.id]
    );
    const shipyardLevel = buildRes.rows[0]?.shipyard || 0;

    return {
        defenses: defensesRes.rows[0],
        shipyardLevel
    };
};

export const actions: Actions = {
    build: async ({ request, locals }) => {
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

            // Check resources
            const resCheck = await client.query(
                'SELECT metal, crystal, gas FROM planet_resources WHERE planet_id = $1 FOR UPDATE',
                [planetId]
            );
            const resources = resCheck.rows[0];

            const totalCost = {
                metal: defenseConfig.cost.metal * amount,
                crystal: defenseConfig.cost.crystal * amount,
                gas: defenseConfig.cost.gas * amount
            };

            if (resources.metal < totalCost.metal || 
                resources.crystal < totalCost.crystal || 
                resources.gas < totalCost.gas) {
                await client.query('ROLLBACK');
                return fail(400, { error: 'Not enough resources' });
            }

            // Check max limit (for shields)
            if (defenseConfig.max) {
                const currentDefRes = await client.query(
                    `SELECT ${defenseType} FROM planet_defenses WHERE planet_id = $1`,
                    [planetId]
                );
                const currentAmount = currentDefRes.rows[0][defenseType] || 0;
                if (currentAmount + amount > defenseConfig.max) {
                    await client.query('ROLLBACK');
                    return fail(400, { error: `Max limit reached for ${defenseConfig.name}` });
                }
            }

            // Deduct resources
            await client.query(
                `UPDATE planet_resources 
                 SET metal = metal - $1, crystal = crystal - $2, gas = gas - $3 
                 WHERE planet_id = $4`,
                [totalCost.metal, totalCost.crystal, totalCost.gas, planetId]
            );

            // Add defenses (Instant for now)
            await client.query(
                `UPDATE planet_defenses SET ${defenseType} = ${defenseType} + $1 WHERE planet_id = $2`,
                [amount, planetId]
            );

            await client.query('COMMIT');
            return { success: true, message: `Built ${amount} ${defenseConfig.name}` };

        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Internal server error' });
        } finally {
            client.release();
        }
    }
};
