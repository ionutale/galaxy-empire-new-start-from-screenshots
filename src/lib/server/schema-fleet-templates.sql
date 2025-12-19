CREATE TABLE IF NOT EXISTS fleet_templates (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    ships JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fleet_templates_user ON fleet_templates(user_id);
