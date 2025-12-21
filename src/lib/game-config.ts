export interface Cost {
    metal: number;
    crystal: number;
    gas?: number;
    energy?: number;
}

export interface Building {
    name: string;
    baseCost: Cost;
    costFactor: number;
    productionBase: number;
    productionFactor: number;
    energyFactor: number;
    icon?: string;
}

export const BUILDINGS: Record<string, Building> = {
    metal_mine: {
        name: 'Metal Mine',
        baseCost: { metal: 60, crystal: 15 },
        costFactor: 1.5,
        productionBase: 30,
        productionFactor: 1.1,
        energyFactor: 10
    },
    crystal_mine: {
        name: 'Crystal Mine',
        baseCost: { metal: 48, crystal: 24 },
        costFactor: 1.6,
        productionBase: 20,
        productionFactor: 1.1,
        energyFactor: 10
    },
    gas_extractor: {
        name: 'Gas Extractor',
        baseCost: { metal: 225, crystal: 75 },
        costFactor: 1.5,
        productionBase: 10,
        productionFactor: 1.1,
        energyFactor: 20
    },
    solar_plant: {
        name: 'Solar Plant',
        baseCost: { metal: 75, crystal: 30 },
        costFactor: 1.5,
        productionBase: 20,
        productionFactor: 1.1,
        energyFactor: 0
    },
    research_lab: {
        name: 'Research Lab',
        baseCost: { metal: 200, crystal: 400 },
        costFactor: 2.0,
        productionBase: 0,
        productionFactor: 0,
        energyFactor: 0
    },
    shipyard: {
        name: 'Shipyard',
        baseCost: { metal: 400, crystal: 200, gas: 100 },
        costFactor: 2.0,
        productionBase: 0,
        productionFactor: 0,
        energyFactor: 0
    },
    robotics_factory: {
        name: 'Robotics Factory',
        baseCost: { metal: 400, crystal: 120, gas: 200 },
        costFactor: 2.0,
        productionBase: 0,
        productionFactor: 0,
        energyFactor: 0
    },
    nanite_factory: {
        name: 'Nanite Factory',
        baseCost: { metal: 1000000, crystal: 500000, gas: 100000 },
        costFactor: 2.0,
        productionBase: 0,
        productionFactor: 0,
        energyFactor: 0
    }
};

export interface Research {
    name: string;
    baseCost: Cost;
    costFactor: number;
    description: string;
}

export const RESEARCH: Record<string, Research> = {
    energy_tech: {
        name: 'Energy Technology',
        baseCost: { metal: 0, crystal: 800, gas: 400 },
        costFactor: 2.0,
        description: 'Essential for other technologies.'
    },
    laser_tech: {
        name: 'Laser Technology',
        baseCost: { metal: 200, crystal: 100, gas: 0 },
        costFactor: 2.0,
        description: 'Focuses light into a beam.'
    },
    ion_tech: {
        name: 'Ion Technology',
        baseCost: { metal: 1000, crystal: 300, gas: 100 },
        costFactor: 2.0,
        description: 'Accelerates ions for propulsion and weapons.'
    },
    hyperspace_tech: {
        name: 'Hyperspace Technology',
        baseCost: { metal: 0, crystal: 4000, gas: 2000 },
        costFactor: 2.0,
        description: 'Allows travel through higher dimensions.'
    },
    plasma_tech: {
        name: 'Plasma Technology',
        baseCost: { metal: 2000, crystal: 4000, gas: 1000 },
        costFactor: 2.0,
        description: 'Superheated gas for weapons and energy.'
    },
    combustion_drive: {
        name: 'Combustion Drive',
        baseCost: { metal: 400, crystal: 0, gas: 600 },
        costFactor: 2.0,
        description: 'Basic propulsion for ships.'
    },
    impulse_drive: {
        name: 'Impulse Drive',
        baseCost: { metal: 2000, crystal: 4000, gas: 600 },
        costFactor: 2.0,
        description: 'Faster propulsion system.'
    },
    hyperspace_drive: {
        name: 'Hyperspace Drive',
        baseCost: { metal: 10000, crystal: 20000, gas: 6000 },
        costFactor: 2.0,
        description: 'Warp speed propulsion.'
    },
    espionage_tech: {
        name: 'Espionage Technology',
        baseCost: { metal: 200, crystal: 1000, gas: 200 },
        costFactor: 2.0,
        description: 'Gather intelligence on other players.'
    },
    computer_tech: {
        name: 'Computer Technology',
        baseCost: { metal: 0, crystal: 400, gas: 600 },
        costFactor: 2.0,
        description: 'Increases fleet slots.'
    },
    astrophysics: {
        name: 'Astrophysics',
        baseCost: { metal: 4000, crystal: 8000, gas: 4000 },
        costFactor: 2.0,
        description: 'Allows colonization of more planets.'
    },
    intergalactic_research_network: {
        name: 'Intergalactic Research Network',
        baseCost: { metal: 240000, crystal: 400000, gas: 160000 },
        costFactor: 2.0,
        description: 'Connects research labs.'
    },
    graviton_tech: {
        name: 'Graviton Technology',
        baseCost: { metal: 0, crystal: 0, gas: 0, energy: 0.0000000000000001 }, // Requires energy
        costFactor: 3.0,
        description: 'Manipulate gravity.'
    },
    weapons_tech: {
        name: 'Weapons Technology',
        baseCost: { metal: 800, crystal: 200, gas: 0 },
        costFactor: 2.0,
        description: 'Increases ship attack power.'
    },
    shielding_tech: {
        name: 'Shielding Technology',
        baseCost: { metal: 200, crystal: 600, gas: 0 },
        costFactor: 2.0,
        description: 'Increases ship shield strength.'
    },
    armour_tech: {
        name: 'Armor Technology',
        baseCost: { metal: 1000, crystal: 0, gas: 0 },
        costFactor: 2.0,
        description: 'Increases ship hull strength.'
    }
};

export interface Ship {
    name: string;
    cost: Cost;
    attack: number;
    defense: number;
    speed: number;
    capacity: number;
}

export const SHIPS: Record<string, Ship> = {
    light_fighter: {
        name: 'Light Fighter',
        cost: { metal: 3000, crystal: 1000, gas: 0 },
        attack: 50,
        defense: 10,
        speed: 12500,
        capacity: 50
    },
    heavy_fighter: {
        name: 'Heavy Fighter',
        cost: { metal: 6000, crystal: 4000, gas: 0 },
        attack: 150,
        defense: 25,
        speed: 10000,
        capacity: 100
    },
    cruiser: {
        name: 'Cruiser',
        cost: { metal: 20000, crystal: 7000, gas: 2000 },
        attack: 400,
        defense: 50,
        speed: 15000,
        capacity: 800
    },
    battleship: {
        name: 'Battleship',
        cost: { metal: 45000, crystal: 15000, gas: 0 },
        attack: 1000,
        defense: 200,
        speed: 10000,
        capacity: 1500
    },
    small_cargo: {
        name: 'Small Cargo',
        cost: { metal: 2000, crystal: 2000, gas: 0 },
        attack: 5,
        defense: 10,
        speed: 5000,
        capacity: 5000
    },
    colony_ship: {
        name: 'Colony Ship',
        cost: { metal: 10000, crystal: 20000, gas: 10000 },
        attack: 50,
        defense: 100,
        speed: 2500,
        capacity: 7500
    },
    large_cargo: {
        name: 'Large Cargo',
        cost: { metal: 6000, crystal: 6000, gas: 0 },
        attack: 5,
        defense: 50,
        speed: 7500,
        capacity: 25000
    },
    espionage_probe: {
        name: 'Espionage Probe',
        cost: { metal: 0, crystal: 1000, gas: 0 },
        attack: 0,
        defense: 0,
        speed: 100000000,
        capacity: 5
    },
    recycler: {
        name: 'Recycler',
        cost: { metal: 10000, crystal: 6000, gas: 2000 },
        attack: 1,
        defense: 10,
        speed: 2000,
        capacity: 20000
    },
    bomber: {
        name: 'Bomber',
        cost: { metal: 50000, crystal: 25000, gas: 15000 },
        attack: 1000,
        defense: 500,
        speed: 4000,
        capacity: 500
    },
    destroyer: {
        name: 'Destroyer',
        cost: { metal: 60000, crystal: 50000, gas: 15000 },
        attack: 2000,
        defense: 2000,
        speed: 5000,
        capacity: 2000
    },
    death_star: {
        name: 'Death Star',
        cost: { metal: 5000000, crystal: 4000000, gas: 1000000 },
        attack: 200000,
        defense: 100000,
        speed: 100,
        capacity: 1000000
    },
    battle_cruiser: {
        name: 'Battle Cruiser',
        cost: { metal: 30000, crystal: 40000, gas: 15000 },
        attack: 700,
        defense: 400,
        speed: 10000,
        capacity: 750
    }
};

export interface Defense {
    name: string;
    cost: Cost;
    attack: number;
    defense: number;
    shield: number;
    max?: number;
}

export const DEFENSES: Record<string, Defense> = {
    rocket_launcher: {
        name: 'Rocket Launcher',
        cost: { metal: 2000, crystal: 0, gas: 0 },
        attack: 80,
        defense: 20,
        shield: 20
    },
    light_laser: {
        name: 'Light Laser',
        cost: { metal: 1500, crystal: 500, gas: 0 },
        attack: 100,
        defense: 25,
        shield: 25
    },
    heavy_laser: {
        name: 'Heavy Laser',
        cost: { metal: 6000, crystal: 2000, gas: 0 },
        attack: 250,
        defense: 100,
        shield: 100
    },
    gauss_cannon: {
        name: 'Gauss Cannon',
        cost: { metal: 20000, crystal: 15000, gas: 2000 },
        attack: 1100,
        defense: 200,
        shield: 200
    },
    ion_cannon: {
        name: 'Ion Cannon',
        cost: { metal: 2000, crystal: 6000, gas: 0 },
        attack: 150,
        defense: 500,
        shield: 500
    },
    plasma_turret: {
        name: 'Plasma Turret',
        cost: { metal: 50000, crystal: 50000, gas: 30000 },
        attack: 3000,
        defense: 300,
        shield: 300
    },
    small_shield_dome: {
        name: 'Small Shield Dome',
        cost: { metal: 10000, crystal: 10000, gas: 0 },
        attack: 0,
        defense: 2000,
        shield: 2000,
        max: 1
    },
    large_shield_dome: {
        name: 'Large Shield Dome',
        cost: { metal: 50000, crystal: 50000, gas: 0 },
        attack: 0,
        defense: 10000,
        shield: 10000,
        max: 1
    }
};

export function getBuildingCost(type: string, level: number): Cost | null {
    const building = BUILDINGS[type as keyof typeof BUILDINGS];
    if (!building) return null;

    return {
        metal: Math.floor(building.baseCost.metal * Math.pow(building.costFactor, level)),
        crystal: Math.floor(building.baseCost.crystal * Math.pow(building.costFactor, level)),
        gas: building.baseCost.gas ? Math.floor(building.baseCost.gas * Math.pow(building.costFactor, level)) : 0,
        energy: building.baseCost.energy ? Math.floor(building.baseCost.energy * Math.pow(building.costFactor, level)) : 0
    };
}

export function getResearchCost(type: string, level: number): Cost | null {
    const tech = RESEARCH[type as keyof typeof RESEARCH];
    if (!tech) return null;

    return {
        metal: Math.floor(tech.baseCost.metal * Math.pow(tech.costFactor, level)),
        crystal: Math.floor(tech.baseCost.crystal * Math.pow(tech.costFactor, level)),
        gas: tech.baseCost.gas ? Math.floor(tech.baseCost.gas * Math.pow(tech.costFactor, level)) : 0,
        energy: tech.baseCost.energy ? Math.floor(tech.baseCost.energy * Math.pow(tech.costFactor, level)) : 0
    };
}

export function getProduction(type: string, level: number) {
    const building = BUILDINGS[type as keyof typeof BUILDINGS];
    if (!building) return 0;
    
    // Formula: Base * Level * 1.1^Level
    return Math.floor(building.productionBase * level * Math.pow(building.productionFactor, level));
}
