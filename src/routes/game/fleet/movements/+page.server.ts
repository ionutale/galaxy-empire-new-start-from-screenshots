import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
    const { currentPlanet } = await parent();

    if (!currentPlanet) {
        return { fleets: [] };
    }

    // Fetch active fleets (own fleets)
    const fleetsRes = await pool.query(
        `SELECT f.*, 
                p.galaxy_id as origin_galaxy, 
                p.system_id as origin_system, 
                p.planet_number as origin_planet
         FROM fleets f
         JOIN planets p ON f.origin_planet_id = p.id
         WHERE f.user_id = (SELECT user_id FROM planets WHERE id = $1) 
         AND f.status != 'completed'
         ORDER BY f.arrival_time ASC`,
        [currentPlanet.id]
    );

    return {
        fleets: fleetsRes.rows
    };
};
