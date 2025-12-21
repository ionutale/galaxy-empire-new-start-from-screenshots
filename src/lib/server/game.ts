import { db } from './db';
import { planetResources, planetBuildings, planets } from './db/schema';
import { eq, sql } from 'drizzle-orm';
import { getProduction } from '$lib/game-config';
import { getCommanderBonus } from './commanders';
import { getBoosterMultipliers } from './shop';

export async function updatePlanetResources(planetId: number) {
    return await db.transaction(async (tx) => {
        // Get current resources and building levels
        const res = await tx.select({
            metal: planetResources.metal,
            crystal: planetResources.crystal,
            gas: planetResources.gas,
            energy: planetResources.energy,
            lastUpdate: planetResources.lastUpdate,
            metalMine: planetBuildings.metalMine,
            crystalMine: planetBuildings.crystalMine,
            gasExtractor: planetBuildings.gasExtractor,
            solarPlant: planetBuildings.solarPlant,
            userId: planets.userId,
            secondsElapsed: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${planetResources.lastUpdate}))`
        })
        .from(planetResources)
        .innerJoin(planetBuildings, eq(planetResources.planetId, planetBuildings.planetId))
        .innerJoin(planets, eq(planetResources.planetId, planets.id))
        .where(eq(planetResources.planetId, planetId));

        if (res.length === 0) {
            return null;
        }

        const data = res[0];
        const seconds = data.secondsElapsed;

        if (seconds < 1) {
            return data; // No significant time passed
        }

        // Get Commander Bonuses
        const mineBonus = await getCommanderBonus(data.userId!, 'mine_production');
        const energyBonus = await getCommanderBonus(data.userId!, 'energy_production');
        
        // Get Shop Booster Multipliers
        const boosterMultipliers = await getBoosterMultipliers(data.userId!);

        const productionMultiplier = 1 + (mineBonus / 100);
        const energyMultiplier = 1 + (energyBonus / 100);

        // Calculate production per second
        // Base production (e.g. 30/hour) -> / 3600
        // Formula: (Base + MineProd) * CommanderBonus * BoosterBonus
        
        const metalProd = ((getProduction('metal_mine', data.metalMine!) * productionMultiplier * boosterMultipliers.metal) + 30) / 3600; 
        const crystalProd = ((getProduction('crystal_mine', data.crystalMine!) * productionMultiplier * boosterMultipliers.crystal) + 15) / 3600; 
        const gasProd = (getProduction('gas_extractor', data.gasExtractor!) * productionMultiplier * boosterMultipliers.gas) / 3600;
        
        // Energy calculation (static, not accumulated)
        const energyProd = getProduction('solar_plant', data.solarPlant!) * energyMultiplier * boosterMultipliers.energy;
        const energyCons = 
            Math.ceil(10 * data.metalMine! * Math.pow(1.1, data.metalMine!)) + 
            Math.ceil(10 * data.crystalMine! * Math.pow(1.1, data.crystalMine!)) +
            Math.ceil(20 * data.gasExtractor! * Math.pow(1.1, data.gasExtractor!));
            
        const energy = Math.floor(energyProd - energyCons);
        
        // Production factor based on energy (simplified: if negative, 0% or reduced? Let's say 0 for now or linear drop)
        let productionFactor = 1.0;
        if (energy < 0) {
            // productionFactor = 0.1; // Penalty
            // For simplicity, let's just keep it 1.0 for this demo or 0 if strictly enforced
             productionFactor = Math.max(0, 1 + (energy / energyCons)); // Simple linear reduction
        }

        const newMetal = (data.metal || 0) + (metalProd * seconds * productionFactor);
        const newCrystal = (data.crystal || 0) + (crystalProd * seconds * productionFactor);
        const newGas = (data.gas || 0) + (gasProd * seconds * productionFactor);

        // Update DB
        await tx.update(planetResources)
            .set({
                metal: newMetal,
                crystal: newCrystal,
                gas: newGas,
                energy: energy,
                lastUpdate: sql`NOW()`
            })
            .where(eq(planetResources.planetId, planetId));
        
        return {
            ...data,
            metal: newMetal,
            crystal: newCrystal,
            gas: newGas,
            energy
        };
    });
}
