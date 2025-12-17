CREATE TABLE IF NOT EXISTS planet_defenses (
    planet_id INTEGER PRIMARY KEY REFERENCES planets(id),
    rocket_launcher INTEGER DEFAULT 0,
    light_laser INTEGER DEFAULT 0,
    heavy_laser INTEGER DEFAULT 0,
    gauss_cannon INTEGER DEFAULT 0,
    ion_cannon INTEGER DEFAULT 0,
    plasma_turret INTEGER DEFAULT 0,
    small_shield_dome INTEGER DEFAULT 0,
    large_shield_dome INTEGER DEFAULT 0
);
