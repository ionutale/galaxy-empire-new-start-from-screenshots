import { pool } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) return {};

    // Refresh user data to get alliance_id
    const userRes = await pool.query('SELECT alliance_id FROM users WHERE id = $1', [locals.user.id]);
    const allianceId = userRes.rows[0]?.alliance_id;

    if (allianceId) {
        // User is in an alliance
        const allianceRes = await pool.query('SELECT * FROM alliances WHERE id = $1', [allianceId]);
        const alliance = allianceRes.rows[0];

        const membersRes = await pool.query('SELECT id, username, points FROM users WHERE alliance_id = $1 ORDER BY points DESC', [allianceId]);
        const members = membersRes.rows;

        return {
            inAlliance: true,
            alliance,
            members
        };
    } else {
        // User is not in an alliance
        const alliancesRes = await pool.query(
            `SELECT a.*, COUNT(u.id) as member_count 
             FROM alliances a 
             LEFT JOIN users u ON a.id = u.alliance_id 
             GROUP BY a.id 
             ORDER BY member_count DESC`
        );
        
        return {
            inAlliance: false,
            alliances: alliancesRes.rows
        };
    }
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        const data = await request.formData();
        const name = data.get('name') as string;
        const tag = data.get('tag') as string;

        if (!locals.user) return fail(401, { error: 'Unauthorized' });
        if (!name || !tag) return fail(400, { error: 'Name and Tag required' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Create alliance
            const res = await client.query(
                'INSERT INTO alliances (name, tag, owner_id) VALUES ($1, $2, $3) RETURNING id',
                [name, tag, locals.user.id]
            );
            const allianceId = res.rows[0].id;

            // Update user
            await client.query(
                'UPDATE users SET alliance_id = $1 WHERE id = $2',
                [allianceId, locals.user.id]
            );

            await client.query('COMMIT');
            return { success: true };
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
            return fail(500, { error: 'Failed to create alliance' });
        } finally {
            client.release();
        }
    },
    join: async ({ request, locals }) => {
        const data = await request.formData();
        const allianceId = data.get('allianceId') as string;

        if (!locals.user) return fail(401, { error: 'Unauthorized' });

        await pool.query(
            'UPDATE users SET alliance_id = $1 WHERE id = $2',
            [allianceId, locals.user.id]
        );

        return { success: true };
    },
    leave: async ({ locals }) => {
        if (!locals.user) return fail(401, { error: 'Unauthorized' });

        await pool.query(
            'UPDATE users SET alliance_id = NULL WHERE id = $1',
            [locals.user.id]
        );

        return { success: true };
    }
};
