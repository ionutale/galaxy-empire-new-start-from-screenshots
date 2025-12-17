import { pool } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initMessages() {
    try {
        const schemaPath = path.join(__dirname, 'schema-messages.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Connecting to database...');
        const client = await pool.connect();
        
        console.log('Running messages schema...');
        await client.query(schema);
        
        console.log('Messages schema initialized successfully!');
        client.release();
        await pool.end();
    } catch (err) {
        console.error('Error initializing messages:', err);
        process.exit(1);
    }
}

initMessages();
