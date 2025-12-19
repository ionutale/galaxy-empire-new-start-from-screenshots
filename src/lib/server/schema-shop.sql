CREATE TABLE IF NOT EXISTS user_boosters (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    booster_id VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_boosters_user_expires ON user_boosters(user_id, expires_at);
