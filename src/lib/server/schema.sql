-- 1. Users & Auth
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_id INT DEFAULT 1,
    dark_matter INT DEFAULT 0, -- Premium currency
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL
);

-- 2. Universe & Map
CREATE TABLE IF NOT EXISTS galaxies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS solar_systems (
    id SERIAL PRIMARY KEY,
    galaxy_id INT REFERENCES galaxies(id),
    system_number INT NOT NULL, -- 1 to 499
    UNIQUE(galaxy_id, system_number)
);

CREATE TABLE IF NOT EXISTS planets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id), -- NULL if empty/uncolonized
    galaxy_id INT NOT NULL,
    system_id INT NOT NULL,
    planet_number INT NOT NULL, -- 1 to 15
    name VARCHAR(50) DEFAULT 'Colony',
    planet_type VARCHAR(20) NOT NULL, -- 'dry', 'desert', 'gas', 'ice'
    fields_used INT DEFAULT 0,
    fields_max INT DEFAULT 163,
    temperature_min INT,
    temperature_max INT,
    image_variant INT, -- Which visual asset to use
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(galaxy_id, system_id, planet_number)
);

-- 3. Resources & Buildings
CREATE TABLE IF NOT EXISTS planet_resources (
    planet_id INT PRIMARY KEY REFERENCES planets(id),
    metal DOUBLE PRECISION DEFAULT 500,
    crystal DOUBLE PRECISION DEFAULT 500,
    gas DOUBLE PRECISION DEFAULT 0,
    energy INT DEFAULT 0,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- For calculating production since last check
);

CREATE TABLE IF NOT EXISTS planet_buildings (
    planet_id INT PRIMARY KEY REFERENCES planets(id),
    metal_mine INT DEFAULT 0,
    crystal_mine INT DEFAULT 0,
    gas_extractor INT DEFAULT 0,
    solar_plant INT DEFAULT 0,
    shipyard INT DEFAULT 0,
    research_lab INT DEFAULT 0,
    robotics_factory INT DEFAULT 0,
    nanite_factory INT DEFAULT 0,
    metal_storage INT DEFAULT 0,
    crystal_storage INT DEFAULT 0,
    gas_storage INT DEFAULT 0
);

-- 4. Research & Tech
CREATE TABLE IF NOT EXISTS user_research (
    user_id INT PRIMARY KEY REFERENCES users(id),
    energy_tech INT DEFAULT 0,
    laser_tech INT DEFAULT 0,
    ion_tech INT DEFAULT 0,
    hyperspace_tech INT DEFAULT 0,
    plasma_tech INT DEFAULT 0,
    combustion_drive INT DEFAULT 0,
    impulse_drive INT DEFAULT 0,
    hyperspace_drive INT DEFAULT 0,
    espionage_tech INT DEFAULT 0,
    computer_tech INT DEFAULT 0,
    astrophysics INT DEFAULT 0,
    weapons_tech INT DEFAULT 0,
    shielding_tech INT DEFAULT 0,
    armour_tech INT DEFAULT 0
);
