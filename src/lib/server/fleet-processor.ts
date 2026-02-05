import {
	db,
	fleets,
	planets,
	planetResources,
	planetShips,
	planetDefenses,
	planetBuildings,
	messages,
	users,
	combatReports
} from './db';
import type { Fleet } from './db';
import { SHIPS } from '$lib/game-config';
import { simulateCombat } from './combat-engine';
import { updateUserPoints } from './points-calculator';
import { eq, and, lte, inArray, sql } from 'drizzle-orm';

// Get the transaction type from Drizzle
type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function processFleets() {
	const usersToUpdate = new Set<number>();

	try {
		await db.transaction(async (tx) => {
			// Find fleets that have reached their destination (active) or returned to base (returning)
			const fleetsRes = await tx
				.select()
				.from(fleets)
				.where(
					and(inArray(fleets.status, ['active', 'returning']), lte(fleets.arrivalTime, new Date()))
				);

			if (fleetsRes.length > 0) {
				console.log(`Processing ${fleetsRes.length} fleets...`);
			}

			for (const fleet of fleetsRes) {
				// console.log(`Processing fleet ${fleet.id} [${fleet.status}]: ${fleet.mission}`);
				try {
					// Nested transaction acts as SAVEPOINT
					await tx.transaction(async (subTx) => {
						if (fleet.userId) usersToUpdate.add(fleet.userId);
						if (fleet.status === 'returning') {
							await processReturningFleet(subTx, fleet);
						} else {
							const targetUserId = await processArrivingFleet(subTx, fleet);
							if (targetUserId) usersToUpdate.add(targetUserId);
						}
					});
				} catch (err) {
					console.error(`Error processing fleet ${fleet.id}:`, err);
					// Sub-transaction rolled back automatically
				}
			}
		});
	} catch (e) {
		console.error('Error processing fleets:', e);
	}

	// Update points for affected users
	for (const userId of usersToUpdate) {
		await updateUserPoints(userId);
	}
}

const VALID_SHIP_TYPES = [
	'light_fighter',
	'heavy_fighter',
	'cruiser',
	'battleship',
	'colony_ship',
	'small_cargo',
	'large_cargo'
];

// Helper to convert snake_case ship type to camelCase if needed by schema,
// but here we assume schema uses snake_case for columns or we use sql.identifier.
// Actually, Drizzle schema usually maps snake_case DB columns to camelCase TS properties.
// But for dynamic updates using sql``, we should use the DB column name if using sql.identifier,
// or the TS property name if using object syntax.
// Let's assume the schema has camelCase properties like `lightFighter`.
function toCamel(s: string) {
	return s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

async function processReturningFleet(tx: TransactionClient, fleet: Fleet) {
	// Add ships back to origin planet
	const ships = (fleet.ships as Record<string, number>) || {};

	for (const [type, count] of Object.entries(ships)) {
		if (VALID_SHIP_TYPES.includes(type)) {
			// We use sql.identifier to target the column name directly (snake_case)
			// Or we can use the schema property.
			// Since we don't have the schema object instance for dynamic key access easily without `any`,
			// we'll use sql template for the update.
				await tx
					.update(planetShips)
					.set({ [toCamel(type)]: sql`${sql.identifier(type)} + ${count}` })
					.where(eq(planetShips.planetId, fleet.originPlanetId as number));
			}
		}

		// Add resources back to origin planet
		if (fleet.resources) {
			const resources = fleet.resources as Record<string, number>;
			await tx
				.update(planetResources)
				.set({
					metal: sql`${planetResources.metal} + ${resources.metal || 0}`,
					crystal: sql`${planetResources.crystal} + ${resources.crystal || 0}`,
					gas: sql`${planetResources.gas} + ${resources.gas || 0}`
				})
				.where(eq(planetResources.planetId, fleet.originPlanetId as number));
		}

	// Mark fleet as completed
	await tx.update(fleets).set({ status: 'completed' }).where(eq(fleets.id, fleet.id));

	// Notify user
	await tx.insert(messages).values({
		userId: fleet.userId,
		type: 'system',
		title: 'Fleet Returned',
		content: 'Your fleet has returned to base.'
	});
}

async function processArrivingFleet(tx: TransactionClient, fleet: Fleet) {
	// Find target planet
	const targetRes = await tx
		.select({ id: planets.id, userId: planets.userId })
		.from(planets)
		.where(
			and(
				eq(planets.galaxyId, fleet.targetGalaxy),
				eq(planets.systemId, fleet.targetSystem),
				eq(planets.planetNumber, fleet.targetPlanet)
			)
		);

	const targetPlanet = targetRes[0];
	const affectedUserId = targetPlanet?.userId || null;

	if (fleet.mission === 'transport') {
		if (targetPlanet) {
			// Unload resources
			const resources = (fleet.resources || {
				metal: 0,
				crystal: 0,
				gas: 0
			}) as Record<string, number>;
			await tx
				.update(planetResources)
				.set({
					metal: sql`${planetResources.metal} + ${resources.metal || 0}`,
					crystal: sql`${planetResources.crystal} + ${resources.crystal || 0}`,
					gas: sql`${planetResources.gas} + ${resources.gas || 0}`
				})
				.where(eq(planetResources.planetId, targetPlanet.id));

			// Clear resources from fleet so they don't return
			await tx.update(fleets).set({ resources: {} }).where(eq(fleets.id, fleet.id));

			// Notify target user
			if (affectedUserId && affectedUserId !== fleet.userId) {
				await tx.insert(messages).values({
					userId: affectedUserId,
					type: 'transport',
					title: 'Incoming Transport',
					content: `A fleet has arrived at your planet delivering resources: Metal: ${resources.metal || 0}, Crystal: ${resources.crystal || 0}, Gas: ${resources.gas || 0}`
				});
			}

			// Notify sender
			await tx.insert(messages).values({
				userId: fleet.userId,
				type: 'transport',
				title: 'Transport Delivered',
				content: `Your fleet has delivered resources to ${fleet.targetGalaxy}:${fleet.targetSystem}:${fleet.targetPlanet}`
			});
		} else {
			// Notify sender of failure
			await tx.insert(messages).values({
				userId: fleet.userId,
				type: 'transport',
				title: 'Transport Failed',
				content: 'Target planet does not exist. Fleet is returning with resources.'
			});
		}

		await returnFleet(tx, fleet);
	} else if (fleet.mission === 'colonize') {
		if (!targetPlanet) {
			// Create new colony
			const newPlanetRes = await tx
				.insert(planets)
				.values({
					userId: fleet.userId,
					galaxyId: fleet.targetGalaxy,
					systemId: fleet.targetSystem,
					planetNumber: fleet.targetPlanet,
					name: 'Colony',
					planetType: 'terrestrial',
					fieldsMax: 163,
					imageVariant: 2
				})
				.returning({ id: planets.id });

			const newPlanetId = newPlanetRes[0].id;

			// Init resources/buildings
			await tx.insert(planetResources).values({ planetId: newPlanetId });
			await tx.insert(planetShips).values({ planetId: newPlanetId });
			await tx.insert(planetBuildings).values({ planetId: newPlanetId });

			// Send success message
			await tx.insert(messages).values({
				userId: fleet.userId,
				type: 'system',
				title: 'Colonization Successful',
				content: `You have established a new colony at [${fleet.targetGalaxy}:${fleet.targetSystem}:${fleet.targetPlanet}].`
			});

			// Fleet stays at new colony (ships added to new planet)
			const ships = fleet.ships as Record<string, number>;
			for (const [type, count] of Object.entries(ships)) {
				if (VALID_SHIP_TYPES.includes(type)) {
					await tx
						.update(planetShips)
						.set({ [toCamel(type)]: sql`${sql.identifier(type)} + ${count}` })
						.where(eq(planetShips.planetId, newPlanetId));
				}
			}

			await tx.update(fleets).set({ status: 'completed' }).where(eq(fleets.id, fleet.id));
		} else {
			// Failed, return
			await tx.insert(messages).values({
				userId: fleet.userId,
				type: 'system',
				title: 'Colonization Failed',
				content: 'The planet is already occupied.'
			});
			await returnFleet(tx, fleet);
		}
	} else if (fleet.mission === 'attack') {
		if (targetPlanet && targetPlanet.userId) {
			// Fetch defender ships and defenses
			const defShipsRes = await tx
				.select()
				.from(planetShips)
				.where(eq(planetShips.planetId, targetPlanet.id));
			const defDefensesRes = await tx
				.select()
				.from(planetDefenses)
				.where(eq(planetDefenses.planetId, targetPlanet.id));

			const defenderShips = (defShipsRes[0] as unknown as Record<string, number>) || {};
			const defenderDefenses = (defDefensesRes[0] as unknown as Record<string, number>) || {};

			// Clean up DB objects (remove id, planet_id etc)
			// Drizzle objects are plain JS objects.
			// We can just pass them to simulateCombat, assuming it handles extra props or we clean them.
			// The original code deleted id and planet_id.

			const result = await simulateCombat(
				fleet.ships as Record<string, number>,
				defenderShips,
				defenderDefenses
			);

			// Apply losses to Attacker (Fleet)
			const remainingFleet = { ...(fleet.ships as Record<string, number>) };
			let fleetDestroyed = true;

			for (const [type, count] of Object.entries(result.attackerLosses)) {
				remainingFleet[type] -= count as number;
				if (remainingFleet[type] < 0) remainingFleet[type] = 0;
			}

			// Check if fleet still exists
			for (const count of Object.values(remainingFleet)) {
				if ((count as number) > 0) fleetDestroyed = false;
			}

			if (fleetDestroyed) {
				await tx.update(fleets).set({ status: 'destroyed' }).where(eq(fleets.id, fleet.id));
			} else {
				// Update fleet ships
				await tx.update(fleets).set({ ships: remainingFleet }).where(eq(fleets.id, fleet.id));
			}

			// Apply losses to Defender (Planet)
			for (const [type, count] of Object.entries(result.defenderLosses)) {
				if (SHIPS[type as keyof typeof SHIPS]) {
					await tx
						.update(planetShips)
						.set({ [toCamel(type)]: sql`${sql.identifier(type)} - ${count}` })
						.where(eq(planetShips.planetId, targetPlanet.id));
				} else {
					await tx
						.update(planetDefenses)
						.set({ [toCamel(type)]: sql`${sql.identifier(type)} - ${count}` })
						.where(eq(planetDefenses.planetId, targetPlanet.id));
				}
			}

			// Looting (if attacker won)
			const stolenMetal = 0;
			const stolenCrystal = 0;
			const stolenGas = 0;

			if (result.winner === 'attacker' && !fleetDestroyed) {
				// Calculate fleet capacity
				let fleetCapacity = 0;
				for (const [type, count] of Object.entries(remainingFleet)) {
					const shipInfo = SHIPS[type as keyof typeof SHIPS];
					if (shipInfo) {
						fleetCapacity += shipInfo.capacity * (count as number);
					}
				}

				// Fetch current resources
				const targetResourcesRes = await tx
					.select({
						metal: planetResources.metal,
						crystal: planetResources.crystal,
						gas: planetResources.gas
					})
					.from(planetResources)
					.where(eq(planetResources.planetId, targetPlanet.id));

				const targetRes = targetResourcesRes[0] || { metal: 0, crystal: 0, gas: 0 };

				const lootableMetal = Math.floor((targetRes.metal || 0) / 2);
				const lootableCrystal = Math.floor((targetRes.crystal || 0) / 2);
				const lootableGas = Math.floor((targetRes.gas || 0) / 2);

				const totalLootable = lootableMetal + lootableCrystal + lootableGas;

				let stolenMetal = lootableMetal;
				let stolenCrystal = lootableCrystal;
				let stolenGas = lootableGas;

				if (totalLootable > fleetCapacity) {
					const ratio = fleetCapacity / totalLootable;
					stolenMetal = Math.floor(lootableMetal * ratio);
					stolenCrystal = Math.floor(lootableCrystal * ratio);
					stolenGas = Math.floor(lootableGas * ratio);
				}

				// Update planet resources
				await tx
					.update(planetResources)
					.set({
						metal: sql`${planetResources.metal} - ${stolenMetal}`,
						crystal: sql`${planetResources.crystal} - ${stolenCrystal}`,
						gas: sql`${planetResources.gas} - ${stolenGas}`
					})
					.where(eq(planetResources.planetId, targetPlanet.id));

				// Update fleet resources
				await tx
					.update(fleets)
					.set({ resources: { metal: stolenMetal, crystal: stolenCrystal, gas: stolenGas } })
					.where(eq(fleets.id, fleet.id));

				let lootMsg = `Stolen: Metal ${stolenMetal}, Crystal ${stolenCrystal}, Gas ${stolenGas}.`;
			}

			// Send Reports
			const loot =
				result.winner === 'attacker' && !fleetDestroyed
					? {
							metal: stolenMetal,
							crystal: stolenCrystal,
							gas: stolenGas
						}
					: null;

			// Create detailed combat report
			const reportId = await tx
				.insert(combatReports)
				.values({
					attackerId: fleet.userId,
					defenderId: targetPlanet.userId,
					galaxy: fleet.targetGalaxy,
					system: fleet.targetSystem,
					planet: fleet.targetPlanet,
					mission: fleet.mission,
					attackerFleet: fleet.ships,
					defenderFleet: defenderShips,
					defenderDefenses: defenderDefenses,
					attackerLosses: result.attackerLosses,
					defenderLosses: result.defenderLosses,
					winner: result.winner,
					rounds: result.rounds,
					loot: loot,
					debris: null // TODO: Implement debris field generation
				})
				.returning({ id: combatReports.id });

			// Send message notifications with link to detailed report
			await tx.insert(messages).values({
				userId: fleet.userId,
				type: 'combat',
				title: `Combat Report: ${result.winner === 'attacker' ? 'Victory' : result.winner === 'defender' ? 'Defeat' : 'Draw'}`,
				content: `Combat at [${fleet.targetGalaxy}:${fleet.targetSystem}:${fleet.targetPlanet}]\nResult: ${result.winner.toUpperCase()}\n\nAttacker Losses: ${
					Object.entries(result.attackerLosses)
						.map(([type, count]) => `${type}: ${count}`)
						.join(', ') || 'None'
				}\nDefender Losses: ${
					Object.entries(result.defenderLosses)
						.map(([type, count]) => `${type}: ${count}`)
						.join(', ') || 'None'
				}\n\n${loot ? `Loot: Metal ${loot.metal}, Crystal ${loot.crystal}, Gas ${loot.gas}` : ''}\n\n[View Detailed Report](/game/combat-report/${reportId[0].id})`
			});

			if (targetPlanet.userId !== fleet.userId) {
				await tx.insert(messages).values({
					userId: targetPlanet.userId,
					type: 'combat',
					title: 'You were attacked!',
					content: `Combat at [${fleet.targetGalaxy}:${fleet.targetSystem}:${fleet.targetPlanet}]\nResult: ${result.winner === 'attacker' ? 'Defeated' : result.winner === 'defender' ? 'Victory' : 'Draw'}\n\nAttacker Losses: ${
						Object.entries(result.attackerLosses)
							.map(([type, count]) => `${type}: ${count}`)
							.join(', ') || 'None'
					}\nDefender Losses: ${
						Object.entries(result.defenderLosses)
							.map(([type, count]) => `${type}: ${count}`)
							.join(', ') || 'None'
					}\n\n${loot ? `Looted: Metal ${loot.metal}, Crystal ${loot.crystal}, Gas ${loot.gas}` : ''}\n\n[View Detailed Report](/game/combat-report/${reportId[0].id})`
				});
			}

			if (!fleetDestroyed) {
				await returnFleet(tx, fleet);
			}
		} else {
			await tx.insert(messages).values({
				userId: fleet.userId,
				type: 'combat',
				title: 'Attack Failed',
				content: 'No target found at coordinates.'
			});
			await returnFleet(tx, fleet);
		}
	} else if (fleet.mission === 'espionage') {
		// Call stored procedure to process espionage mission
		await tx.execute(sql`CALL process_espionage_mission(${fleet.id})`);
	} else if (fleet.mission === 'expedition') {
		const outcome = Math.random();
		let message = '';
		let title = 'Expedition Result';

		if (outcome < 0.1) {
			// 10% - Black Hole (Fleet Lost)
			await tx.update(fleets).set({ status: 'destroyed' }).where(eq(fleets.id, fleet.id));
			title = 'Expedition Lost';
			message =
				'Your fleet encountered a massive black hole and was pulled beyond the event horizon. All contact has been lost.';
		} else {
			// 90% - Fleet Returns
			if (outcome < 0.35) {
				// 25% - Find Resources
				const metal = Math.floor(Math.random() * 5000) + 1000;
				const crystal = Math.floor(Math.random() * 3000) + 500;
				const gas = Math.floor(Math.random() * 1000) + 100;

				await tx
					.update(fleets)
					.set({ resources: { metal, crystal, gas } })
					.where(eq(fleets.id, fleet.id));
				message = `Your expedition found a resource cache! \nMetal: ${metal}\nCrystal: ${crystal}\nGas: ${gas}`;
			} else if (outcome < 0.6) {
				// 25% - Find Ships
				const foundShips = {
					light_fighter: Math.floor(Math.random() * 5) + 1,
					small_cargo: Math.floor(Math.random() * 2) + 1
				};
				const currentShips = (fleet.ships as Record<string, number>) || {};

				for (const [type, count] of Object.entries(foundShips)) {
					currentShips[type] = (currentShips[type] || 0) + count;
				}

				await tx.update(fleets).set({ ships: currentShips }).where(eq(fleets.id, fleet.id));
				message = `Your expedition encountered abandoned ships that joined your fleet: \n${JSON.stringify(foundShips)}`;
			} else if (outcome < 0.75) {
				// 15% - Find Dark Matter
				const darkMatter = 50;
				await tx
					.update(users)
					.set({ darkMatter: sql`${users.darkMatter} + ${darkMatter}` })
					.where(eq(users.id, fleet.userId));
				message = `Your expedition discovered a pocket of Dark Matter! \nDark Matter: ${darkMatter}`;
			} else {
				// 25% - Nothing
				message =
					'The expedition explored the sector but found nothing of interest. The vast emptiness of space is... empty.';
			}

			await tx.insert(messages).values({
				userId: fleet.userId,
				type: 'expedition',
				title: title,
				content: message
			});

			await returnFleet(tx, fleet);
		}
	} else if (fleet.mission === 'deploy') {
		if (targetPlanet && targetPlanet.userId === fleet.userId) {
			// 1. Add ships to target planet
			const ships = (fleet.ships as Record<string, number>) || {};
			for (const [type, count] of Object.entries(ships)) {
				if (VALID_SHIP_TYPES.includes(type)) {
					await tx
						.update(planetShips)
						.set({ [toCamel(type)]: sql`${sql.identifier(type)} + ${count}` })
						.where(eq(planetShips.planetId, targetPlanet.id));
				}
			}

			// 2. Add resources to target planet (if any)
			const resources = (fleet.resources || {
				metal: 0,
				crystal: 0,
				gas: 0
			}) as Record<string, number>;
			await tx
				.update(planetResources)
				.set({
					metal: sql`${planetResources.metal} + ${resources.metal || 0}`,
					crystal: sql`${planetResources.crystal} + ${resources.crystal || 0}`,
					gas: sql`${planetResources.gas} + ${resources.gas || 0}`
				})
				.where(eq(planetResources.planetId, targetPlanet.id));

			// 3. Mark fleet as completed
			await tx.update(fleets).set({ status: 'completed' }).where(eq(fleets.id, fleet.id));

			// 4. Notify user
			await tx.insert(messages).values({
				userId: fleet.userId,
				type: 'info',
				title: 'Fleet Deployed',
				content: `Your fleet has been stationed at ${fleet.targetGalaxy}:${fleet.targetSystem}:${fleet.targetPlanet}`
			});
		} else {
			// Target is not owned by user or doesn't exist -> Return
			await tx.insert(messages).values({
				userId: fleet.userId,
				type: 'warning',
				title: 'Deployment Failed',
				content: 'Cannot deploy to a planet you do not own. Fleet returning.'
			});
			await returnFleet(tx, fleet);
		}
	} else {
		// Default return
		await returnFleet(tx, fleet);
	}

	return affectedUserId;
}

async function returnFleet(tx: TransactionClient, fleet: Fleet) {
	// Calculate duration based on original flight time
	const arrivalTime = fleet.arrivalTime ? new Date(fleet.arrivalTime).getTime() : Date.now();
	const departureTime = fleet.departureTime ? new Date(fleet.departureTime).getTime() : Date.now();
	const duration = arrivalTime - departureTime;
	const safeDuration = duration > 0 ? duration : 30000; // Fallback to 30s

	const now = new Date();
	const returnTime = new Date(now.getTime() + safeDuration);

	await tx
		.update(fleets)
		.set({
			status: 'returning',
			arrivalTime: returnTime,
			departureTime: now
		})
		.where(eq(fleets.id, fleet.id));
}
