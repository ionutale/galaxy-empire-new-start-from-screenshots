import { pool } from './db';

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number; // Dark Matter
    durationSeconds: number;
    effectType: 'metal_production' | 'crystal_production' | 'gas_production' | 'all_production' | 'energy_production';
    effectValue: number; // Percentage (e.g., 20 for 20%)
    image: string;
}

export const SHOP_ITEMS: Record<string, ShopItem> = {
    metal_booster_small: {
        id: 'metal_booster_small',
        name: 'Metal Booster (24h)',
        description: 'Increases Metal production by 20% for 24 hours.',
        cost: 200,
        durationSeconds: 86400,
        effectType: 'metal_production',
        effectValue: 20,
        image: 'metal_booster.png'
    },
    crystal_booster_small: {
        id: 'crystal_booster_small',
        name: 'Crystal Booster (24h)',
        description: 'Increases Crystal production by 20% for 24 hours.',
        cost: 200,
        durationSeconds: 86400,
        effectType: 'crystal_production',
        effectValue: 20,
        image: 'crystal_booster.png'
    },
    gas_booster_small: {
        id: 'gas_booster_small',
        name: 'Gas Booster (24h)',
        description: 'Increases Gas production by 20% for 24 hours.',
        cost: 200,
        durationSeconds: 86400,
        effectType: 'gas_production',
        effectValue: 20,
        image: 'gas_booster.png'
    },
    production_overdrive: {
        id: 'production_overdrive',
        name: 'Production Overdrive (24h)',
        description: 'Increases ALL resource production by 10% for 24 hours.',
        cost: 500,
        durationSeconds: 86400,
        effectType: 'all_production',
        effectValue: 10,
        image: 'overdrive.png'
    },
    energy_booster: {
        id: 'energy_booster',
        name: 'Energy Surge (24h)',
        description: 'Increases Energy production by 20% for 24 hours.',
        cost: 150,
        durationSeconds: 86400,
        effectType: 'energy_production',
        effectValue: 20,
        image: 'energy_booster.png'
    }
};

export async function purchaseShopItem(userId: number, itemId: string) {
    const item = SHOP_ITEMS[itemId];
    if (!item) throw new Error('Invalid item');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check user DM
        const userRes = await client.query('SELECT dark_matter FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        
        const currentDM = userRes.rows[0].dark_matter;
        if (currentDM < item.cost) throw new Error('Not enough Dark Matter');

        // Deduct DM
        await client.query('UPDATE users SET dark_matter = dark_matter - $1 WHERE id = $2', [item.cost, userId]);

        // Add Booster
        // We allow stacking duration or multiple active boosters?
        // Let's say purchasing adds a new booster instance. 
        // Or extends existing one? Extending is cleaner for UI.
        
        // Check for existing active booster of same type
        const existingRes = await client.query(
            'SELECT id, expires_at FROM user_boosters WHERE user_id = $1 AND booster_id = $2 AND expires_at > NOW()',
            [userId, itemId]
        );

        let newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + item.durationSeconds);

        if (existingRes.rows.length > 0) {
            // Extend existing
            const currentExpiresAt = new Date(existingRes.rows[0].expires_at);
            // If current expires in future, add duration to it
            if (currentExpiresAt > new Date()) {
                newExpiresAt = new Date(currentExpiresAt.getTime() + item.durationSeconds * 1000);
            }
            
            await client.query(
                'UPDATE user_boosters SET expires_at = $1 WHERE id = $2',
                [newExpiresAt, existingRes.rows[0].id]
            );
        } else {
            // Insert new
            await client.query(
                'INSERT INTO user_boosters (user_id, booster_id, expires_at) VALUES ($1, $2, $3)',
                [userId, itemId, newExpiresAt]
            );
        }

        await client.query('COMMIT');
        return { success: true, expiresAt: newExpiresAt, remainingDM: currentDM - item.cost };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function getActiveBoosters(userId: number) {
    const res = await pool.query(
        'SELECT booster_id, expires_at FROM user_boosters WHERE user_id = $1 AND expires_at > NOW()',
        [userId]
    );
    return res.rows;
}

export async function getBoosterMultipliers(userId: number) {
    const active = await getActiveBoosters(userId);
    
    const multipliers = {
        metal: 1.0,
        crystal: 1.0,
        gas: 1.0,
        energy: 1.0
    };

    for (const row of active) {
        const item = SHOP_ITEMS[row.booster_id];
        if (!item) continue;

        const factor = 1 + (item.effectValue / 100);

        if (item.effectType === 'metal_production') multipliers.metal *= factor;
        if (item.effectType === 'crystal_production') multipliers.crystal *= factor;
        if (item.effectType === 'gas_production') multipliers.gas *= factor;
        if (item.effectType === 'energy_production') multipliers.energy *= factor;
        if (item.effectType === 'all_production') {
            multipliers.metal *= factor;
            multipliers.crystal *= factor;
            multipliers.gas *= factor;
        }
    }

    return multipliers;
}
