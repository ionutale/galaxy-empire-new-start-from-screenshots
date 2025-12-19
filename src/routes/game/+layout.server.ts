import { redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { updatePlanetResources } from '$lib/server/game';
import { processFleets } from '$lib/server/fleet-processor';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends, url, cookies }) => {
    if (!locals.user) {
        throw redirect(303, '/login');
    }

    depends('app:unread-messages');

    // Trigger fleet processing on page load (Lazy approach for demo)
    // In production, use a separate worker/cron
    await processFleets();

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

    // Determine current planet
    let currentPlanet = planets[0];
    const queryPlanetId = url.searchParams.get('planet');
    const cookiePlanetId = cookies.get('currentPlanetId');

    if (queryPlanetId) {
        const selected = planets.find(p => p.id === parseInt(queryPlanetId));
        if (selected) {
            currentPlanet = selected;
            cookies.set('currentPlanetId', currentPlanet.id.toString(), { path: '/', httpOnly: true, sameSite: 'strict', maxAge: 60 * 60 * 24 * 30 });
        }
    } else if (cookiePlanetId) {
        const selected = planets.find(p => p.id === parseInt(cookiePlanetId));
        if (selected) {
            currentPlanet = selected;
        }
    }

    // Update and fetch resources for current planet
    const resources = await updatePlanetResources(currentPlanet.id);

    // Fetch user's premium currency
    const userRes = await pool.query('SELECT dark_matter FROM users WHERE id = $1', [locals.user.id]);
    const darkMatter = userRes.rows[0].dark_matter;

    // Fetch unread messages count
    const msgRes = await pool.query(
        'SELECT COUNT(*) as count FROM messages WHERE user_id = $1 AND is_read = FALSE',
        [locals.user.id]
    );
    const unreadMessages = parseInt(msgRes.rows[0].count);

    return {
        user: { ...locals.user, darkMatter },
        planets,
        currentPlanet,
        resources,
        unreadMessages
    };
};
