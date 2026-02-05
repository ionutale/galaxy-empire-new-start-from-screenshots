import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { espionageReports, users } from '$lib/server/db/schema';
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

	// Get espionage report with target name
	const reportRes = await db
		.select({
			id: espionageReports.id,
			attackerId: espionageReports.attackerId,
			targetId: espionageReports.targetId,
			galaxy: espionageReports.galaxy,
			system: espionageReports.system,
			planet: espionageReports.planet,
			resources: espionageReports.resources,
			buildings: espionageReports.buildings,
			fleet: espionageReports.fleet,
			defenses: espionageReports.defenses,
			research: espionageReports.research,
			createdAt: espionageReports.createdAt,
			targetName: users.username
		})
		.from(espionageReports)
		.leftJoin(users, eq(espionageReports.targetId, users.id))
		.where(eq(espionageReports.id, reportId));

	if (reportRes.length === 0) {
		throw json({ error: 'Espionage report not found' }, { status: 404 });
	}

	const report = reportRes[0];

	// Check if user has permission to view this report (only attacker can view)
	if (report.attackerId !== locals.user.id) {
		throw json({ error: 'Access denied' }, { status: 403 });
	}

	return {
		report
	};
};
