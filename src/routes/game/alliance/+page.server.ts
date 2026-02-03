import { db } from '$lib/server/db';
import { users, alliances, allianceDiplomacy } from '$lib/server/db/schema';
import { eq, desc, sql, or, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return {};

	// Refresh user data to get alliance_id
	const userRes = await db
		.select({ allianceId: users.allianceId })
		.from(users)
		.where(eq(users.id, locals.user.id));

	const allianceId = userRes[0]?.allianceId;

	if (allianceId) {
		// User is in an alliance
		const allianceRes = await db.select().from(alliances).where(eq(alliances.id, allianceId));
		const alliance = allianceRes[0];

		const membersRes = await db
			.select({
				id: users.id,
				username: users.username,
				points: users.points
			})
			.from(users)
			.where(eq(users.allianceId, allianceId))
			.orderBy(desc(users.points));

		// Load diplomacy relations
		const diplomacyRes = await db
			.select({
				id: allianceDiplomacy.id,
				initiatorAllianceId: allianceDiplomacy.initiatorAllianceId,
				targetAllianceId: allianceDiplomacy.targetAllianceId,
				type: allianceDiplomacy.type,
				status: allianceDiplomacy.status,
				expiresAt: allianceDiplomacy.expiresAt,
				createdAt: allianceDiplomacy.createdAt
			})
			.from(allianceDiplomacy)
			.where(
				or(
					eq(allianceDiplomacy.initiatorAllianceId, allianceId),
					eq(allianceDiplomacy.targetAllianceId, allianceId)
				)
			)
			.orderBy(desc(allianceDiplomacy.createdAt));

		// Load alliance tags for diplomacy
		const diplomacyWithTags = await Promise.all(
			diplomacyRes.map(async (dip) => {
				const [initiator] = await db.select({ tag: alliances.tag }).from(alliances).where(eq(alliances.id, dip.initiatorAllianceId));
				const [target] = await db.select({ tag: alliances.tag }).from(alliances).where(eq(alliances.id, dip.targetAllianceId));
				return {
					...dip,
					initiatorTag: initiator?.tag || 'Unknown',
					targetTag: target?.tag || 'Unknown'
				};
			})
		);

		// Load all alliances for diplomacy dropdown
		const allAlliancesRes = await db
			.select({
				id: alliances.id,
				name: alliances.name,
				tag: alliances.tag
			})
			.from(alliances)
			.where(sql`${alliances.id} != ${allianceId}`)
			.orderBy(alliances.name);

		return {
			inAlliance: true,
			alliance,
			members: membersRes,
			diplomacy: diplomacyWithTags,
			allAlliances: allAlliancesRes
		};
	} else {
		// User is not in an alliance
		const alliancesRes = await db
			.select({
				id: alliances.id,
				name: alliances.name,
				tag: alliances.tag,
				ownerId: alliances.ownerId,
				createdAt: alliances.createdAt,
				memberCount: sql<number>`count(${users.id})`
			})
			.from(alliances)
			.leftJoin(users, eq(alliances.id, users.allianceId))
			.groupBy(alliances.id)
			.orderBy(desc(sql`count(${users.id})`));

		return {
			inAlliance: false,
			alliances: alliancesRes
		};
	}
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const tag = data.get('tag') as string;

		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const userId = locals.user.id;
		if (!name || !tag) return fail(400, { error: 'Name and Tag required' });

		try {
			await db.transaction(async (tx) => {
				// Create alliance
				const res = await tx
					.insert(alliances)
					.values({
						name,
						tag,
						ownerId: userId
					})
					.returning({ id: alliances.id });

				const allianceId = res[0].id;

				// Update user
				await tx.update(users).set({ allianceId }).where(eq(users.id, userId));
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Failed to create alliance' });
		}
	},
	join: async ({ request, locals }) => {
		const data = await request.formData();
		const allianceId = Number(data.get('allianceId'));

		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		await db.update(users).set({ allianceId }).where(eq(users.id, locals.user.id));

		return { success: true };
	},
	leave: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		await db.update(users).set({ allianceId: null }).where(eq(users.id, locals.user.id));

		return { success: true };
	},
	declareWar: async ({ request, locals }) => {
		const data = await request.formData();
		const targetAllianceId = Number(data.get('targetAllianceId'));

		if (!locals.user?.allianceId) return fail(401, { error: 'Not in alliance' });

		try {
			await db.insert(allianceDiplomacy).values({
				initiatorAllianceId: locals.user.allianceId,
				targetAllianceId,
				type: 'war',
				status: 'active'
			});
			return { success: true };
		} catch (e) {
			return fail(500, { error: 'Failed to declare war' });
		}
	},
	declarePeace: async ({ request, locals }) => {
		const data = await request.formData();
		const targetAllianceId = Number(data.get('targetAllianceId'));

		if (!locals.user?.allianceId) return fail(401, { error: 'Not in alliance' });

		try {
			await db.insert(allianceDiplomacy).values({
				initiatorAllianceId: locals.user.allianceId,
				targetAllianceId,
				type: 'peace',
				status: 'active'
			});
			return { success: true };
		} catch (e) {
			return fail(500, { error: 'Failed to declare peace' });
		}
	}
};
