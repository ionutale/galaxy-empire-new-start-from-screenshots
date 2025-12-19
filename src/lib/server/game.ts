import { pool } from './db';
import { getProduction } from '$lib/game-config';
import { getCommanderBonus } from './commanders';

export async function updatePlanetResources(planetId: number) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get current resources and building levels
        const res = await client.query(
            `SELECT r.*, 
                    b.metal_mine, b.crystal_mine, b.gas_extractor, b.solar_plant,
                    p.user_id,
                    EXTRACT(EPOCH FROM (NOW() - r.last_update)) as seconds_elapsed
             FROM planet_resources r
             JOIN planet_buildings b ON r.planet_id = b.planet_id
             JOIN planets p ON r.planet_id = p.id
             WHERE r.planet_id = $1 FOR UPDATE`,
            [planetId]
        );

        if (res.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        const data = res.rows[0];
        const seconds = parseFloat(data.seconds_elapsed);

        if (seconds < 1) {
            await client.query('ROLLBACK');
            return data; // No significant time passed
        }

        // Get Commander Bonuses
        const mineBonus = await getCommanderBonus(data.user_id, 'mine_production');
        const energyBonus = await getCommanderBonus(data.user_id, 'energy_production');
        
        const productionMultiplier = 1 + (mineBonus / 100);
        const energyMultiplier = 1 + (energyBonus / 100);

        // Calculate production per second
        // Base production (e.g. 30/hour) -> / 3600
        const metalProd = ((getProduction('metal_mine', data.metal_mine) * productionMultiplier) + 30) / 3600; // +30 base
        const crystalProd = ((getProduction('crystal_mine', data.crystal_mine) * productionMultiplier) + 15) / 3600; // +15 base
        const gasProd = (getProduction('gas_extractor', data.gas_extractor) * productionMultiplier) / 3600;
        
        // Energy calculation (static, not accumulated)
        const energyProd = getProduction('solar_plant', data.solar_plant) * energyMultiplier;
        const energyCons = 
            Math.ceil(10 * data.metal_mine * Math.pow(1.1, data.metal_mine)) + 
            Math.ceil(10 * data.crystal_mine * Math.pow(1.1, data.crystal_mine)) +
            Math.ceil(20 * data.gas_extractor * Math.pow(1.1, data.gas_extractor));
            
        const energy = energyProd - energyCons;
        
        // Production factor based on energy (simplified: if negative, 0% or reduced? Let's say 0 for now or linear drop)
        let productionFactor = 1.0;
        if (energy < 0) {
            // productionFactor = 0.1; // Penalty
            // For simplicity, let's just keep it 1.0 for this demo or 0 if strictly enforced
             productionFactor = Math.max(0, 1 + (energy / energyCons)); // Simple linear reduction
        }

        const newMetal = data.metal + (metalProd * seconds * productionFactor);
        const newCrystal = data.crystal + (crystalProd * seconds * productionFactor);
        const newGas = data.gas + (gasProd * seconds * productionFactor);

        // Update DB
        await client.query(
            `UPDATE planet_resources 
             SET metal = $1, crystal = $2, gas = $3, energy = $4, last_update = NOW() 
             WHERE planet_id = $5`,
            [newMetal, newCrystal, newGas, energy, planetId]
        );

        await client.query('COMMIT');
        
        return {
            ...data,
            metal: newMetal,
            crystal: newCrystal,
            gas: newGas,
            energy
        };

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}
