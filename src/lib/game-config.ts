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
    }
    // Add others...
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

export function getProduction(type: string, level: number) {
    const building = BUILDINGS[type as keyof typeof BUILDINGS];
    if (!building) return 0;
    
    // Formula: Base * Level * 1.1^Level
    return Math.floor(building.productionBase * level * Math.pow(building.productionFactor, level));
}
