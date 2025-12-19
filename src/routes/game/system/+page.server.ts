import { db } from '$lib/server/db';
import { planets, users } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, parent }) => {
    const { currentPlanet } = await parent();
    
    let galaxy = Number(url.searchParams.get('galaxy'));
    let system = Number(url.searchParams.get('system'));

    if (!galaxy || !system) {
        if (currentPlanet) {
            galaxy = currentPlanet.galaxyId;
            system = currentPlanet.systemId;
        } else {
            galaxy = 1;
            system = 1;
        }
    }

    // Fetch planets in this system
    const occupiedPlanets = await db.select({
        planetNumber: planets.planetNumber,
        name: planets.name,
        planetType: planets.planetType,
        username: users.username,
        userId: planets.userId
    })
    .from(planets)
    .leftJoin(users, eq(planets.userId, users.id))
    .where(and(
        eq(planets.galaxyId, galaxy),
        eq(planets.systemId, system)
    ))
    .orderBy(asc(planets.planetNumber));
    
    // Create array of 16 slots (1-15 planets, 16 nebula)
    const slots = Array.from({ length: 16 }, (_, i) => {
        const num = i + 1;
        
        if (num === 16) {
            return {
                number: num,
                planet: null,
                isNebula: true
            };
        }

        const planet = occupiedPlanets.find(p => p.planetNumber === num);
        return {
            number: num,
            planet: planet || null,
            isNebula: false
        };
    });

    return {
        galaxy,
        system,
        slots
    };
};
