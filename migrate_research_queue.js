
const pg = require('pg');

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('ALTER TABLE research_queue ADD COLUMN IF NOT EXISTS resources_reserved JSONB');
    console.log('Column research_queue.resources_reserved added successfully (or already existed)');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
