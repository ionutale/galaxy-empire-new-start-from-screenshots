import { pool } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, parent }) => {
    const { currentPlanet } = await parent();
    
    let galaxy = Number(url.searchParams.get('galaxy'));
    let system = Number(url.searchParams.get('system'));

    if (!galaxy || !system) {
        if (currentPlanet) {
            galaxy = currentPlanet.galaxy_id;
            system = currentPlanet.system_id;
        } else {
            galaxy = 1;
            system = 1;
        }
    }

    // Fetch planets in this system
    const planetsRes = await pool.query(
        `SELECT p.planet_number, p.name, p.planet_type, u.username, p.user_id
         FROM planets p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.galaxy_id = $1 AND p.system_id = $2
         ORDER BY p.planet_number ASC`,
        [galaxy, system]
    );

    const occupiedPlanets = planetsRes.rows;
    
    // Create array of 15 slots
    const slots = Array.from({ length: 15 }, (_, i) => {
        const num = i + 1;
        const planet = occupiedPlanets.find(p => p.planet_number === num);
        return {
            number: num,
            planet: planet || null
        };
    });

    return {
        galaxy,
        system,
        slots
    };
};
