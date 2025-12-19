import { fail, redirect } from '@sveltejs/kit';
import { pool } from '$lib/server/db';
import { hashPassword, createSession } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const username = data.get('username') as string;
        const email = data.get('email') as string;
        const password = data.get('password') as string;

        if (!username || !email || !password) {
            return fail(400, { missing: true });
        }

        try {
            // Check if user exists
            const existing = await pool.query(
                'SELECT id FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );

            if (existing.rows.length > 0) {
                return fail(400, { userExists: true });
            }

            // Hash password
            const hash = await hashPassword(password);

            // Create user
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                const userRes = await client.query(
                    'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
                    [username, email, hash]
                );
                const userId = userRes.rows[0].id;

                // Initialize User Research
                await client.query(
                    'INSERT INTO user_research (user_id) VALUES ($1)',
                    [userId]
                );

                // Find a free planet slot for Home Planet
                // Random assignment logic: Random Galaxy (1-3), Random System (1-499), Random Planet (1-15)
                let galaxyId = 1;
                let systemId = 1;
                let planetNum = 1;
                let found = false;
                
                // Try to find a random empty slot
                for (let i = 0; i < 100; i++) {
                    const g = Math.floor(Math.random() * 3) + 1;
                    const s = Math.floor(Math.random() * 499) + 1;
                    const p = Math.floor(Math.random() * 15) + 1;
                    
                    const check = await client.query(
                        'SELECT 1 FROM planets WHERE galaxy_id = $1 AND system_id = $2 AND planet_number = $3',
                        [g, s, p]
                    );
                    
                    if (check.rows.length === 0) {
                        galaxyId = g;
                        systemId = s;
                        planetNum = p;
                        found = true;
                        break;
                    }
                }

                // Ensure galaxy exists
                await client.query('INSERT INTO galaxies (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [galaxyId, `Galaxy ${galaxyId}`]);
                
                // Ensure system exists
                await client.query('INSERT INTO solar_systems (galaxy_id, system_number) VALUES ($1, $2) ON CONFLICT DO NOTHING', [galaxyId, systemId]);

                // Create Home Planet
                const planetRes = await client.query(
                    `INSERT INTO planets (user_id, galaxy_id, system_id, planet_number, name, planet_type, fields_max, image_variant)
                     VALUES ($1, $2, $3, $4, 'Home Planet', 'terrestrial', 163, 1) RETURNING id`,
                    [userId, galaxyId, systemId, planetNum]
                );
                const planetId = planetRes.rows[0].id;

                // Initialize Planet Resources - New users start with more resources
                await client.query(
                    'INSERT INTO planet_resources (planet_id, metal, crystal, gas, energy) VALUES ($1, 30000, 21000, 7500, 0)',
                    [planetId]
                );

                // Initialize Planet Buildings
                await client.query(
                    'INSERT INTO planet_buildings (planet_id) VALUES ($1)',
                    [planetId]
                );

                // Initialize Planet Ships - Starter Kit
                await client.query(
                    'INSERT INTO planet_ships (planet_id, small_cargo, light_fighter) VALUES ($1, 5, 5)',
                    [planetId]
                );

                // Initialize Planet Defenses
                await client.query(
                    'INSERT INTO planet_defenses (planet_id) VALUES ($1)',
                    [planetId]
                );

                await client.query('COMMIT');

                // Create session
                const sessionId = await createSession(userId);
                cookies.set('session_id', sessionId, {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'strict',
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 60 * 60 * 24 * 30 // 30 days
                });

            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }

        } catch (err) {
            console.error(err);
            return fail(500, { error: 'Internal Server Error' });
        }

        throw redirect(303, '/game');
    }
} satisfies Actions;
