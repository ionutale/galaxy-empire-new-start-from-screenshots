import { pool } from './db';
import { SHIPS } from '$lib/game-config';
import { simulateCombat } from './combat-engine';
import { updateUserPoints } from './points-calculator';

export async function processFleets() {
    const client = await pool.connect();
    const usersToUpdate = new Set<number>();

    try {
        await client.query('BEGIN');

        // Find fleets that have arrived
        const fleetsRes = await client.query(
            `SELECT * FROM fleets 
             WHERE status IN ('active', 'returning') 
             AND arrival_time <= NOW() 
             FOR UPDATE SKIP LOCKED`
        );

        for (const fleet of fleetsRes.rows) {
            usersToUpdate.add(fleet.user_id);
            if (fleet.status === 'returning') {
                await processReturningFleet(client, fleet);
            } else {
                const targetUserId = await processArrivingFleet(client, fleet);
                if (targetUserId) usersToUpdate.add(targetUserId);
            }
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error processing fleets:', e);
    } finally {
        client.release();
    }

    // Update points for affected users
    for (const userId of usersToUpdate) {
        await updateUserPoints(userId);
    }
}

async function processReturningFleet(client: any, fleet: any) {
    // Add ships back to origin planet
    const ships = fleet.ships; // JSON object
    
    for (const [type, count] of Object.entries(ships)) {
        await client.query(
            `UPDATE planet_ships SET ${type} = ${type} + $1 WHERE planet_id = $2`,
            [count, fleet.origin_planet_id]
        );
    }

    // Add resources back to origin planet
    if (fleet.resources) {
        const resources = fleet.resources;
        await client.query(
            `UPDATE planet_resources 
             SET metal = metal + $1, crystal = crystal + $2, gas = gas + $3
             WHERE planet_id = $4`,
            [resources.metal || 0, resources.crystal || 0, resources.gas || 0, fleet.origin_planet_id]
        );
    }

    // Mark fleet as completed
    await client.query(
        `UPDATE fleets SET status = 'completed' WHERE id = $1`,
        [fleet.id]
    );

    // Notify user
    await client.query(
        `INSERT INTO messages (user_id, type, title, content)
         VALUES ($1, 'system', 'Fleet Returned', 'Your fleet has returned to base.')`,
        [fleet.user_id]
    );
}

async function processArrivingFleet(client: any, fleet: any) {
    // Find target planet
    const targetRes = await client.query(
        `SELECT id, user_id FROM planets 
         WHERE galaxy_id = $1 AND system_id = $2 AND planet_number = $3`,
        [fleet.target_galaxy, fleet.target_system, fleet.target_planet]
    );
    
    const targetPlanet = targetRes.rows[0];
    let affectedUserId = targetPlanet?.user_id || null;

    if (fleet.mission === 'transport') {
        // Logic for transport (not fully implemented in UI yet, but structure is here)
        // Just return for now
        await returnFleet(client, fleet);
    } else if (fleet.mission === 'colonize') {
        if (!targetPlanet) {
            // Create new colony
            // Check planet limit etc (skipped for demo)
            
            // Create planet
            const newPlanetRes = await client.query(
                `INSERT INTO planets (user_id, galaxy_id, system_id, planet_number, name, planet_type, fields_max, image_variant)
                 VALUES ($1, $2, $3, $4, 'Colony', 'terrestrial', 163, 2) RETURNING id`,
                [fleet.user_id, fleet.target_galaxy, fleet.target_system, fleet.target_planet]
            );
            const newPlanetId = newPlanetRes.rows[0].id;
            
            // Init resources/buildings
            await client.query('INSERT INTO planet_resources (planet_id) VALUES ($1)', [newPlanetId]);
            await client.query('INSERT INTO planet_buildings (planet_id) VALUES ($1)', [newPlanetId]);
            await client.query('INSERT INTO planet_ships (planet_id) VALUES ($1)', [newPlanetId]);

            // Send success message
            await client.query(
                `INSERT INTO messages (user_id, type, title, content)
                 VALUES ($1, 'system', 'Colonization Successful', 'You have established a new colony at [${fleet.target_galaxy}:${fleet.target_system}:${fleet.target_planet}].')`,
                [fleet.user_id]
            );
            
            // Fleet stays at new colony (ships added to new planet)
             const ships = fleet.ships;
             for (const [type, count] of Object.entries(ships)) {
                await client.query(
                    `UPDATE planet_ships SET ${type} = ${type} + $1 WHERE planet_id = $2`,
                    [count, newPlanetId]
                );
            }
            
            await client.query(`UPDATE fleets SET status = 'completed' WHERE id = $1`, [fleet.id]);

        } else {
            // Failed, return
             await client.query(
                `INSERT INTO messages (user_id, type, title, content)
                 VALUES ($1, 'system', 'Colonization Failed', 'The planet is already occupied.')`,
                [fleet.user_id]
            );
            await returnFleet(client, fleet);
        }
    } else if (fleet.mission === 'attack') {
        if (targetPlanet && targetPlanet.user_id) {
            // Fetch defender ships and defenses
            const defShipsRes = await client.query('SELECT * FROM planet_ships WHERE planet_id = $1', [targetPlanet.id]);
            const defDefensesRes = await client.query('SELECT * FROM planet_defenses WHERE planet_id = $1', [targetPlanet.id]);
            
            const defenderShips = defShipsRes.rows[0] || {};
            const defenderDefenses = defDefensesRes.rows[0] || {};
            
            // Clean up DB objects (remove id, planet_id etc)
            delete defenderShips.id; delete defenderShips.planet_id;
            delete defenderDefenses.id; delete defenderDefenses.planet_id;

            const result = simulateCombat(fleet.ships, defenderShips, defenderDefenses);

            // Apply losses to Attacker (Fleet)
            const remainingFleet = { ...fleet.ships };
            let fleetDestroyed = true;
            
            for (const [type, count] of Object.entries(result.attackerLosses)) {
                remainingFleet[type] -= (count as number);
                if (remainingFleet[type] < 0) remainingFleet[type] = 0;
            }
            
            // Check if fleet still exists
            for (const count of Object.values(remainingFleet)) {
                if ((count as number) > 0) fleetDestroyed = false;
            }

            if (fleetDestroyed) {
                await client.query(`UPDATE fleets SET status = 'destroyed' WHERE id = $1`, [fleet.id]);
            } else {
                // Update fleet ships
                await client.query(`UPDATE fleets SET ships = $1 WHERE id = $2`, [remainingFleet, fleet.id]);
            }

            // Apply losses to Defender (Planet)
            for (const [type, count] of Object.entries(result.defenderLosses)) {
                if (SHIPS[type as keyof typeof SHIPS]) {
                    await client.query(`UPDATE planet_ships SET ${type} = ${type} - $1 WHERE planet_id = $2`, [count, targetPlanet.id]);
                } else {
                    await client.query(`UPDATE planet_defenses SET ${type} = ${type} - $1 WHERE planet_id = $2`, [count, targetPlanet.id]);
                }
            }

            // Looting (if attacker won)
            let lootMsg = '';
            if (result.winner === 'attacker' && !fleetDestroyed) {
                 const resUpdate = await client.query(
                     `UPDATE planet_resources 
                      SET metal = metal / 2, crystal = crystal / 2, gas = gas / 2
                      WHERE planet_id = $1
                      RETURNING metal, crystal, gas`,
                     [targetPlanet.id]
                 );
                 const stolen = resUpdate.rows[0];
                 lootMsg = `Stolen: Metal ${Math.floor(stolen.metal)}, Crystal ${Math.floor(stolen.crystal)}, Gas ${Math.floor(stolen.gas)}.`;
            }

            // Send Reports
            const attackerReport = `Combat Result: ${result.winner.toUpperCase()}\n\nAttacker Losses: ${JSON.stringify(result.attackerLosses)}\nDefender Losses: ${JSON.stringify(result.defenderLosses)}\n\n${lootMsg}`;
            
            await client.query(
                `INSERT INTO messages (user_id, type, title, content)
                 VALUES ($1, 'combat', 'Combat Report: ' || $2, $3)`,
                [fleet.user_id, result.winner, attackerReport]
            );
            
            if (targetPlanet.user_id !== fleet.user_id) {
                 await client.query(
                    `INSERT INTO messages (user_id, type, title, content)
                     VALUES ($1, 'combat', 'You were attacked!', $2)`,
                    [targetPlanet.user_id, attackerReport]
                );
            }

            if (!fleetDestroyed) {
                await returnFleet(client, fleet);
            }
        } else {
             await client.query(
                `INSERT INTO messages (user_id, type, title, content)
                 VALUES ($1, 'combat', 'Attack Failed', 'No target found at coordinates.')`,
                [fleet.user_id]
            );
            await returnFleet(client, fleet);
        }
    } else if (fleet.mission === 'expedition') {
        const outcome = Math.random();
        let message = '';
        let title = 'Expedition Result';

        if (outcome < 0.1) {
            // 10% - Black Hole (Fleet Lost)
            await client.query(`UPDATE fleets SET status = 'destroyed' WHERE id = $1`, [fleet.id]);
            title = 'Expedition Lost';
            message = 'Your fleet encountered a massive black hole and was pulled beyond the event horizon. All contact has been lost.';
        } else {
            // 90% - Fleet Returns
            if (outcome < 0.4) {
                // 30% - Find Resources
                const metal = Math.floor(Math.random() * 5000) + 1000;
                const crystal = Math.floor(Math.random() * 3000) + 500;
                const gas = Math.floor(Math.random() * 1000) + 100;
                
                await client.query(
                    `UPDATE fleets SET resources = $1 WHERE id = $2`,
                    [{ metal, crystal, gas }, fleet.id]
                );
                message = `Your expedition found a resource cache! \nMetal: ${metal}\nCrystal: ${crystal}\nGas: ${gas}`;
            
            } else if (outcome < 0.7) {
                // 30% - Find Ships
                const foundShips = { 'light_fighter': Math.floor(Math.random() * 5) + 1, 'small_cargo': Math.floor(Math.random() * 2) + 1 };
                const currentShips = fleet.ships;
                
                for (const [type, count] of Object.entries(foundShips)) {
                    currentShips[type] = (currentShips[type] || 0) + count;
                }
                
                await client.query(`UPDATE fleets SET ships = $1 WHERE id = $2`, [currentShips, fleet.id]);
                message = `Your expedition encountered abandoned ships that joined your fleet: \n${JSON.stringify(foundShips)}`;

            } else {
                // 30% - Nothing
                message = 'The expedition explored the sector but found nothing of interest. The vast emptiness of space is... empty.';
            }

            await client.query(
                `INSERT INTO messages (user_id, type, title, content)
                 VALUES ($1, 'expedition', $2, $3)`,
                [fleet.user_id, title, message]
            );

            await returnFleet(client, fleet);
        }
    } else {
        // Default return
        await returnFleet(client, fleet);
    }
    
    return affectedUserId;
}

async function returnFleet(client: any, fleet: any) {
    // Calculate duration based on original flight time
    const duration = new Date(fleet.arrival_time).getTime() - new Date(fleet.departure_time).getTime();
    const safeDuration = duration > 0 ? duration : 30000; // Fallback to 30s

    const returnTime = new Date(Date.now() + safeDuration);
    
    await client.query(
        `UPDATE fleets 
         SET status = 'returning', arrival_time = $1
         WHERE id = $2`,
        [returnTime, fleet.id]
    );
}
