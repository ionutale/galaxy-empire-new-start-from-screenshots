CREATE TABLE IF NOT EXISTS user_research (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    energy_tech INTEGER DEFAULT 0,
    laser_tech INTEGER DEFAULT 0,
    ion_tech INTEGER DEFAULT 0,
    hyperspace_tech INTEGER DEFAULT 0,
    plasma_tech INTEGER DEFAULT 0,
    combustion_drive INTEGER DEFAULT 0,
    impulse_drive INTEGER DEFAULT 0,
    hyperspace_drive INTEGER DEFAULT 0,
    espionage_tech INTEGER DEFAULT 0,
    computer_tech INTEGER DEFAULT 0,
    astrophysics INTEGER DEFAULT 0,
    intergalactic_research_network INTEGER DEFAULT 0,
    graviton_tech INTEGER DEFAULT 0,
    weapons_tech INTEGER DEFAULT 0,
    shielding_tech INTEGER DEFAULT 0,
    armour_tech INTEGER DEFAULT 0
);
