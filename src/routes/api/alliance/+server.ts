import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, alliances, allianceDiplomacy } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const userId = locals.user.id;

	try {
		const { action, ...data } = await request.json();

		if (action === 'create') {
			const { name, tag } = data;
			if (!name || !tag) throw error(400, 'Name and Tag required');

			await db.transaction(async (tx) => {
				const res = await tx
					.insert(alliances)
					.values({ name, tag, ownerId: userId })
					.returning({ id: alliances.id });
				await tx.update(users).set({ allianceId: res[0].id }).where(eq(users.id, userId));
			});
			return json({ success: true });
		}

		if (action === 'join') {
			const { allianceId } = data;
			if (!allianceId) throw error(400, 'Alliance ID required');
			await db.update(users).set({ allianceId }).where(eq(users.id, userId));
			return json({ success: true });
		}

		if (action === 'leave') {
			await db.update(users).set({ allianceId: null }).where(eq(users.id, userId));
			return json({ success: true });
		}

		if (action === 'declareWar') {
			const { targetAllianceId } = data;
			if (!locals.user.allianceId) throw error(400, 'Not in alliance');
			await db.insert(allianceDiplomacy).values({
				initiatorAllianceId: locals.user.allianceId,
				targetAllianceId,
				type: 'war',
				status: 'active'
			});
			return json({ success: true });
		}

		if (action === 'declarePeace') {
			const { targetAllianceId } = data;
			if (!locals.user.allianceId) throw error(400, 'Not in alliance');
			await db.insert(allianceDiplomacy).values({
				initiatorAllianceId: locals.user.allianceId,
				targetAllianceId,
				type: 'peace',
				status: 'active'
			});
			return json({ success: true });
		}

		throw error(400, 'Invalid action');
	} catch (e: unknown) {
		console.error('Alliance API Error:', e);
		return json({ success: false, error: (e as Error).message }, { status: 400 });
	}
};
