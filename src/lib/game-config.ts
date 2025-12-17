export const BUILDINGS = {
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
    }
};

export const RESEARCH = {
    energy_technology: {
        name: 'Energy Technology',
        baseCost: { metal: 0, crystal: 800, gas: 400 },
        costFactor: 2.0,
        description: 'Essential for other technologies.'
    },
    laser_technology: {
        name: 'Laser Technology',
        baseCost: { metal: 200, crystal: 100, gas: 0 },
        costFactor: 2.0,
        description: 'Focuses light into a beam.'
    },
    ion_technology: {
        name: 'Ion Technology',
        baseCost: { metal: 1000, crystal: 300, gas: 100 },
        costFactor: 2.0,
        description: 'Accelerates ions for propulsion and weapons.'
    },
    hyperspace_technology: {
        name: 'Hyperspace Technology',
        baseCost: { metal: 0, crystal: 4000, gas: 2000 },
        costFactor: 2.0,
        description: 'Allows travel through higher dimensions.'
    },
    plasma_technology: {
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
    espionage_technology: {
        name: 'Espionage Technology',
        baseCost: { metal: 200, crystal: 1000, gas: 200 },
        costFactor: 2.0,
        description: 'Gather intelligence on other players.'
    },
    computer_technology: {
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
    graviton_technology: {
        name: 'Graviton Technology',
        baseCost: { metal: 0, crystal: 0, gas: 0 }, // Special reqs usually
        costFactor: 3.0,
        description: 'Manipulate gravity.'
    },
    weapons_technology: {
        name: 'Weapons Technology',
        baseCost: { metal: 800, crystal: 200, gas: 0 },
        costFactor: 2.0,
        description: 'Increases ship attack power.'
    },
    shielding_technology: {
        name: 'Shielding Technology',
        baseCost: { metal: 200, crystal: 600, gas: 0 },
        costFactor: 2.0,
        description: 'Increases ship shield strength.'
    },
    armor_technology: {
        name: 'Armor Technology',
        baseCost: { metal: 1000, crystal: 0, gas: 0 },
        costFactor: 2.0,
        description: 'Increases ship hull strength.'
    }
};

export const SHIPS = {
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
    }
};

export function getBuildingCost(type: string, level: number) {
    const building = BUILDINGS[type as keyof typeof BUILDINGS];
    if (!building) return null;

    return {
        metal: Math.floor(building.baseCost.metal * Math.pow(building.costFactor, level)),
        crystal: Math.floor(building.baseCost.crystal * Math.pow(building.costFactor, level))
    };
}

export function getResearchCost(type: string, level: number) {
    const tech = RESEARCH[type as keyof typeof RESEARCH];
    if (!tech) return null;

    return {
        metal: Math.floor(tech.baseCost.metal * Math.pow(tech.costFactor, level)),
        crystal: Math.floor(tech.baseCost.crystal * Math.pow(tech.costFactor, level)),
        gas: Math.floor(tech.baseCost.gas * Math.pow(tech.costFactor, level))
    };
}

export function getProduction(type: string, level: number) {
    const building = BUILDINGS[type as keyof typeof BUILDINGS];
    if (!building) return 0;
    
    // Formula: Base * Level * 1.1^Level
    return Math.floor(building.productionBase * level * Math.pow(building.productionFactor, level));
}
