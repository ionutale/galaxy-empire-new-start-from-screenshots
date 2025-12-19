import { pool } from '$lib/server/db';
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
        pool.query('SELECT * FROM planet_buildings WHERE planet_id = $1', [currentPlanet.id]),
        pool.query('SELECT * FROM planet_defenses WHERE planet_id = $1', [currentPlanet.id])
    ]);

    return {
        buildings: buildingsRes.rows[0],
        defenses: defensesRes.rows[0]
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
            
            const { metal, crystal, gas, level } = planetRes.rows[0];
            const cost = getBuildingCost(buildingType, level);

            if (!cost) return fail(400, { error: 'Invalid building' });

            if (metal < cost.metal || crystal < cost.crystal || (cost.gas && gas < cost.gas)) {
                return fail(400, { error: 'Not enough resources' });
            }

            // Deduct resources
            await client.query(
                `UPDATE planet_resources 
                 SET metal = metal - $1, crystal = crystal - $2, gas = gas - $3
                 WHERE planet_id = $4`,
                [cost.metal, cost.crystal, cost.gas || 0, planetId]
            );

            // Upgrade building
            await client.query(
                `UPDATE planet_buildings 
                 SET ${buildingType} = ${buildingType} + 1 
                 WHERE planet_id = $1`,
                [planetId]
            );

            await client.query('COMMIT');
            
            // Update points
            await updateUserPoints(locals.user.id);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        return { success: true };
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
                gas: (defenseConfig.cost.gas || 0) * amount
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

            // Build defense
            await client.query(
                `UPDATE planet_defenses 
                 SET ${defenseType} = ${defenseType} + $1 
                 WHERE planet_id = $2`,
                [amount, planetId]
            );

            await client.query('COMMIT');
            
            // Update points
            await updateUserPoints(locals.user.id);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        return { success: true };
    }
} satisfies Actions;
