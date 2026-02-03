import {
	db,
	planets,
	planetBuildings,
	planetShips,
	planetDefenses,
	userResearch,
	fleets,
	users
} from './db';
import { BUILDINGS, RESEARCH, SHIPS, DEFENSES } from '$lib/game-config';
import { eq } from 'drizzle-orm';

export function calculateBuildingPoints(type: string, level: number): number {
	const building = BUILDINGS[type as keyof typeof BUILDINGS];
	if (!building || level < 1) return 0;

	let totalMetal = 0;
	let totalCrystal = 0;
	let totalGas = 0;

	for (let l = 1; l <= level; l++) {
		totalMetal += Math.floor(building.baseCost.metal * Math.pow(building.costFactor, l - 1));
		totalCrystal += Math.floor(building.baseCost.crystal * Math.pow(building.costFactor, l - 1));
		if (building.baseCost.gas) {
			totalGas += Math.floor(building.baseCost.gas * Math.pow(building.costFactor, l - 1));
		}
	}

	return (totalMetal + totalCrystal + totalGas) / 1000;
}

export function calculateResearchPoints(type: string, level: number): number {
	const tech = RESEARCH[type as keyof typeof RESEARCH];
	if (!tech || level < 1) return 0;

	let totalMetal = 0;
	let totalCrystal = 0;
	let totalGas = 0;

	for (let l = 1; l <= level; l++) {
		totalMetal += Math.floor(tech.baseCost.metal * Math.pow(tech.costFactor, l - 1));
		totalCrystal += Math.floor(tech.baseCost.crystal * Math.pow(tech.costFactor, l - 1));
		if (tech.baseCost.gas) {
			totalGas += Math.floor(tech.baseCost.gas * Math.pow(tech.costFactor, l - 1));
		}
	}

	return (totalMetal + totalCrystal + totalGas) / 1000;
}

function toSnake(s: string) {
	return s.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export async function updateUserPoints(userId: number) {
	try {
		let points = 0;

		// 1. Buildings & Defenses & Ships (on planets)
		const userPlanets = await db
			.select({ id: planets.id })
			.from(planets)
			.where(eq(planets.userId, userId));

		for (const planet of userPlanets) {
			// Buildings
			const bRes = await db
				.select()
				.from(planetBuildings)
				.where(eq(planetBuildings.planetId, planet.id));
			const buildings = bRes[0] || {};
			for (const [key, level] of Object.entries(buildings)) {
				if (key === 'planetId' || key === 'id') continue;
				// Convert camelCase key to snake_case for config lookup
				points += calculateBuildingPoints(toSnake(key), level as number);
			}

			// Ships (Stationed)
			const sRes = await db.select().from(planetShips).where(eq(planetShips.planetId, planet.id));
			const ships = sRes[0] || {};
			for (const [key, count] of Object.entries(ships)) {
				if (key === 'planetId' || key === 'id') continue;
				const ship = SHIPS[toSnake(key) as keyof typeof SHIPS];
				if (ship) {
					const cost = ship.cost.metal + ship.cost.crystal + (ship.cost.gas || 0);
					points += (cost * (count as number)) / 1000;
				}
			}

			// Defenses
			const dRes = await db
				.select()
				.from(planetDefenses)
				.where(eq(planetDefenses.planetId, planet.id));
			const defenses = dRes[0] || {};
			for (const [key, count] of Object.entries(defenses)) {
				if (key === 'planetId' || key === 'id') continue;
				const def = DEFENSES[toSnake(key) as keyof typeof DEFENSES];
				if (def) {
					const cost = def.cost.metal + def.cost.crystal + (def.cost.gas || 0);
					points += (cost * (count as number)) / 1000;
				}
			}
		}

		// 2. Research
		const rRes = await db.select().from(userResearch).where(eq(userResearch.userId, userId));
		const research = rRes[0] || {};
		for (const [key, level] of Object.entries(research)) {
			if (key === 'userId' || key === 'id') continue;
			points += calculateResearchPoints(toSnake(key), level as number);
		}

		// 3. Fleets (Flying)
		const fRes = await db
			.select({ ships: fleets.ships })
			.from(fleets)
			.where(eq(fleets.userId, userId));
		for (const fleet of fRes) {
			const ships = fleet.ships as Record<string, number>;
			for (const [key, count] of Object.entries(ships)) {
				// Fleet ships are stored as JSON, likely snake_case keys if that's how they were inserted.
				// But if we migrated insertion to use camelCase, we might have mixed.
				// However, fleet-processor uses snake_case keys for ships in JSON usually (from frontend).
				// Let's try both or assume snake_case.
				// Actually, if it's JSON, Drizzle returns it as is.
				// If we inserted { light_fighter: 10 }, we get { light_fighter: 10 }.
				// So we don't need toSnake here if keys are already snake_case.
				// But if we inserted { lightFighter: 10 }, we need toSnake.
				// Let's assume snake_case for now as that's the config key format.
				const ship = SHIPS[key as keyof typeof SHIPS] || SHIPS[toSnake(key) as keyof typeof SHIPS];
				if (ship) {
					const cost = ship.cost.metal + ship.cost.crystal + (ship.cost.gas || 0);
					points += (cost * (count as number)) / 1000;
				}
			}
		}

		// Update User
		await db
			.update(users)
			.set({ points: Math.floor(points) })
			.where(eq(users.id, userId));
	} catch (e) {
		console.error(`Error updating points for user ${userId}:`, e);
	}
}

export async function updateAllUserPoints() {
	try {
		const allUsers = await db.select({ id: users.id }).from(users);

		for (const user of allUsers) {
			await updateUserPoints(user.id);
		}
		console.log('Updated points for all users.');
	} catch (e) {
		console.error('Error updating points:', e);
	}
}
