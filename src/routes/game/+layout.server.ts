import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { planets, users, messages } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
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
    const planetsRes = await db.select({
        id: planets.id,
        name: planets.name,
        galaxyId: planets.galaxyId,
        systemId: planets.systemId,
        planetNumber: planets.planetNumber,
        imageVariant: planets.imageVariant
    })
    .from(planets)
    .where(eq(planets.userId, locals.user.id))
    .orderBy(asc(planets.id));

    // Refresh user DM
    const userRes = await db.select({ darkMatter: users.darkMatter })
        .from(users)
        .where(eq(users.id, locals.user.id));
    
    if (userRes.length > 0) {
        locals.user.darkMatter = userRes[0].darkMatter || 0;
    }

    const userPlanets = planetsRes;
    
    if (userPlanets.length === 0) {
        // Should not happen if registration works correctly
        return { user: locals.user, planets: [], currentPlanet: null, resources: null };
    }

    // Determine current planet
    let currentPlanet = userPlanets[0];
    const queryPlanetId = url.searchParams.get('planet');
    const cookiePlanetId = cookies.get('currentPlanetId');

    if (queryPlanetId) {
        const selected = userPlanets.find(p => p.id === parseInt(queryPlanetId));
        if (selected) {
            currentPlanet = selected;
            cookies.set('currentPlanetId', currentPlanet.id.toString(), { path: '/', httpOnly: true, sameSite: 'strict', maxAge: 60 * 60 * 24 * 30 });
        }
    } else if (cookiePlanetId) {
        const selected = userPlanets.find(p => p.id === parseInt(cookiePlanetId));
        if (selected) {
            currentPlanet = selected;
        }
    }

    // Update and fetch resources for current planet
    const resources = await updatePlanetResources(currentPlanet.id);

    // Fetch unread messages count
    // Drizzle count() helper or raw sql
    // Using length of array for simplicity if not too many messages, or count query
    // Better to use count query
    const msgRes = await db.select({ id: messages.id })
        .from(messages)
        .where(and(
            eq(messages.userId, locals.user.id),
            eq(messages.isRead, false)
        ));
    
    const unreadMessages = msgRes.length;

    return {
        user: locals.user,
        planets: userPlanets,
        currentPlanet,
        resources,
        unreadMessages
    };
};
