-- Private messaging system
CREATE TABLE private_messages (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER REFERENCES users(id),
    to_user_id INTEGER REFERENCES users(id),
    subject VARCHAR(100),
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX private_messages_from_user_idx ON private_messages(from_user_id);
CREATE INDEX private_messages_to_user_idx ON private_messages(to_user_id);
CREATE INDEX private_messages_from_to_idx ON private_messages(from_user_id, to_user_id);
CREATE INDEX private_messages_created_idx ON private_messages(created_at);