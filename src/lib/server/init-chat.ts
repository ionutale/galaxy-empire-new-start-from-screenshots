import { pool } from './db';
import fs from 'fs';
import path from 'path';

async function initChat() {
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'server', 'schema-chat.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Chat tables initialized');
    await pool.end();
}

initChat();
