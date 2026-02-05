import { db } from './db';
import { planetResources, planetBuildings, planets } from './db/schema';
import { eq, sql } from 'drizzle-orm';
import { getProduction } from '$lib/game-config';
import { getCommanderBonus } from './commanders';
import { getBoosterMultipliers } from './shop';
import { BuildingService } from './building-service';

export async function updatePlanetResources(planetId: number) {
	return await db.transaction(async (tx) => {
		// Get current resources and user id
		const res = await tx
			.select({
				metal: planetResources.metal,
				crystal: planetResources.crystal,
				gas: planetResources.gas,
				energy: planetResources.energy,
				lastUpdate: planetResources.lastUpdate,
				userId: planets.userId,
				secondsElapsed: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${planetResources.lastUpdate}))`
			})
			.from(planetResources)
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

		// Fetch building levels
		const buildings = await tx
			.select({
				buildingTypeId: planetBuildings.buildingTypeId,
				level: planetBuildings.level
			})
			.from(planetBuildings)
			.where(eq(planetBuildings.planetId, planetId));

		// Map levels
		const levels = {
			metalMine: 0,
			crystalMine: 0,
			gasExtractor: 0,
			solarPlant: 0
		};

		for (const b of buildings) {
			if (b.buildingTypeId === 1) levels.metalMine = b.level || 0;
			if (b.buildingTypeId === 2) levels.crystalMine = b.level || 0;
			if (b.buildingTypeId === 3) levels.gasExtractor = b.level || 0;
			if (b.buildingTypeId === 4) levels.solarPlant = b.level || 0;
		}

		// Get Commander Bonuses
		const mineBonus = await getCommanderBonus(data.userId!, 'mine_production');
		const energyBonus = await getCommanderBonus(data.userId!, 'energy_production');

		// Get Shop Booster Multipliers
		const boosterMultipliers = await getBoosterMultipliers(data.userId!);

		const productionMultiplier = 1 + mineBonus / 100;
		const energyMultiplier = 1 + energyBonus / 100;

		// Calculate production per second
		// Base production (e.g. 30/hour) -> / 3600
		// Formula: (Base + MineProd) * CommanderBonus * BoosterBonus

		const metalProd =
			(getProduction('metal_mine', levels.metalMine) *
				productionMultiplier *
				boosterMultipliers.metal +
				30) /
			3600;
		const crystalProd =
			(getProduction('crystal_mine', levels.crystalMine) *
				productionMultiplier *
				boosterMultipliers.crystal +
				15) /
			3600;
		const gasProd =
			(getProduction('gas_extractor', levels.gasExtractor) *
				productionMultiplier *
				boosterMultipliers.gas) /
			3600;

		// Energy calculation (static, not accumulated)
		const energyProd =
			getProduction('solar_plant', levels.solarPlant) *
			energyMultiplier *
			boosterMultipliers.energy;
		const energyCons =
			Math.ceil(10 * levels.metalMine * Math.pow(1.1, levels.metalMine)) +
			Math.ceil(10 * levels.crystalMine * Math.pow(1.1, levels.crystalMine)) +
			Math.ceil(20 * levels.gasExtractor * Math.pow(1.1, levels.gasExtractor));

		const energy = Math.floor(energyProd - energyCons);

		// Production factor based on energy (simplified: if negative, 0% or reduced? Let's say 0 for now or linear drop)
		let productionFactor = 1.0;
		if (energy < 0) {
			// productionFactor = 0.1; // Penalty
			// For simplicity, let's just keep it 1.0 for this demo or 0 if strictly enforced
			productionFactor = Math.max(0, 1 + energy / energyCons); // Simple linear reduction
		}

		const newMetal = (data.metal || 0) + metalProd * seconds * productionFactor;
		const newCrystal = (data.crystal || 0) + crystalProd * seconds * productionFactor;
		const newGas = (data.gas || 0) + gasProd * seconds * productionFactor;

		// Get storage capacity
		const storageCapacity = await BuildingService.calculatePlanetStorage(planetId);

		// Cap resources to storage limits
		const cappedMetal = Math.min(newMetal, storageCapacity.metal);
		const cappedCrystal = Math.min(newCrystal, storageCapacity.crystal);
		const cappedGas = Math.min(newGas, storageCapacity.gas);

		// Update DB
		await tx
			.update(planetResources)
			.set({
				metal: cappedMetal,
				crystal: cappedCrystal,
				gas: cappedGas,
				energy: energy,
				lastUpdate: sql`NOW()`
			})
			.where(eq(planetResources.planetId, planetId));

		return {
			...data,
			metal: cappedMetal,
			crystal: cappedCrystal,
			gas: cappedGas,
			energy
		};
	});
}
