import { pool } from './db.js';
import schema from './schema.sql?raw';
import schemaAlliances from './schema-alliances.sql?raw';
import schemaChat from './schema-chat.sql?raw';
import schemaDefenses from './schema-defenses.sql?raw';
import schemaFleets from './schema-fleets.sql?raw';
import schemaMessages from './schema-messages.sql?raw';
import schemaResearch from './schema-research.sql?raw';

export async function initDb() {
    try {
        console.log('Initializing database...');
        
        // 1. Core Schema (Users, Planets, etc.)
        await pool.query(schema);
        
        // 2. Modules
        await pool.query(schemaAlliances);
        await pool.query(schemaChat);
        await pool.query(schemaDefenses);
        await pool.query(schemaFleets);
        await pool.query(schemaMessages);
        await pool.query(schemaResearch);

        // 3. Backfills
        // Research
        const users = await pool.query('SELECT id FROM users');
        for (const user of users.rows) {
            await pool.query(
                `INSERT INTO user_research (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
                [user.id]
            );
        }

        // Defenses
        const planets = await pool.query('SELECT id FROM planets');
        for (const planet of planets.rows) {
            await pool.query(
                `INSERT INTO planet_defenses (planet_id) VALUES ($1) ON CONFLICT (planet_id) DO NOTHING`,
                [planet.id]
            );
        }

        console.log('Database initialized successfully!');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

