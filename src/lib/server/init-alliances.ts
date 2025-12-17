import { pool } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initAlliances() {
    try {
        const schemaPath = path.join(__dirname, 'schema-alliances.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schemaSql);
        console.log('Alliances schema initialized successfully!');

    } catch (error) {
        console.error('Error initializing alliances schema:', error);
    } finally {
        await pool.end();
    }
}

initAlliances();
