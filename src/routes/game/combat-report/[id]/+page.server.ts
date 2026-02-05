import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { combatReports, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw json({ error: 'Unauthorized' }, { status: 401 });
	}

	const reportId = parseInt(params.id);
	if (isNaN(reportId)) {
		throw json({ error: 'Invalid report ID' }, { status: 400 });
	}

	// Get combat report with attacker and defender names
	const reportRes = await db
		.select({
			id: combatReports.id,
			attackerId: combatReports.attackerId,
			defenderId: combatReports.defenderId,
			galaxy: combatReports.galaxy,
			system: combatReports.system,
			planet: combatReports.planet,
			mission: combatReports.mission,
			attackerFleet: combatReports.attackerFleet,
			defenderFleet: combatReports.defenderFleet,
			defenderDefenses: combatReports.defenderDefenses,
			attackerLosses: combatReports.attackerLosses,
			defenderLosses: combatReports.defenderLosses,
			winner: combatReports.winner,
			rounds: combatReports.rounds,
			loot: combatReports.loot,
			debris: combatReports.debris,
			createdAt: combatReports.createdAt,
			attackerName: users.username,
			defenderName: users.username
		})
		.from(combatReports)
		.leftJoin(users, eq(combatReports.attackerId, users.id))
		.where(eq(combatReports.id, reportId));

	if (reportRes.length === 0) {
		throw json({ error: 'Combat report not found' }, { status: 404 });
	}

	const report = reportRes[0];

	// Check if user has permission to view this report
	if (report.attackerId !== locals.user.id && report.defenderId !== locals.user.id) {
		throw json({ error: 'Access denied' }, { status: 403 });
	}

	return {
		report: {
			...report,
			isAttacker: report.attackerId === locals.user.id
		}
	};
};
