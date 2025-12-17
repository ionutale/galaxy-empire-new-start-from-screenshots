CREATE TABLE IF NOT EXISTS user_research (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    energy_technology INTEGER DEFAULT 0,
    laser_technology INTEGER DEFAULT 0,
    ion_technology INTEGER DEFAULT 0,
    hyperspace_technology INTEGER DEFAULT 0,
    plasma_technology INTEGER DEFAULT 0,
    combustion_drive INTEGER DEFAULT 0,
    impulse_drive INTEGER DEFAULT 0,
    hyperspace_drive INTEGER DEFAULT 0,
    espionage_technology INTEGER DEFAULT 0,
    computer_technology INTEGER DEFAULT 0,
    astrophysics INTEGER DEFAULT 0,
    intergalactic_research_network INTEGER DEFAULT 0,
    graviton_technology INTEGER DEFAULT 0,
    weapons_technology INTEGER DEFAULT 0,
    shielding_technology INTEGER DEFAULT 0,
    armor_technology INTEGER DEFAULT 0
);
