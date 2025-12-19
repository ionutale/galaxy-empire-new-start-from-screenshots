import { pool } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
    const { currentPlanet, user } = await parent();

    if (!currentPlanet) {
        return { ships: null, fleets: [], activeFleetsCount: 0 };
    }

    // Fetch ships
    const shipsRes = await pool.query(
        'SELECT * FROM planet_ships WHERE planet_id = $1',
        [currentPlanet.id]
    );

    // Fetch active fleets count
    const fleetsCountRes = await pool.query(
        "SELECT COUNT(*) FROM fleets WHERE user_id = $1 AND (status = 'active' OR status = 'returning')",
        [user.id]
    );
    const activeFleetsCount = parseInt(fleetsCountRes.rows[0].count);

    return {
        ships: shipsRes.rows[0],
        activeFleetsCount
    };
};


export const actions = {
    dispatch: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const data = await request.formData();
        const planetId = Number(data.get('planet_id'));
        const galaxy = Number(data.get('galaxy'));
        const system = Number(data.get('system'));
        const planet = Number(data.get('planet'));
        const mission = data.get('mission') as string;
        
        // Parse ships
        const ships: Record<string, number> = {};
        const shipTypes = ['light_fighter', 'heavy_fighter', 'cruiser', 'battleship', 'small_cargo', 'colony_ship'];
        let totalShips = 0;
        
        for (const type of shipTypes) {
            const count = Number(data.get(type) || 0);
            if (count > 0) {
                ships[type] = count;
                totalShips += count;
            }
        }

        if (totalShips === 0) {
            return fail(400, { error: 'No ships selected' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if user has enough ships
            const shipCheck = await client.query(
                'SELECT * FROM planet_ships WHERE planet_id = $1 FOR UPDATE',
                [planetId]
            );
            
            const availableShips = shipCheck.rows[0];
            for (const [type, count] of Object.entries(ships)) {
                if (availableShips[type] < count) {
                    await client.query('ROLLBACK');
                    return fail(400, { error: `Not enough ${type}` });
                }
            }

            // Deduct ships
            for (const [type, count] of Object.entries(ships)) {
                await client.query(
                    `UPDATE planet_ships SET ${type} = ${type} - $1 WHERE planet_id = $2`,
                    [count, planetId]
                );
            }

            // Calculate arrival time
            let durationSeconds = 30; // Default 30 seconds for demo
            
            if (mission === 'expedition') {
                durationSeconds = 1800; // 30 minutes for expeditions
            }

            const arrivalTime = new Date(Date.now() + durationSeconds * 1000);

            // Create fleet
            await client.query(
                `INSERT INTO fleets (user_id, origin_planet_id, target_galaxy, target_system, target_planet, mission, ships, arrival_time)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [locals.user.id, planetId, galaxy, system, planet, mission, JSON.stringify(ships), arrivalTime]
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
