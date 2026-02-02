import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

export async function GET() {
	try {
		// Call stored procedures for fleet processing and auto-exploration
		await db.execute(sql`CALL process_fleets()`);
		await db.execute(sql`CALL process_auto_explore()`);
		return json({ success: true });
	} catch (e) {
		console.error('Game tick error:', e);
		return json({ success: false, error: (e as Error).message }, { status: 500 });
	}
}
