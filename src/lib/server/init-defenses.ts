import { pool } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDefenses() {
    try {
        const schemaPath = path.join(__dirname, 'schema-defenses.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schemaSql);
        console.log('Defenses schema initialized successfully!');
        
        // Backfill existing planets
        const planets = await pool.query('SELECT id FROM planets');
        for (const planet of planets.rows) {
            await pool.query(
                `INSERT INTO planet_defenses (planet_id) VALUES ($1) ON CONFLICT (planet_id) DO NOTHING`,
                [planet.id]
            );
        }
        console.log('Backfilled defenses for existing planets.');

    } catch (error) {
        console.error('Error initializing defenses schema:', error);
    } finally {
        await pool.end();
    }
}

initDefenses();
