import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { 
    planets, 
    buildingQueue, 
    fleets, 
    planetShips, 
    planetDefenses, 
    planetBuildings, 
    planetResources 
} from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

    try {
        const { planetId } = await request.json();

		if (!planetId) {
            return json({ error: 'Missing planetId' }, { status: 400 });
        }

        // Check if this is the user's only planet
        const userPlanets = await db
            .select({ id: planets.id })
            .from(planets)
            .where(eq(planets.userId, locals.user.id));

        if (userPlanets.length <= 1) {
            return json({ error: 'Cannot abandon your last planet' }, { status: 400 });
        }

        // Verify planet ownership
        const planet = await db
            .select()
            .from(planets)
            .where(eq(planets.id, planetId))
            .limit(1);

        if (!planet.length || planet[0].userId !== locals.user.id) {
            return json({ error: 'Planet not found or not owned by user' }, { status: 404 });
        }

        // Delete all related data in correct order (foreign key constraints)
        await db.transaction(async (tx) => {
            // Delete building queue
            await tx.delete(buildingQueue).where(eq(buildingQueue.planetId, planetId));

            // Delete fleets (set to return to another planet or delete)
            const otherPlanet = userPlanets.find(p => p.id !== planetId);
            if (otherPlanet) {
                // Move fleets to another planet
                await tx
                    .update(fleets)
                    .set({
                        originPlanetId: otherPlanet.id,
                        mission: 'return',
                        arrivalTime: sql`NOW() + INTERVAL '1 minute'`,
                        returnTime: null
                    })
                    .where(eq(fleets.originPlanetId, planetId));
            } else {
                // Delete fleets if no other planet (though check above prevents this for last planet, 
                // but safeguard for edge cases)
                await tx.delete(fleets).where(eq(fleets.originPlanetId, planetId));
            }

            // Delete planet data
            await tx.delete(planetShips).where(eq(planetShips.planetId, planetId));
            await tx.delete(planetDefenses).where(eq(planetDefenses.planetId, planetId));
            await tx.delete(planetBuildings).where(eq(planetBuildings.planetId, planetId));
            await tx.delete(planetResources).where(eq(planetResources.planetId, planetId));

            // Finally delete the planet
            await tx.delete(planets).where(eq(planets.id, planetId));
        });

		return json({ success: true });
	} catch (error) {
		console.error('Planet abandonment error:', error);
		return json({ error: 'Failed to abandon planet' }, { status: 500 });
	}
};
