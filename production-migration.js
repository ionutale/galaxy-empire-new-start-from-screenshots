import pg from 'pg';
const { Pool } = pg;

const sql = `
-- Commanders Table
CREATE TABLE IF NOT EXISTS user_commanders (
    user_id INT REFERENCES users(id),
    commander_id VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, commander_id)
);

-- Boosters Table (Shop)
CREATE TABLE IF NOT EXISTS user_boosters (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    booster_id VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_boosters_user_expires ON user_boosters(user_id, expires_at);

-- Fleet Templates Table
CREATE TABLE IF NOT EXISTS fleet_templates (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    ships JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fleet_templates_user ON fleet_templates(user_id);
`;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://galaxy_user:galaxy_password@localhost:5433/galaxy_empire'
});

async function run() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected successfully.');
        client.release();

        console.log('Applying migration...');
        await pool.query(sql);
        console.log('Migration applied successfully!');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
