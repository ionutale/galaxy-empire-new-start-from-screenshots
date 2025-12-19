import { pool } from './db';

export interface FleetTemplate {
    id: number;
    user_id: number;
    name: string;
    ships: Record<string, number>;
}

export async function getFleetTemplates(userId: number): Promise<FleetTemplate[]> {
    const res = await pool.query(
        'SELECT * FROM fleet_templates WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
    );
    return res.rows;
}

export async function createFleetTemplate(userId: number, name: string, ships: Record<string, number>) {
    // Validate ships
    const validShips: Record<string, number> = {};
    let hasShips = false;
    
    for (const [type, count] of Object.entries(ships)) {
        if (count > 0) {
            validShips[type] = count;
            hasShips = true;
        }
    }

    if (!hasShips) throw new Error('Template must contain at least one ship');
    if (!name || name.trim().length === 0) throw new Error('Template name is required');

    await pool.query(
        'INSERT INTO fleet_templates (user_id, name, ships) VALUES ($1, $2, $3)',
        [userId, name, JSON.stringify(validShips)]
    );
}

export async function deleteFleetTemplate(userId: number, templateId: number) {
    await pool.query(
        'DELETE FROM fleet_templates WHERE id = $1 AND user_id = $2',
        [templateId, userId]
    );
}
