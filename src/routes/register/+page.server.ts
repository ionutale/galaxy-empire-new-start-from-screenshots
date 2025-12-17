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
                // For simplicity, we'll just pick a random system in Galaxy 1 for now
                // In a real game, we'd have a better algorithm
                const galaxyId = 1;
                // Ensure galaxy exists
                await client.query('INSERT INTO galaxies (id, name) VALUES (1, \'Milky Way\') ON CONFLICT DO NOTHING');
                
                // Find a system or create one
                // Let's just pick system 1 for the first user, or find the next available
                // Simplified: Just put everyone in System 1, Planet 1, 2, 3... for this demo
                // We need to find an empty planet slot.
                
                // Let's try to find an empty spot in existing systems or create a new system
                // This is a bit complex for a single transaction block without helper functions, 
                // but let's try a simple approach: Find first empty planet in system 1.
                
                // Ensure system 1 exists
                await client.query('INSERT INTO solar_systems (galaxy_id, system_number) VALUES (1, 1) ON CONFLICT DO NOTHING');

                // Find next available planet number in system 1
                const planetCheck = await client.query(
                    'SELECT planet_number FROM planets WHERE galaxy_id = 1 AND system_id = 1'
                );
                const occupied = planetCheck.rows.map(r => r.planet_number);
                let planetNum = 1;
                while (occupied.includes(planetNum) && planetNum <= 15) {
                    planetNum++;
                }

                if (planetNum > 15) {
                    // System full, in real app we'd move to next system
                    // For now, just fail or put in system 2 (simplified)
                     await client.query('INSERT INTO solar_systems (galaxy_id, system_number) VALUES (1, 2) ON CONFLICT DO NOTHING');
                     planetNum = 1; // Reset for system 2
                     // Assume system 2 is empty for this demo fallback
                }
                
                const systemId = planetNum > 15 ? 2 : 1; // Hacky fallback

                // Create Home Planet
                const planetRes = await client.query(
                    `INSERT INTO planets (user_id, galaxy_id, system_id, planet_number, name, planet_type, fields_max, image_variant)
                     VALUES ($1, $2, $3, $4, 'Home Planet', 'terrestrial', 163, 1) RETURNING id`,
                    [userId, galaxyId, systemId, planetNum]
                );
                const planetId = planetRes.rows[0].id;

                // Initialize Planet Resources
                await client.query(
                    'INSERT INTO planet_resources (planet_id, metal, crystal, gas, energy) VALUES ($1, 500, 500, 0, 0)',
                    [planetId]
                );

                // Initialize Planet Buildings
                await client.query(
                    'INSERT INTO planet_buildings (planet_id) VALUES ($1)',
                    [planetId]
                );

                // Initialize Planet Ships
                await client.query(
                    'INSERT INTO planet_ships (planet_id) VALUES ($1)',
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
