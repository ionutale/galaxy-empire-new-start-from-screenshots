import { db } from '$lib/server/db';
import { users, alliances, allianceDiplomacy } from '$lib/server/db/schema';
import { eq, desc, sql, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

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
				const [initiator] = await db
					.select({ tag: alliances.tag })
					.from(alliances)
					.where(eq(alliances.id, dip.initiatorAllianceId as number));
				const [target] = await db
					.select({ tag: alliances.tag })
					.from(alliances)
					.where(eq(alliances.id, dip.targetAllianceId as number));
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
