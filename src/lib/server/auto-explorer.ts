import { db } from './db';
import { users, userCommanders, autoExploreSettings, fleetTemplates, fleets, userResearch, planets } from './db/schema';
import { eq, and, gt, sql, or } from 'drizzle-orm';
import { dispatchFleet } from './fleet-service';

export async function processAutoExplore() {
    try {
        // 1. Find users with active Nebula Explorer and enabled settings
        const activeExplorers = await db.select({
            userId: autoExploreSettings.userId,
            templateId: autoExploreSettings.templateId,
            originPlanetId: autoExploreSettings.originPlanetId,
            templateShips: fleetTemplates.ships,
            computerTech: userResearch.computerTech,
            galaxy: planets.galaxyId,
            system: planets.systemId
        })
        .from(autoExploreSettings)
        .innerJoin(userCommanders, and(
            eq(autoExploreSettings.userId, userCommanders.userId),
            eq(userCommanders.commanderId, 'nebula_explorer'),
            gt(userCommanders.expiresAt, new Date())
        ))
        .innerJoin(fleetTemplates, eq(autoExploreSettings.templateId, fleetTemplates.id))
        .innerJoin(userResearch, eq(autoExploreSettings.userId, userResearch.userId))
        .innerJoin(planets, eq(autoExploreSettings.originPlanetId, planets.id))
        .where(eq(autoExploreSettings.enabled, true));

        console.log(`Found ${activeExplorers.length} active auto-explorers`);

        for (const explorer of activeExplorers) {
            try {
                // 2. Check fleet slots
                const maxFleets = 1 + (explorer.computerTech || 0);
                
                const activeFleetsRes = await db.select({ count: sql<number>`count(*)` })
                    .from(fleets)
                    .where(and(
                        eq(fleets.userId, explorer.userId),
                        or(eq(fleets.status, 'active'), eq(fleets.status, 'returning'))
                    ));
                
                const activeFleets = Number(activeFleetsRes[0]?.count || 0);

                if (activeFleets >= maxFleets) {
                    continue; // No slots available
                }

                // 3. Dispatch Fleet
                // Target: Random coordinates? Or specific expedition slot (16)?
                // Usually expeditions go to slot 16 of the current system.
                const targetGalaxy = explorer.galaxy;
                const targetSystem = explorer.system;
                const targetPlanet = 16;

                const ships = explorer.templateShips as Record<string, number>;

                await dispatchFleet(
                    explorer.userId,
                    explorer.originPlanetId!,
                    targetGalaxy,
                    targetSystem,
                    targetPlanet,
                    'expedition',
                    ships,
                    { metal: 0, crystal: 0, gas: 0 } // No resources for now
                );

                console.log(`Auto-dispatched expedition for user ${explorer.userId}`);

            } catch (err) {
                // Log error but continue with other users
                // Common errors: Not enough ships, etc.
                console.log(`Failed to auto-dispatch for user ${explorer.userId}: ${(err as Error).message}`);
            }
        }

    } catch (e) {
        console.error('Error in processAutoExplore:', e);
    }
}
