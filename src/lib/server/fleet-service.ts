import { db } from './db';
import { planetShips, fleets, planetResources } from './db/schema';
import { eq, sql } from 'drizzle-orm';
import { SHIPS } from '$lib/game-config';

export async function dispatchFleet(
    userId: number,
    planetId: number,
    galaxy: number,
    system: number,
    planet: number,
    mission: string,
    ships: Record<string, number>,
    resources: { metal: number; crystal: number; gas: number }
) {
    // Validation
    let totalShips = 0;
    let totalCapacity = 0;
    
    for (const [type, count] of Object.entries(ships)) {
        if (count > 0) {
            totalShips += count;
            totalCapacity += (SHIPS[type]?.capacity || 0) * count;
        }
    }

    if (totalShips === 0) {
        throw new Error('No ships selected');
    }

    const totalResources = resources.metal + resources.crystal + resources.gas;
    if (totalResources > totalCapacity) {
        throw new Error(`Not enough cargo capacity. Capacity: ${totalCapacity}, Resources: ${totalResources}`);
    }

    return await db.transaction(async (tx) => {
        // Check if user has enough ships
        const shipCheck = await tx.select()
            .from(planetShips)
            .where(eq(planetShips.planetId, planetId))
            .for('update');
        
        if (shipCheck.length === 0) throw new Error('Planet ships not found');
        const availableShips = shipCheck[0];

        for (const [type, count] of Object.entries(ships)) {
            const shipKey = type.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            const available = (availableShips as any)[shipKey];
            
            if (typeof available !== 'number' || available < count) {
                throw new Error(`Not enough ${type}`);
            }
        }

        // Check if user has enough resources
        const resourceCheck = await tx.select({
            metal: planetResources.metal,
            crystal: planetResources.crystal,
            gas: planetResources.gas
        })
        .from(planetResources)
        .where(eq(planetResources.planetId, planetId))
        .for('update');

        if (resourceCheck.length === 0) throw new Error('Planet resources not found');
        const availableResources = resourceCheck[0];

        if ((availableResources.metal || 0) < resources.metal) throw new Error('Not enough Metal');
        if ((availableResources.crystal || 0) < resources.crystal) throw new Error('Not enough Crystal');
        if ((availableResources.gas || 0) < resources.gas) throw new Error('Not enough Gas');

        // Deduct ships
        for (const [type, count] of Object.entries(ships)) {
            const shipKey = type.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) as keyof typeof planetShips;
            const shipColumn = planetShips[shipKey];
            
            await tx.update(planetShips)
                .set({ [shipKey]: sql`${shipColumn} - ${count}` })
                .where(eq(planetShips.planetId, planetId));
        }

        // Deduct resources
        await tx.update(planetResources)
            .set({
                metal: sql`${planetResources.metal} - ${resources.metal}`,
                crystal: sql`${planetResources.crystal} - ${resources.crystal}`,
                gas: sql`${planetResources.gas} - ${resources.gas}`
            })
            .where(eq(planetResources.planetId, planetId));

        // Calculate arrival time
        let durationSeconds = 30; // Default 30 seconds for demo
        
        if (mission === 'expedition') {
            durationSeconds = 1800; // 30 minutes for expeditions
        }

        const arrivalTime = new Date(Date.now() + durationSeconds * 1000);

        // Create fleet
        await tx.insert(fleets).values({
            userId: userId,
            originPlanetId: planetId,
            targetGalaxy: galaxy,
            targetSystem: system,
            targetPlanet: planet,
            mission: mission,
            ships: ships,
            resources: resources,
            arrivalTime: arrivalTime,
            status: 'active'
        });
    });
}
