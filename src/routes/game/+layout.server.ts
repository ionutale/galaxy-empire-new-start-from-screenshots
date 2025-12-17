import { redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { updatePlanetResources } from '$lib/server/game';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(303, '/login');
    }

    // Fetch user's planets
    const planetsRes = await pool.query(
        'SELECT id, name, galaxy_id, system_id, planet_number, image_variant FROM planets WHERE user_id = $1 ORDER BY id ASC',
        [locals.user.id]
    );

    const planets = planetsRes.rows;
    
    if (planets.length === 0) {
        // Should not happen if registration works correctly
        return { user: locals.user, planets: [], currentPlanet: null, resources: null };
    }

    // Default to first planet for now, or use a query param/cookie in future
    const currentPlanet = planets[0];

    // Update and fetch resources for current planet
    const resources = await updatePlanetResources(currentPlanet.id);

    // Fetch user's premium currency (already in locals now, but let's refresh it)
    const userRes = await pool.query('SELECT dark_matter FROM users WHERE id = $1', [locals.user.id]);
    const darkMatter = userRes.rows[0].dark_matter;

    return {
        user: { ...locals.user, darkMatter },
        planets,
        currentPlanet,
        resources
    };
};
