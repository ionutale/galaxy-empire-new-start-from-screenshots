import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	planets,
	users,
	messages,
	galaxies,
	solarSystems,
	planetResources,
	planetDefenses,
	planetShips,
	userResearch
} from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { updatePlanetResources } from '$lib/server/game';
import { processFleets } from '$lib/server/fleet-processor';
import { processAutoExplore } from '$lib/server/auto-explorer';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends, url, cookies }) => {
	if (!locals.user || !locals.user.id) {
		throw redirect(303, '/login');
	}

	depends('app:unread-messages');
	depends('app:game-data');

	// Fleet processing is now handled by PostgreSQL pg_cron
	// await processFleets();
	// await processAutoExplore();

	// Fetch user's planets
	const planetsRes = await db
		.select({
			id: planets.id,
			name: planets.name,
			galaxyId: planets.galaxyId,
			systemId: planets.systemId,
			planetNumber: planets.planetNumber,
			imageVariant: planets.imageVariant
		})
		.from(planets)
		.where(eq(planets.userId, locals.user.id))
		.orderBy(asc(planets.id));

	// Refresh user DM
	const userRes = await db
		.select({ darkMatter: users.darkMatter })
		.from(users)
		.where(eq(users.id, locals.user.id));

	if (userRes.length > 0) {
		locals.user.darkMatter = userRes[0].darkMatter || 0;
	}

	const userPlanets = planetsRes;

	const userId = locals.user.id;

	if (userPlanets.length === 0) {
		// Self-healing: Create a home planet if none exists
		await db.transaction(async (tx) => {
			// Initialize User Research if missing
			await tx.insert(userResearch).values({ userId }).onConflictDoNothing();

			// Find a free planet slot for Home Planet
			let galaxyId = 1;
			let systemId = 1;
			let planetNum = 1;

			// Try to find a random empty slot
			for (let i = 0; i < 100; i++) {
				const g = Math.floor(Math.random() * 3) + 1;
				const s = Math.floor(Math.random() * 499) + 1;
				const p = Math.floor(Math.random() * 15) + 1;

				const check = await tx
					.select({ id: planets.id })
					.from(planets)
					.where(
						and(eq(planets.galaxyId, g), eq(planets.systemId, s), eq(planets.planetNumber, p))
					);

				if (check.length === 0) {
					galaxyId = g;
					systemId = s;
					planetNum = p;
					break;
				}
			}

			// Ensure galaxy exists
			await tx
				.insert(galaxies)
				.values({ id: galaxyId, name: `Galaxy ${galaxyId}` })
				.onConflictDoNothing();

			// Ensure system exists
			await tx
				.insert(solarSystems)
				.values({ galaxyId, systemNumber: systemId })
				.onConflictDoNothing();

			// Create Home Planet
			const [newPlanet] = await tx
				.insert(planets)
				.values({
					userId,
					galaxyId,
					systemId,
					planetNumber: planetNum,
					name: 'Home Planet',
					planetType: 'terrestrial',
					fieldsMax: 163,
					imageVariant: 1
				})
				.returning({
					id: planets.id,
					name: planets.name,
					galaxyId: planets.galaxyId,
					systemId: planets.systemId,
					planetNumber: planets.planetNumber,
					imageVariant: planets.imageVariant
				});

			// Initialize Planet Resources
			await tx.insert(planetResources).values({
				planetId: newPlanet.id,
				metal: 30000,
				crystal: 21000,
				gas: 7500,
				energy: 0
			});

			// Initialize Planet Defenses
			await tx.insert(planetDefenses).values({ planetId: newPlanet.id });

			// Initialize Planet Ships
			await tx.insert(planetShips).values({ planetId: newPlanet.id });

			userPlanets.push(newPlanet);
		});
	}

	// Determine current planet
	let currentPlanet = userPlanets[0];
	const queryPlanetId = url.searchParams.get('planet');
	const cookiePlanetId = cookies.get('currentPlanetId');

	if (queryPlanetId) {
		const selected = userPlanets.find((p) => p.id === parseInt(queryPlanetId));
		if (selected) {
			currentPlanet = selected;
			cookies.set('currentPlanetId', currentPlanet.id.toString(), {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 30
			});
		}
	} else if (cookiePlanetId) {
		const selected = userPlanets.find((p) => p.id === parseInt(cookiePlanetId));
		if (selected) {
			currentPlanet = selected;
		}
	}

	// Update and fetch resources for current planet
	const resources = await updatePlanetResources(currentPlanet.id);

	// Fetch unread messages count
	// Using count() would be more efficient, but let's check the array length for now to ensure type safety
	const msgRes = await db
		.select({ id: messages.id })
		.from(messages)
		.where(and(eq(messages.userId, locals.user.id), eq(messages.isRead, false)));

	const unreadMessages = msgRes ? msgRes.length : 0;

	return {
		user: locals.user,
		planets: userPlanets,
		currentPlanet,
		resources,
		unreadMessages
	};
};
