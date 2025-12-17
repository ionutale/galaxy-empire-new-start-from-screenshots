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
