-- Restore missing monitoring tables

CREATE TABLE IF NOT EXISTS game_tick_metrics (
    id serial PRIMARY KEY,
    tick_time timestamp DEFAULT now(),
    fleets_processed int DEFAULT 0,
    auto_explore_fleets int DEFAULT 0,
    execution_time_ms int,
    errors_count int DEFAULT 0,
    error_messages text[]
);

CREATE TABLE IF NOT EXISTS fleet_audit_log (
    id serial PRIMARY KEY,
    fleet_id int REFERENCES fleets(id) ON DELETE CASCADE,
    action varchar(50) NOT NULL,
    old_state jsonb,
    new_state jsonb,
    created_at timestamp DEFAULT now()
);
