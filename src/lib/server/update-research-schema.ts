import { pool } from './db';

async function updateResearchSchema() {
    try {
        await pool.query(`
            ALTER TABLE user_research 
            ADD COLUMN IF NOT EXISTS intergalactic_research_network INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS graviton_tech INTEGER DEFAULT 0
        `);
        console.log('Added missing research columns.');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

updateResearchSchema();
