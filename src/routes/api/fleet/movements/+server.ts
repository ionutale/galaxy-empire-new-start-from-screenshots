import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { fleets, planets } from '$lib/server/db/schema';
import { eq, and, notInArray, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = Number(url.searchParams.get('limit')) || 25;
    const offset = Number(url.searchParams.get('offset')) || 0;

    const fleetsRes = await db.select({
        id: fleets.id,
        userId: fleets.userId,
        originPlanetId: fleets.originPlanetId,
        targetGalaxy: fleets.targetGalaxy,
        targetSystem: fleets.targetSystem,
        targetPlanet: fleets.targetPlanet,
        mission: fleets.mission,
        ships: fleets.ships,
        resources: fleets.resources,
        departureTime: fleets.departureTime,
        arrivalTime: fleets.arrivalTime,
        returnTime: fleets.returnTime,
        status: fleets.status,
        originGalaxy: planets.galaxyId,
        originSystem: planets.systemId,
        originPlanet: planets.planetNumber
    })
    .from(fleets)
    .innerJoin(planets, eq(fleets.originPlanetId, planets.id))
    .where(and(
        eq(fleets.userId, locals.user.id),
        notInArray(fleets.status, ['completed', 'destroyed'])
    ))
    .orderBy(asc(fleets.arrivalTime))
    .limit(limit)
    .offset(offset);

    return json({ fleets: fleetsRes });
};
