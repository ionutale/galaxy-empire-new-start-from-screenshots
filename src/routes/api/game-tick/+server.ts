import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { BuildingService } from '$lib/server/building-service';
import { ResearchService } from '$lib/server/research-service';

export async function GET() {
	try {
		// Process completed building constructions
		await BuildingService.processCompletedBuildings();

		// Process completed research for all users
		const usersResult = await db.execute(sql`SELECT id FROM users`);
		for (const user of usersResult.rows) {
			await ResearchService.processCompletedResearch(user.id);
		}

		// Call stored procedures for fleet processing and auto-exploration
		await db.execute(sql`CALL process_fleets()`);
		await db.execute(sql`CALL process_auto_explore()`);

		return json({ success: true });
	} catch (e) {
		console.error('Game tick error:', e);
		return json({ success: false, error: (e as Error).message }, { status: 500 });
	}
}
