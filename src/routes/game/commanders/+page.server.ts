import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	COMMANDERS,
	DURATION_COSTS,
	getActiveCommanders,
	getCommanderExperience
} from '$lib/server/commanders';
import { db } from '$lib/server/db';
import { users, fleetTemplates, planets, autoExploreSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const activeCommanders = await getActiveCommanders(locals.user.id);

	// Get current DM
	const userRes = await db
		.select({ darkMatter: users.darkMatter })
		.from(users)
		.where(eq(users.id, locals.user.id));
	const darkMatter = userRes[0]?.darkMatter || 0;

	// Get Fleet Templates
	const templates = await db
		.select()
		.from(fleetTemplates)
		.where(eq(fleetTemplates.userId, locals.user.id));

	// Get User Planets
	const userPlanets = await db.select().from(planets).where(eq(planets.userId, locals.user.id));

	// Get Auto Explore Settings
	const settingsRes = await db
		.select()
		.from(autoExploreSettings)
		.where(eq(autoExploreSettings.userId, locals.user.id));
	const settings = settingsRes[0] || null;

	// Get commander experience data
	const commanderExperience: Record<
		string,
		{
			level: number;
			experience: number;
			totalExperience: number;
			experienceToNext: number;
			maxLevel: number;
		} | null
	> = {};
	for (const commander of activeCommanders) {
		const exp = await getCommanderExperience(locals.user.id, commander.commanderId);
		if (exp) {
			commanderExperience[commander.commanderId] = exp;
		}
	}

	return {
		commanders: COMMANDERS,
		durationCosts: DURATION_COSTS,
		activeCommanders: activeCommanders.reduce(
			(acc, curr) => {
				acc[curr.commanderId] = curr.expiresAt;
				return acc;
			},
			{} as Record<string, Date>
		),
		commanderExperience,
		darkMatter,
		templates,
		userPlanets,
		autoExploreSettings: settings
	};
};
