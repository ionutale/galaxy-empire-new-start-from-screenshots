CREATE TABLE IF NOT EXISTS fleets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    origin_planet_id INT REFERENCES planets(id),
    target_galaxy INT,
    target_system INT,
    target_planet INT,
    mission VARCHAR(20), -- 'attack', 'transport', 'colonize', 'espionage', 'return'
    ships JSONB, -- {'light_fighter': 10, ...}
    resources JSONB, -- {'metal': 1000, ...}
    departure_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    arrival_time TIMESTAMP,
    return_time TIMESTAMP, -- When it returns to origin
    status VARCHAR(20) DEFAULT 'active' -- 'active', 'returning', 'completed'
);

CREATE TABLE IF NOT EXISTS planet_ships (
    planet_id INT PRIMARY KEY REFERENCES planets(id),
    light_fighter INT DEFAULT 0,
    heavy_fighter INT DEFAULT 0,
    cruiser INT DEFAULT 0,
    battleship INT DEFAULT 0,
    colony_ship INT DEFAULT 0,
    small_cargo INT DEFAULT 0,
    large_cargo INT DEFAULT 0
);
