import { db } from './db';
import { sql } from 'drizzle-orm';
import { planets, planet_buildings, building_types, building_queue } from './db/schema';

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
		// Check if planet belongs to user
		const planetResult = await db.execute(sql`
			SELECT p.*, u.id as user_id
			FROM planets p
			JOIN users u ON u.id = p.user_id
			WHERE p.id = ${planetId} AND u.id = ${userId}
		`);

		if (planetResult.rows.length === 0) {
			return { success: false, error: 'Planet not found or access denied' };
		}

		const planet = planetResult.rows[0];

		// Check if building is already in queue
		const queueResult = await db.execute(sql`
			SELECT * FROM building_queue
			WHERE planet_id = ${planetId} AND building_type_id = ${buildingTypeId}
		`);

		if (queueResult.rows.length > 0) {
			return { success: false, error: 'Building already in construction queue' };
		}

		// Get building info
		const building = await this.getPlanetBuilding(planetId, buildingTypeId);
		if (!building) {
			return { success: false, error: 'Building type not found' };
		}

		// Check prerequisites
		const prerequisiteCheck = await this.checkPrerequisites(planetId, building.prerequisites);
		if (!prerequisiteCheck.success) {
			return { success: false, error: prerequisiteCheck.error };
		}

		// Check if can upgrade (not already upgrading)
		if (building.isUpgrading) {
			return { success: false, error: 'Building is already upgrading' };
		}

		// Check resources
		const resourceCheck = await this.checkResources(planetId, building.cost);
		if (!resourceCheck.success) {
			return { success: false, error: resourceCheck.error };
		}

		// Calculate completion time
		const completionTime = new Date(Date.now() + building.buildTime * 1000);

		// Reserve resources and add to queue
		await db.execute(sql`
			INSERT INTO building_queue (
				planet_id, building_type_id, target_level,
				completion_at, resources_reserved
			) VALUES (
				${planetId}, ${buildingTypeId}, ${building.level + 1},
				${completionTime}, ${JSON.stringify(building.cost)}
			)
		`);

		// Deduct resources from planet
		await db.execute(sql`
			UPDATE planets
			SET resources = jsonb_set(
				jsonb_set(
					jsonb_set(resources, '{metal}', (COALESCE(resources->>'metal', '0')::int - ${building.cost.metal})::text::jsonb),
					'{crystal}', (COALESCE(resources->>'crystal', '0')::int - ${building.cost.crystal})::text::jsonb
				),
				'{gas}', (COALESCE(resources->>'gas', '0')::int - ${building.cost.gas})::text::jsonb
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
		const now = new Date();

		// Get completed buildings
		const completedResult = await db.execute(sql`
			SELECT bq.*, pb.level as current_level
			FROM building_queue bq
			JOIN planet_buildings pb ON pb.planet_id = bq.planet_id AND pb.building_type_id = bq.building_type_id
			WHERE bq.completion_at <= ${now}
		`);

		for (const item of completedResult.rows) {
			// Update building level
			await db.execute(sql`
				UPDATE planet_buildings
				SET level = ${item.target_level},
					is_upgrading = false,
					upgrade_started_at = null,
					upgrade_completion_at = null
				WHERE planet_id = ${item.planet_id} AND building_type_id = ${item.building_type_id}
			`);

			// Remove from queue
			await db.execute(sql`
				DELETE FROM building_queue WHERE id = ${item.id}
			`);
		}
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