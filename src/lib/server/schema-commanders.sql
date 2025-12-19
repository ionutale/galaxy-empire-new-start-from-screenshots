CREATE TABLE IF NOT EXISTS user_commanders (
    user_id INT REFERENCES users(id),
    commander_id VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, commander_id)
);
