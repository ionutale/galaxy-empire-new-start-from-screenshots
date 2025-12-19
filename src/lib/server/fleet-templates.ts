import { db } from './db';
import { fleetTemplates } from './db/schema';
import { eq, and, asc } from 'drizzle-orm';

export interface FleetTemplate {
    id: number;
    userId: number | null;
    name: string;
    ships: Record<string, number>;
}

export async function getFleetTemplates(userId: number): Promise<FleetTemplate[]> {
    const templates = await db.select()
        .from(fleetTemplates)
        .where(eq(fleetTemplates.userId, userId))
        .orderBy(asc(fleetTemplates.createdAt));
    
    return templates.map(t => ({
        ...t,
        ships: t.ships as Record<string, number>
    }));
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

    await db.insert(fleetTemplates).values({
        userId,
        name,
        ships: validShips
    });
}

export async function deleteFleetTemplate(userId: number, templateId: number) {
    await db.delete(fleetTemplates)
        .where(and(
            eq(fleetTemplates.id, templateId),
            eq(fleetTemplates.userId, userId)
        ));
}
