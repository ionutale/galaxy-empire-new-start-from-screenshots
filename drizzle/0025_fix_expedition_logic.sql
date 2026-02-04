-- Migration: Create game_config table and fix expedition logic
-- This migration ensures the game_config table exists for expedition configuration

CREATE TABLE IF NOT EXISTS "game_config" (
    "config_key" varchar(50) PRIMARY KEY,
    "config_value" jsonb NOT NULL,
    "updated_at" timestamp DEFAULT now()
);

-- Insert default expedition config
INSERT INTO "game_config" ("config_key", "config_value")
VALUES ('expedition_rewards', '{
    "resource_min": 1000,
    "resource_max": 5000,
    "ship_reward_chance": 0.25,
    "ship_types": ["light_fighter", "heavy_fighter", "small_cargo", "espionage_probe"],
    "ship_count_min": 1,
    "ship_count_max": 5,
    "dark_matter_reward": 50,
    "black_hole_chance": 0.1
}')
ON CONFLICT ("config_key") DO NOTHING;
