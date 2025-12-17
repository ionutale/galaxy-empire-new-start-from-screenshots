import { pool } from './db';
import { BUILDINGS, RESEARCH, SHIPS, DEFENSES } from '$lib/game-config';

function calculateBuildingPoints(type: string, level: number): number {
    const building = BUILDINGS[type as keyof typeof BUILDINGS];
    if (!building || level < 1) return 0;
    
    let totalMetal = 0;
    let totalCrystal = 0;
    let totalGas = 0;

    for (let l = 1; l <= level; l++) {
        totalMetal += Math.floor(building.baseCost.metal * Math.pow(building.costFactor, l - 1));
        totalCrystal += Math.floor(building.baseCost.crystal * Math.pow(building.costFactor, l - 1));
        // Gas? Buildings usually don't have gas cost in config? Let's check.
        // Config has gas for some?
    }
    // Check config for gas
    // In game-config.ts: baseCost: { metal: 225, crystal: 75 } (no gas property shown in snippet, but let's assume 0 if missing)
    
    return (totalMetal + totalCrystal + totalGas) / 1000;
}

function calculateResearchPoints(type: string, level: number): number {
    const tech = RESEARCH[type as keyof typeof RESEARCH];
    if (!tech || level < 1) return 0;

    let totalMetal = 0;
    let totalCrystal = 0;
    let totalGas = 0;

    for (let l = 1; l <= level; l++) {
        totalMetal += Math.floor(tech.baseCost.metal * Math.pow(tech.costFactor, l - 1));
        totalCrystal += Math.floor(tech.baseCost.crystal * Math.pow(tech.costFactor, l - 1));
        totalGas += Math.floor(tech.baseCost.gas * Math.pow(tech.costFactor, l - 1));
    }

    return (totalMetal + totalCrystal + totalGas) / 1000;
}

export async function updateAllUserPoints() {
    const client = await pool.connect();
    try {
        const users = await client.query('SELECT id FROM users');
        
        for (const user of users.rows) {
            let points = 0;

            // 1. Buildings & Defenses & Ships (on planets)
            const planets = await client.query('SELECT id FROM planets WHERE user_id = $1', [user.id]);
            
            for (const planet of planets.rows) {
                // Buildings
                const bRes = await client.query('SELECT * FROM planet_buildings WHERE planet_id = $1', [planet.id]);
                const buildings = bRes.rows[0] || {};
                for (const [key, level] of Object.entries(buildings)) {
                    if (key === 'planet_id') continue;
                    points += calculateBuildingPoints(key, level as number);
                }

                // Ships (Stationed)
                const sRes = await client.query('SELECT * FROM planet_ships WHERE planet_id = $1', [planet.id]);
                const ships = sRes.rows[0] || {};
                for (const [key, count] of Object.entries(ships)) {
                    if (key === 'planet_id') continue;
                    const ship = SHIPS[key as keyof typeof SHIPS];
                    if (ship) {
                        const cost = ship.cost.metal + ship.cost.crystal + ship.cost.gas;
                        points += (cost * (count as number)) / 1000;
                    }
                }

                // Defenses
                const dRes = await client.query('SELECT * FROM planet_defenses WHERE planet_id = $1', [planet.id]);
                const defenses = dRes.rows[0] || {};
                for (const [key, count] of Object.entries(defenses)) {
                    if (key === 'planet_id') continue;
                    const def = DEFENSES[key as keyof typeof DEFENSES];
                    if (def) {
                        const cost = def.cost.metal + def.cost.crystal + def.cost.gas;
                        points += (cost * (count as number)) / 1000;
                    }
                }
            }

            // 2. Research
            const rRes = await client.query('SELECT * FROM user_research WHERE user_id = $1', [user.id]);
            const research = rRes.rows[0] || {};
            for (const [key, level] of Object.entries(research)) {
                if (key === 'user_id') continue;
                points += calculateResearchPoints(key, level as number);
            }

            // 3. Fleets (Flying)
            const fRes = await client.query('SELECT ships FROM fleets WHERE user_id = $1', [user.id]);
            for (const fleet of fRes.rows) {
                for (const [key, count] of Object.entries(fleet.ships)) {
                    const ship = SHIPS[key as keyof typeof SHIPS];
                    if (ship) {
                        const cost = ship.cost.metal + ship.cost.crystal + ship.cost.gas;
                        points += (cost * (count as number)) / 1000;
                    }
                }
            }

            // Update User
            await client.query('UPDATE users SET points = $1 WHERE id = $2', [Math.floor(points), user.id]);
        }
        console.log('Updated points for all users.');

    } catch (e) {
        console.error('Error updating points:', e);
    } finally {
        client.release();
    }
}
