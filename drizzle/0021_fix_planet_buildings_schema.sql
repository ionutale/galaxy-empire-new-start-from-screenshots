-- Fix specific table structure for planet_buildings to match application code expectation
-- This replaces the flattened table with a normalized one

DROP TABLE IF EXISTS "planet_buildings";

CREATE TABLE "planet_buildings" (
    "id" serial PRIMARY KEY,
    "planet_id" int REFERENCES "planets"("id") ON DELETE CASCADE,
    "building_type_id" int REFERENCES "building_types"("id"),
    "level" int DEFAULT 0,
    "is_upgrading" boolean DEFAULT false,
    "upgrade_started_at" timestamp,
    "upgrade_completion_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    UNIQUE("planet_id", "building_type_id")
);

-- Ensure building types are populated (idempotent insert just in case)
INSERT INTO "building_types" ("id", "name", "description", "category", "base_cost", "base_production", "base_energy", "build_time_formula")
VALUES
(1, 'Metal Mine', 'Extracts metal from the planet surface', 'resource', '{"metal": 60, "crystal": 15, "gas": 0}', '{"metal": 30}', '{"consumption": 10}', 'base_time * 1.5 ^ level'),
(2, 'Crystal Mine', 'Extracts crystal from the planet surface', 'resource', '{"metal": 48, "crystal": 24, "gas": 0}', '{"crystal": 20}', '{"consumption": 10}', 'base_time * 1.6 ^ level'),
(3, 'Gas Extractor', 'Extracts deuterium gas from the planet', 'resource', '{"metal": 225, "crystal": 75, "gas": 0}', '{"gas": 10}', '{"consumption": 20}', 'base_time * 1.5 ^ level'),
(4, 'Solar Plant', 'Produces energy from solar radiation', 'resource', '{"metal": 75, "crystal": 30, "gas": 0}', '{"energy": 20}', NULL, 'base_time * 1.5 ^ level'),
(5, 'Metal Storage', 'Stores mined metal', 'storage', '{"metal": 1000, "crystal": 0, "gas": 0}', NULL, NULL, 'base_time * 2 ^ level'),
(6, 'Crystal Storage', 'Stores mined crystal', 'storage', '{"metal": 1000, "crystal": 500, "gas": 0}', NULL, NULL, 'base_time * 2 ^ level'),
(7, 'Gas Storage', 'Stores mined deuterium', 'storage', '{"metal": 1000, "crystal": 1000, "gas": 0}', NULL, NULL, 'base_time * 2 ^ level'),
(8, 'Robotics Factory', 'Reduces construction time for buildings', 'facility', '{"metal": 400, "crystal": 120, "gas": 200}', NULL, '{"consumption": 10}', 'base_time * 2 ^ level'),
(9, 'Shipyard', 'Required for building ships and defenses', 'facility', '{"metal": 400, "crystal": 200, "gas": 100}', NULL, '{"consumption": 10}', 'base_time * 2 ^ level'),
(10, 'Research Lab', 'Required for conducting research', 'facility', '{"metal": 200, "crystal": 400, "gas": 200}', NULL, '{"consumption": 10}', 'base_time * 2 ^ level')
ON CONFLICT ("id") DO NOTHING;
