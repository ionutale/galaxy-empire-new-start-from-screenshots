import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	users,
	userResearch,
	galaxies,
	solarSystems,
	planets,
	planetResources,
	planetBuildings,
	planetDefenses,
	planetShips
} from '$lib/server/db/schema';
import { eq, or, and } from 'drizzle-orm';
import { hashPassword, createSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { username, email, password } = await request.json();

		if (!username || !email || !password) {
			return json({ success: false, missing: true }, { status: 400 });
		}

		// Check if user exists
		const existing = await db
			.select({ id: users.id })
			.from(users)
			.where(or(eq(users.username, username), eq(users.email, email)));

		if (existing.length > 0) {
			return json({ success: false, userExists: true }, { status: 400 });
		}

		// Hash password
		const hash = await hashPassword(password);

		// Create user and initialize everything in a transaction
		const userId = await db.transaction(async (tx) => {
			// Create User
			const [newUser] = await tx
				.insert(users)
				.values({
					username,
					email,
					passwordHash: hash
				})
				.returning({ id: users.id });

			// Initialize User Research
			await tx.insert(userResearch).values({ userId: newUser.id });

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
					userId: newUser.id,
					galaxyId,
					systemId,
					planetNumber: planetNum,
					name: 'Home Planet',
					planetType: 'terrestrial',
					fieldsMax: 163,
					imageVariant: 1
				})
				.returning({ id: planets.id });

			// Initialize Planet Resources - New users start with more resources
			await tx.insert(planetResources).values({
				planetId: newPlanet.id,
				metal: 30000,
				crystal: 21000,
				gas: 7500,
				energy: 0
			});

			// Initialize Planet Buildings
			await tx.insert(planetBuildings).values({ planetId: newPlanet.id });

			// Initialize Planet Defenses
			await tx.insert(planetDefenses).values({ planetId: newPlanet.id });

			// Initialize Planet Ships
			await tx.insert(planetShips).values({ planetId: newPlanet.id });

			return newUser.id;
		});

		const sessionId = await createSession(userId);
		cookies.set('session_id', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		return json({ success: true });
	} catch (err) {
		console.error(err);
		return json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
};
