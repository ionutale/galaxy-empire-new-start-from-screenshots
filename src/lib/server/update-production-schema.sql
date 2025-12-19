CREATE TABLE IF NOT EXISTS user_commanders (
    user_id INT REFERENCES users(id),
    commander_id VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, commander_id)
);

CREATE TABLE IF NOT EXISTS user_boosters (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    booster_id VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_boosters_user_expires ON user_boosters(user_id, expires_at);

CREATE TABLE IF NOT EXISTS fleet_templates (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    ships JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fleet_templates_user ON fleet_templates(user_id);
