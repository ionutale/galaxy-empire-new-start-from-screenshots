import { pool } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initResearch() {
    try {
        const schemaPath = path.join(__dirname, 'schema-research.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schemaSql);
        console.log('Research schema initialized successfully!');
        
        // Optional: Backfill existing users
        const users = await pool.query('SELECT id FROM users');
        for (const user of users.rows) {
            await pool.query(
                `INSERT INTO user_research (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
                [user.id]
            );
        }
        console.log('Backfilled research for existing users.');

    } catch (error) {
        console.error('Error initializing research schema:', error);
    } finally {
        await pool.end();
    }
}

initResearch();
