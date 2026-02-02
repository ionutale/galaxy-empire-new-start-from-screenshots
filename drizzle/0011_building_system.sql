-- Migration: Add building system tables
-- This migration creates the core building system infrastructure

-- Building types and their properties
CREATE TABLE IF NOT EXISTS building_types (
    id serial PRIMARY KEY,
    name varchar(100) NOT NULL,
    description text,
    category varchar(50) NOT NULL, -- 'resource', 'facility', 'military', 'storage'
    base_cost jsonb NOT NULL, -- {'metal': X, 'crystal': Y, 'gas': Z}
    base_production jsonb, -- For resource buildings
    base_energy jsonb, -- {'consumption': X, 'production': Y}
    max_level int DEFAULT 100,
    prerequisites jsonb, -- {'building_id': level, 'research_id': level}
    build_time_formula varchar(200), -- Formula for calculating build time
    created_at timestamp DEFAULT now()
);--> statement-breakpoint

-- Planet buildings (what buildings exist on each planet)
CREATE TABLE IF NOT EXISTS planet_buildings (
    id serial PRIMARY KEY,
    planet_id int REFERENCES planets(id) ON DELETE CASCADE,
    building_type_id int REFERENCES building_types(id),
    level int DEFAULT 0,
    is_upgrading boolean DEFAULT false,
    upgrade_started_at timestamp,
    upgrade_completion_at timestamp,
    created_at timestamp DEFAULT now(),
    UNIQUE(planet_id, building_type_id)
);--> statement-breakpoint

-- Building construction queue
CREATE TABLE IF NOT EXISTS building_queue (
    id serial PRIMARY KEY,
    planet_id int REFERENCES planets(id) ON DELETE CASCADE,
    building_type_id int REFERENCES building_types(id),
    target_level int NOT NULL,
    started_at timestamp DEFAULT now(),
    completion_at timestamp NOT NULL,
    resources_reserved jsonb NOT NULL, -- Resources locked for this build
    created_at timestamp DEFAULT now()
);--> statement-breakpoint

-- Insert base building types
INSERT INTO building_types (name, description, category, base_cost, base_production, base_energy, build_time_formula) VALUES
-- Resource Buildings
('Metal Mine', 'Extracts metal from the planet surface', 'resource',
 '{"metal": 60, "crystal": 15, "gas": 0}',
 '{"metal": 30}',
 '{"consumption": 10}',
 '60 * 1.5^(level-1)'),

('Crystal Mine', 'Extracts crystal from the planet surface', 'resource',
 '{"metal": 48, "crystal": 24, "gas": 0}',
 '{"crystal": 20}',
 '{"consumption": 10}',
 '48 * 1.5^(level-1)'),

('Gas Extractor', 'Extracts gas from the planet atmosphere', 'resource',
 '{"metal": 225, "crystal": 75, "gas": 0}',
 '{"gas": 10}',
 '{"consumption": 20}',
 '225 * 1.5^(level-1)'),

('Solar Plant', 'Generates energy from solar radiation', 'resource',
 '{"metal": 75, "crystal": 30, "gas": 0}',
 NULL,
 '{"production": 20}',
 '75 * 1.5^(level-1)'),

-- Storage Buildings
('Metal Storage', 'Increases metal storage capacity', 'storage',
 '{"metal": 1000, "crystal": 0, "gas": 0}',
 NULL,
 NULL,
 '1000 * 1.5^(level-1)'),

('Crystal Storage', 'Increases crystal storage capacity', 'storage',
 '{"metal": 1000, "crystal": 500, "gas": 0}',
 NULL,
 NULL,
 '1000 * 1.5^(level-1)'),

('Gas Storage', 'Increases gas storage capacity', 'storage',
 '{"metal": 1000, "crystal": 1000, "gas": 0}',
 NULL,
 NULL,
 '1000 * 1.5^(level-1)'),

-- Facilities
('Shipyard', 'Allows construction of ships and defenses', 'facility',
 '{"metal": 400, "crystal": 200, "gas": 100}',
 NULL,
 NULL,
 '400 * 1.5^(level-1)'),

('Research Lab', 'Enables research of new technologies', 'facility',
 '{"metal": 200, "crystal": 400, "gas": 200}',
 NULL,
 NULL,
 '200 * 1.5^(level-1)'),

('Robotics Factory', 'Speeds up building construction', 'facility',
 '{"metal": 400, "crystal": 120, "gas": 200}',
 NULL,
 NULL,
 '400 * 1.5^(level-1)'),

('Nanite Factory', 'Massively speeds up construction', 'facility',
 '{"metal": 1000000, "crystal": 500000, "gas": 100000}',
 NULL,
 NULL,
 '1000000 * 1.5^(level-1)');--> statement-breakpoint

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_planet_buildings_planet_id ON planet_buildings(planet_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_building_queue_planet_id ON building_queue(planet_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_building_queue_completion_at ON building_queue(completion_at);--> statement-breakpoint