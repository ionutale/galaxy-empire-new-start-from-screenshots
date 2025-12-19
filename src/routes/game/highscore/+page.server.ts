import { db, users, alliances } from '$lib/server/db';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const highscores = await db.select({
        id: users.id,
        username: users.username,
        points: users.points,
        allianceTag: alliances.tag,
        allianceName: alliances.name
    })
    .from(users)
    .leftJoin(alliances, eq(users.allianceId, alliances.id))
    .orderBy(desc(users.points))
    .limit(100);

    return {
        highscores
    };
};
