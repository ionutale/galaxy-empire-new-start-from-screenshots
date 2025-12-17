import { pool } from './db';
import { SHIPS } from '$lib/game-config';

export async function processFleets() {
    const client = await pool.connect();
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
            if (fleet.status === 'returning') {
                await processReturningFleet(client, fleet);
            } else {
                await processArrivingFleet(client, fleet);
            }
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error processing fleets:', e);
    } finally {
        client.release();
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
        // Simple combat logic
        if (targetPlanet && targetPlanet.user_id) {
             // Calculate attacker power
             let attackPower = 0;
             const ships = fleet.ships;
             for (const [type, count] of Object.entries(ships)) {
                 const shipStats = SHIPS[type as keyof typeof SHIPS];
                 if (shipStats) {
                     attackPower += (shipStats.attack * (count as number));
                 }
             }
             
             // Simplified: Defender has no ships/defense in this demo yet, so attacker wins
             // In real game: fetch defender ships/defense, simulate rounds
             
             // Steal resources (50%)
             const resUpdate = await client.query(
                 `UPDATE planet_resources 
                  SET metal = metal / 2, crystal = crystal / 2, gas = gas / 2
                  WHERE planet_id = $1
                  RETURNING metal, crystal, gas`,
                 [targetPlanet.id]
             );
             
             const stolen = resUpdate.rows[0]; // This is what remains, so stolen is equal to this amount
             
             // Add stolen resources to fleet (simplified: just give it to user on return)
             // For now, just message
             
             await client.query(
                `INSERT INTO messages (user_id, type, title, content)
                 VALUES ($1, 'combat', 'Attack Successful', 'You attacked [${fleet.target_galaxy}:${fleet.target_system}:${fleet.target_planet}]. You won! Stolen: Metal ${Math.floor(stolen.metal)}, Crystal ${Math.floor(stolen.crystal)}.')`,
                [fleet.user_id]
            );
            
            if (targetPlanet.user_id !== fleet.user_id) {
                 await client.query(
                    `INSERT INTO messages (user_id, type, title, content)
                     VALUES ($1, 'combat', 'Planet Attacked', 'Your planet [${fleet.target_galaxy}:${fleet.target_system}:${fleet.target_planet}] was attacked! Resources lost.')`,
                    [targetPlanet.user_id]
                );
            }

             await returnFleet(client, fleet);
        } else {
             await client.query(
                `INSERT INTO messages (user_id, type, title, content)
                 VALUES ($1, 'combat', 'Attack Failed', 'No target found at coordinates.')`,
                [fleet.user_id]
            );
            await returnFleet(client, fleet);
        }
    } else {
        // Default return
        await returnFleet(client, fleet);
    }
}

async function returnFleet(client: any, fleet: any) {
    // Calculate return time (same duration as travel)
    // For demo: 30 seconds
    const returnTime = new Date(Date.now() + 30 * 1000);
    
    await client.query(
        `UPDATE fleets 
         SET status = 'returning', arrival_time = $1, mission = 'return'
         WHERE id = $2`,
        [returnTime, fleet.id]
    );
}
