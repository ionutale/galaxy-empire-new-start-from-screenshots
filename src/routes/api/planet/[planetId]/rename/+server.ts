import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, planets } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { name } = await request.json();
	const planetId = Number(params.planetId);

	if (!planetId || !name) return json({ error: 'Missing parameters' }, { status: 400 });
	if (name.length > 20) return json({ error: 'Name too long' }, { status: 400 });

	// Verify ownership
	const planet = await db
		.select({ id: planets.id })
		.from(planets)
		.where(and(eq(planets.id, planetId), eq(planets.userId, locals.user.id)));

	if (planet.length === 0) return json({ error: 'Forbidden' }, { status: 403 });

	await db.update(planets).set({ name: name }).where(eq(planets.id, planetId));

	return json({ success: true });
};
