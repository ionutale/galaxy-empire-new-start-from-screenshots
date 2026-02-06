import { type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import { processFleets } from '$lib/server/fleet-processor';
import { processAutoExplore } from '$lib/server/auto-explorer';
import { ShipyardService } from '$lib/server/shipyard-service';
import { ResearchService } from '$lib/server/research-service';
import { processBroodRaids } from '$lib/server/brood';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { building } from '$app/environment';

// Global interval handling for dev HMR
declare global {
	var __game_tick_interval: NodeJS.Timeout | undefined;
}

// Game ticks are handled by pg_cron in the database.
// We disable the Node.js interval to prevent resource contention and latency issues.
if (!building) {
	console.log('Game tick loop is managed by PostgreSQL (pg_cron). Skipping Node.js tick loop.');
}

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session_id');

	if (sessionId) {
		const session = await getSession(sessionId);
		if (session && session.userId) {
			event.locals.user = {
				id: session.userId,
				username: session.username,
				darkMatter: session.darkMatter || 0,
				allianceId: session.allianceId,
				role: session.role || 'player'
			};
		}
	}

	return resolve(event);
};
