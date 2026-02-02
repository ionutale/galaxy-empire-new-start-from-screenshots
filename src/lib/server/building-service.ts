import { db } from './db';
import { sql } from 'drizzle-orm';
import { planets, planetBuildings, buildingTypes, buildingQueue } from './db/schema';

export interface BuildingCost {
	metal: number;
	crystal: number;
	gas: number;
}

export interface BuildingProduction {
	metal?: number;
	crystal?: number;
	gas?: number;
	energy?: number;
}

export interface BuildingInfo {
	id: number;
	building_type_id: number; // Alias for id
	name: string;
	description: string;
	category: string;
	level: number;
	cost: BuildingCost;
	upgradeCost: BuildingCost; // Alias for cost
	production: BuildingProduction | null;
	energyConsumption: number;
	energyProduction: number;
	buildTime: number;
	canUpgrade: boolean;
	isUpgrading: boolean;
	upgradeCompletion?: Date;
	prerequisites: Record<string, number>;
	icon?: string;
}

export class BuildingService {
	/**
	 * Get all buildings for a planet
	 */
	static async getPlanetBuildings(planetId: number): Promise<BuildingInfo[]> {
		const result = await db.execute(sql`
			SELECT
				bt.id,
				bt.name,
				bt.description,
				bt.category,
				COALESCE(pb.level, 0) as level,
				bt.base_cost as base_cost,
				bt.base_production as base_production,
				bt.base_energy as base_energy,
				COALESCE(pb.is_upgrading, false) as is_upgrading,
				pb.upgrade_completion_at as upgrade_completion,
				bt.prerequisites
			FROM building_types bt
			LEFT JOIN planet_buildings pb ON pb.building_type_id = bt.id AND pb.planet_id = ${planetId}
			ORDER BY bt.category, bt.name
		`);

		return result.rows.map(row => this.formatBuildingInfo(row));
	}

	/**
	 * Get a specific building for a planet
	 */
	static async getPlanetBuilding(planetId: number, buildingTypeId: number): Promise<BuildingInfo | null> {
		const result = await db.execute(sql`
			SELECT
				bt.id,
				bt.name,
				bt.description,
				bt.category,
				COALESCE(pb.level, 0) as level,
				bt.base_cost as base_cost,
				bt.base_production as base_production,
				bt.base_energy as base_energy,
				COALESCE(pb.is_upgrading, false) as is_upgrading,
				pb.upgrade_completion_at as upgrade_completion,
				bt.prerequisites
			FROM building_types bt
			LEFT JOIN planet_buildings pb ON pb.building_type_id = bt.id AND pb.planet_id = ${planetId}
			WHERE bt.id = ${buildingTypeId}
		`);

		if (result.rows.length === 0) return null;
		return this.formatBuildingInfo(result.rows[0]);
	}

	/**
	 * Start building construction or upgrade
	 */
	static async startBuildingConstruction(
		planetId: number,
		buildingTypeId: number,
		userId: number
	): Promise<{ success: boolean; error?: string; completionTime?: Date }> {
		// Get current building level for target level calculation
		const building = await this.getPlanetBuilding(planetId, buildingTypeId);
		if (!building) {
			return { success: false, error: 'Building type not found' };
		}

		const targetLevel = building.level + 1;

		// Validate construction using stored procedure
		const validationResult = await db.execute(sql`
			SELECT validate_building_construction(${userId}, ${planetId}, ${buildingTypeId}, ${targetLevel}) as validation
		`);

		const validation = validationResult.rows[0].validation as any;
		if (!validation.valid) {
			return { success: false, error: validation.error };
		}

		// Get robotics and nanite levels for time calculation
		const facilityResult = await db.execute(sql`
			SELECT
				COALESCE((SELECT level FROM planet_buildings WHERE planet_id = ${planetId} AND building_type_id = (SELECT id FROM building_types WHERE name = 'Robotics Factory')), 0) as robotics_level,
				COALESCE((SELECT level FROM planet_buildings WHERE planet_id = ${planetId} AND building_type_id = (SELECT id FROM building_types WHERE name = 'Nanite Factory')), 0) as nanite_level
		`);
		const roboticsLevel = facilityResult.rows[0].robotics_level;
		const naniteLevel = facilityResult.rows[0].nanite_level;

		// Calculate completion time using stored function
		const timeResult = await db.execute(sql`
			SELECT extract(epoch from calculate_building_time(${buildingTypeId}, ${targetLevel}, ${roboticsLevel}, ${naniteLevel})) as build_seconds
		`);
		const buildSeconds = timeResult.rows[0].build_seconds;
		const completionTime = new Date(Date.now() + buildSeconds * 1000);

		// Reserve resources and add to queue
		await db.execute(sql`
			INSERT INTO building_queue (
				planet_id, building_type_id, target_level,
				completion_at, resources_reserved
			) VALUES (
				${planetId}, ${buildingTypeId}, ${targetLevel},
				${completionTime}, ${JSON.stringify(validation.cost)}
			)
		`);

		// Deduct resources from planet
		await db.execute(sql`
			UPDATE planets
			SET resources = jsonb_set(
				jsonb_set(
					jsonb_set(resources, '{metal}', (COALESCE(resources->>'metal', '0')::int - ${validation.cost.metal})::text::jsonb),
					'{crystal}', (COALESCE(resources->>'crystal', '0')::int - ${validation.cost.crystal})::text::jsonb
				),
				'{gas}', (COALESCE(resources->>'gas', '0')::int - ${validation.cost.gas})::text::jsonb
			)
			WHERE id = ${planetId}
		`);

		// Mark building as upgrading
		await db.execute(sql`
			INSERT INTO planet_buildings (planet_id, building_type_id, level, is_upgrading, upgrade_started_at, upgrade_completion_at)
			VALUES (${planetId}, ${buildingTypeId}, ${building.level}, true, now(), ${completionTime})
			ON CONFLICT (planet_id, building_type_id) DO UPDATE SET
				is_upgrading = true,
				upgrade_started_at = now(),
				upgrade_completion_at = ${completionTime}
		`);

		return { success: true, completionTime };
	}

	/**
	 * Process completed building constructions
	 */
	static async processCompletedBuildings(): Promise<void> {
		// Call stored procedure to process completed buildings
		await db.execute(sql`CALL process_completed_buildings()`);
	}

	/**
	 * Calculate building production for a planet
	 */
	static async calculatePlanetProduction(planetId: number): Promise<BuildingProduction> {
		const result = await db.execute(sql`
			SELECT
				bt.base_production,
				bt.base_energy,
				pb.level,
				p.temperature
			FROM planet_buildings pb
			JOIN building_types bt ON bt.id = pb.building_type_id
			JOIN planets p ON p.id = pb.planet_id
			WHERE pb.planet_id = ${planetId} AND pb.level > 0
		`);

		let totalProduction: BuildingProduction = {
			metal: 0,
			crystal: 0,
			gas: 0,
			energy: 0
		};

		let energyConsumption = 0;
		let energyProduction = 0;

		for (const row of result.rows) {
			const level = row.level;
			const temperature = row.temperature || 50; // Default temperature

			if (row.base_production) {
				const production = row.base_production as any;

				// Apply level multiplier
				const multiplier = Math.pow(1.1, level);

				if (production.metal) {
					totalProduction.metal! += Math.floor(production.metal * multiplier);
				}
				if (production.crystal) {
					totalProduction.crystal! += Math.floor(production.crystal * multiplier);
				}
				if (production.gas) {
					// Gas production is affected by temperature
					const tempMultiplier = 1.44 - 0.004 * temperature;
					totalProduction.gas! += Math.floor(production.gas * multiplier * tempMultiplier);
				}
			}

			if (row.base_energy) {
				const energy = row.base_energy as any;

				if (energy.consumption) {
					energyConsumption += Math.floor(energy.consumption * Math.pow(1.1, level));
				}
				if (energy.production) {
					energyProduction += Math.floor(energy.production * Math.pow(1.1, level));
				}
			}
		}

		totalProduction.energy = energyProduction - energyConsumption;
		return totalProduction;
	}

	/**
	 * Calculate building storage capacity for a planet
	 */
	static async calculatePlanetStorage(planetId: number): Promise<{ metal: number; crystal: number; gas: number }> {
		const result = await db.execute(sql`
			SELECT bt.name, pb.level
			FROM planet_buildings pb
			JOIN building_types bt ON bt.id = pb.building_type_id
			WHERE pb.planet_id = ${planetId} AND bt.category = 'storage' AND pb.level > 0
		`);

		let storage = { metal: 10000, crystal: 10000, gas: 10000 }; // Base storage

		for (const row of result.rows) {
			const level = row.level;
			const multiplier = Math.pow(1.5, level);

			if (row.name.includes('Metal')) {
				storage.metal += Math.floor(10000 * multiplier);
			} else if (row.name.includes('Crystal')) {
				storage.crystal += Math.floor(10000 * multiplier);
			} else if (row.name.includes('Gas')) {
				storage.gas += Math.floor(10000 * multiplier);
			}
		}

		return storage;
	}

	/**
	 * Check if building prerequisites are met
	 */
	private static async checkPrerequisites(planetId: number, prerequisites: Record<string, number>): Promise<{ success: boolean; error?: string }> {
		if (!prerequisites || Object.keys(prerequisites).length === 0) {
			return { success: true };
		}

		// Check building prerequisites
		for (const [buildingId, requiredLevel] of Object.entries(prerequisites)) {
			if (buildingId.startsWith('building_')) {
				const buildingTypeId = parseInt(buildingId.replace('building_', ''));
				const building = await this.getPlanetBuilding(planetId, buildingTypeId);

				if (!building || building.level < requiredLevel) {
					return { success: false, error: `Requires ${building?.name || 'Unknown Building'} level ${requiredLevel}` };
				}
			}
			// TODO: Add research prerequisites when research system is implemented
		}

		return { success: true };
	}

	/**
	 * Check if planet has enough resources
	 */
	private static async checkResources(planetId: number, cost: BuildingCost): Promise<{ success: boolean; error?: string }> {
		const result = await db.execute(sql`
			SELECT resources FROM planets WHERE id = ${planetId}
		`);

		if (result.rows.length === 0) return { success: false, error: 'Planet not found' };

		const resources = result.rows[0].resources as any;

		const currentMetal = parseInt(resources?.metal || '0');
		const currentCrystal = parseInt(resources?.crystal || '0');
		const currentGas = parseInt(resources?.gas || '0');

		if (currentMetal < cost.metal) {
			return { success: false, error: `Not enough metal. Need ${cost.metal}, have ${currentMetal}` };
		}
		if (currentCrystal < cost.crystal) {
			return { success: false, error: `Not enough crystal. Need ${cost.crystal}, have ${currentCrystal}` };
		}
		if (currentGas < cost.gas) {
			return { success: false, error: `Not enough gas. Need ${cost.gas}, have ${currentGas}` };
		}

		return { success: true };
	}

	/**
	 * Format building info from database row
	 */
	private static formatBuildingInfo(row: any): BuildingInfo {
		const level = row.level || 0;
		const baseCost = row.base_cost as BuildingCost;
		const baseProduction = row.base_production as BuildingProduction;
		const baseEnergy = row.base_energy as any;

		// Calculate current cost (exponential scaling)
		const costMultiplier = Math.pow(1.5, level);
		const cost: BuildingCost = {
			metal: Math.floor(baseCost.metal * costMultiplier),
			crystal: Math.floor(baseCost.crystal * costMultiplier),
			gas: Math.floor(baseCost.gas * costMultiplier)
		};

		// Calculate build time
		const buildTime = Math.floor(60 * costMultiplier); // Base 60 seconds, exponential scaling

		// Calculate production
		let production: BuildingProduction | null = null;
		if (baseProduction) {
			const prodMultiplier = Math.pow(1.1, level);
			production = {};
			if (baseProduction.metal) production.metal = Math.floor(baseProduction.metal * prodMultiplier);
			if (baseProduction.crystal) production.crystal = Math.floor(baseProduction.crystal * prodMultiplier);
			if (baseProduction.gas) production.gas = Math.floor(baseProduction.gas * prodMultiplier);
		}

		// Calculate energy
		let energyConsumption = 0;
		let energyProduction = 0;
		if (baseEnergy) {
			const energyMultiplier = Math.pow(1.1, level);
			if (baseEnergy.consumption) energyConsumption = Math.floor(baseEnergy.consumption * energyMultiplier);
			if (baseEnergy.production) energyProduction = Math.floor(baseEnergy.production * energyMultiplier);
		}

		return {
			id: row.id,
			building_type_id: row.id, // Alias for compatibility
			name: row.name,
			description: row.description,
			category: row.category,
			level,
			cost,
			upgradeCost: cost, // Alias for compatibility
			production,
			energyConsumption,
			energyProduction,
			buildTime,
			canUpgrade: level < 100, // Max level check
			isUpgrading: row.is_upgrading || false,
			upgradeCompletion: row.upgrade_completion ? new Date(row.upgrade_completion) : undefined,
			prerequisites: row.prerequisites || {},
			icon: this.getBuildingIcon(row.name) // Add icon based on building name
		};
	}

	/**
	 * Get building icon based on name
	 */
	private static getBuildingIcon(name: string): string {
		const iconMap: Record<string, string> = {
			'Metal Mine': '⛏️',
			'Crystal Mine': '💎',
			'Gas Extractor': '⛽',
			'Solar Plant': '☀️',
			'Fusion Reactor': '⚛️',
			'Metal Storage': '🏗️',
			'Crystal Storage': '🏗️',
			'Gas Storage': '🏗️',
			'Shipyard': '🚀',
			'Research Lab': '🔬',
			'Nano Factory': '🏭'
		};
		return iconMap[name] || '🏢';
	}
}