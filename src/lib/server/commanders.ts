import { pool } from './db';

export interface Commander {
    id: string;
    name: string;
    description: string;
    bonusType: 'mine_production' | 'fleet_speed' | 'research_speed' | 'energy_production';
    bonusValue: number; // Percentage (e.g., 10 for 10%)
    image: string;
}

export const COMMANDERS: Record<string, Commander> = {
    geologist: {
        id: 'geologist',
        name: 'Geologist',
        description: 'Increases mine production by 10%.',
        bonusType: 'mine_production',
        bonusValue: 10,
        image: 'geologist.png'
    },
    admiral: {
        id: 'admiral',
        name: 'Admiral',
        description: 'Increases fleet speed by 10%.',
        bonusType: 'fleet_speed',
        bonusValue: 10,
        image: 'admiral.png'
    },
    engineer: {
        id: 'engineer',
        name: 'Engineer',
        description: 'Increases energy production by 10%.',
        bonusType: 'energy_production',
        bonusValue: 10,
        image: 'engineer.png'
    },
    technocrat: {
        id: 'technocrat',
        name: 'Technocrat',
        description: 'Decreases research time by 10%.',
        bonusType: 'research_speed',
        bonusValue: 10,
        image: 'technocrat.png'
    }
};

export const DURATION_COSTS = {
    1: 100,   // 1 day = 100 DM
    7: 500,   // 7 days = 500 DM
    14: 900,  // 14 days = 900 DM
    30: 1500  // 30 days = 1500 DM
};

export async function purchaseCommander(userId: number, commanderId: string, durationDays: number) {
    if (!COMMANDERS[commanderId]) throw new Error('Invalid commander');
    if (!DURATION_COSTS[durationDays as keyof typeof DURATION_COSTS]) throw new Error('Invalid duration');

    const cost = DURATION_COSTS[durationDays as keyof typeof DURATION_COSTS];
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check user DM
        const userRes = await client.query('SELECT dark_matter FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        
        const currentDM = userRes.rows[0].dark_matter;
        if (currentDM < cost) throw new Error('Not enough Dark Matter');

        // Deduct DM
        await client.query('UPDATE users SET dark_matter = dark_matter - $1 WHERE id = $2', [cost, userId]);

        // Add/Extend Commander
        // Check if already active
        const existingRes = await client.query(
            'SELECT expires_at FROM user_commanders WHERE user_id = $1 AND commander_id = $2',
            [userId, commanderId]
        );

        let newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + durationDays);

        if (existingRes.rows.length > 0) {
            const currentExpiresAt = new Date(existingRes.rows[0].expires_at);
            if (currentExpiresAt > new Date()) {
                // Extend
                newExpiresAt = new Date(currentExpiresAt);
                newExpiresAt.setDate(newExpiresAt.getDate() + durationDays);
            }
            
            await client.query(
                'UPDATE user_commanders SET expires_at = $1 WHERE user_id = $2 AND commander_id = $3',
                [newExpiresAt, userId, commanderId]
            );
        } else {
            // Insert
            await client.query(
                'INSERT INTO user_commanders (user_id, commander_id, expires_at) VALUES ($1, $2, $3)',
                [userId, commanderId, newExpiresAt]
            );
        }

        await client.query('COMMIT');
        return { success: true, expiresAt: newExpiresAt, remainingDM: currentDM - cost };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function getActiveCommanders(userId: number) {
    const res = await pool.query(
        'SELECT commander_id, expires_at FROM user_commanders WHERE user_id = $1 AND expires_at > NOW()',
        [userId]
    );
    return res.rows;
}

export async function getCommanderBonus(userId: number, bonusType: string): Promise<number> {
    const active = await getActiveCommanders(userId);
    let totalBonus = 0;
    
    for (const row of active) {
        const commander = COMMANDERS[row.commander_id];
        if (commander && commander.bonusType === bonusType) {
            totalBonus += commander.bonusValue;
        }
    }
    
    return totalBonus;
}
