import { SHIPS } from '$lib/game-config';

export interface FleetMovementInfo {
	distance: number;
	duration: number; // in seconds
	fleetSpeed: number;
	slowestShip: string;
	canReach: boolean;
	reason?: string;
}

/**
 * Calculate distance between two coordinates in the galaxy
 * Using simplified OGame-style distance calculation
 */
export function calculateDistance(
	fromGalaxy: number,
	fromSystem: number,
	fromPlanet: number,
	toGalaxy: number,
	toSystem: number,
	toPlanet: number
): number {
	// Same galaxy, same system
	if (fromGalaxy === toGalaxy && fromSystem === toSystem) {
		return Math.abs(fromPlanet - toPlanet) * 1000; // 1000 units per planet slot
	}

	// Same galaxy, different system
	if (fromGalaxy === toGalaxy) {
		const systemDiff = Math.abs(fromSystem - toSystem);
		const planetDiff = Math.abs(fromPlanet - toPlanet);
		return Math.sqrt(systemDiff * systemDiff + planetDiff * planetDiff) * 2000; // 2000 units per system/planet difference
	}

	// Different galaxy
	const galaxyDiff = Math.abs(fromGalaxy - toGalaxy);
	const systemDiff = Math.abs(fromSystem - toSystem);
	const planetDiff = Math.abs(fromPlanet - toPlanet);

	// More complex formula for inter-galaxy travel
	return Math.sqrt(galaxyDiff * galaxyDiff * 10000 + systemDiff * systemDiff * 400 + planetDiff * planetDiff * 400);
}

/**
 * Calculate fleet speed based on slowest ship in the fleet
 */
export function calculateFleetSpeed(ships: Record<string, number>): { speed: number; slowestShip: string } {
	let slowestSpeed = Infinity;
	let slowestShip = '';

	for (const [shipType, count] of Object.entries(ships)) {
		if (count > 0) {
			const shipConfig = SHIPS[shipType];
			if (shipConfig && shipConfig.speed < slowestSpeed) {
				slowestSpeed = shipConfig.speed;
				slowestShip = shipType;
			}
		}
	}

	// Default speed if no ships found (shouldn't happen)
	if (slowestSpeed === Infinity) {
		slowestSpeed = 5000; // Default cargo speed
		slowestShip = 'unknown';
	}

	return { speed: slowestSpeed, slowestShip: slowestShip };
}

/**
 * Calculate travel duration for a fleet
 */
export function calculateTravelDuration(distance: number, fleetSpeed: number): number {
	// Base formula: time = distance / speed
	// Add some minimum time to prevent instant travel
	const baseTime = Math.max(distance / fleetSpeed, 30); // Minimum 30 seconds

	// Apply some realism - longer distances take disproportionately longer
	const timeMultiplier = 1 + (distance / 100000); // Small penalty for very long distances

	return Math.ceil(baseTime * timeMultiplier);
}

/**
 * Get complete fleet movement information
 */
export function getFleetMovementInfo(
	fromGalaxy: number,
	fromSystem: number,
	fromPlanet: number,
	toGalaxy: number,
	toSystem: number,
	toPlanet: number,
	ships: Record<string, number>,
	mission: string
): FleetMovementInfo {
	const distance = calculateDistance(fromGalaxy, fromSystem, fromPlanet, toGalaxy, toSystem, toPlanet);
	const { speed: fleetSpeed, slowestShip } = calculateFleetSpeed(ships);
	const duration = calculateTravelDuration(distance, fleetSpeed);

	// Check if fleet can reach destination
	let canReach = true;
	let reason = '';

	// Basic validation
	if (distance === 0 && mission !== 'deploy') {
		canReach = false;
		reason = 'Cannot send fleet to same location';
	}

	// Mission-specific checks
	if (mission === 'expedition') {
		// Expeditions have special distance limits
		if (distance < 1000 || distance > 50000) {
			canReach = false;
			reason = 'Expedition distance must be between 1,000 and 50,000 units';
		}
	}

	return {
		distance,
		duration,
		fleetSpeed,
		slowestShip,
		canReach,
		reason
	};
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m ${secs}s`;
	} else if (minutes > 0) {
		return `${minutes}m ${secs}s`;
	} else {
		return `${secs}s`;
	}
}

/**
 * Calculate fuel consumption for a fleet
 * Basic implementation - can be enhanced with technologies
 */
export function calculateFuelConsumption(
	distance: number,
	ships: Record<string, number>,
	mission: string
): number {
	let totalFuel = 0;

	for (const [shipType, count] of Object.entries(ships)) {
		if (count > 0) {
			const shipConfig = SHIPS[shipType];
			if (shipConfig) {
				// Simplified fuel calculation: base consumption per distance unit
				const baseConsumption = shipConfig.capacity * 0.01; // 1% of capacity per 1000 units
				totalFuel += baseConsumption * count * (distance / 1000);
			}
		}
	}

	// Mission modifiers
	if (mission === 'expedition') {
		totalFuel *= 1.5; // Expeditions consume more fuel
	}

	return Math.ceil(totalFuel);
}