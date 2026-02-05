import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { formatDuration } from '$lib/server/fleet-movement';

interface MovementInfo {
	distance: number;
	duration: number;
	fleet_speed: number;
	slowest_ship: string;
	fuel_consumption: number;
	can_reach: boolean;
	reason: string;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const fromGalaxy = parseInt(url.searchParams.get('fromGalaxy') || '0');
	const fromSystem = parseInt(url.searchParams.get('fromSystem') || '0');
	const fromPlanet = parseInt(url.searchParams.get('fromPlanet') || '0');
	const toGalaxy = parseInt(url.searchParams.get('toGalaxy') || '0');
	const toSystem = parseInt(url.searchParams.get('toSystem') || '0');
	const toPlanet = parseInt(url.searchParams.get('toPlanet') || '0');
	const mission = url.searchParams.get('mission') || 'attack';

	// Parse ships from query params
	const ships: Record<string, number> = {};
	const shipTypes = [
		'light_fighter',
		'heavy_fighter',
		'cruiser',
		'battleship',
		'battle_cruiser',
		'bomber',
		'destroyer',
		'death_star',
		'small_cargo',
		'large_cargo',
		'colony_ship',
		'espionage_probe',
		'recycler'
	];

	for (const type of shipTypes) {
		const count = parseInt(url.searchParams.get(type) || '0');
		if (count > 0) {
			ships[type] = count;
		}
	}

	try {
		const result = await db.execute(sql`
			SELECT get_fleet_movement_info(
				${fromGalaxy}, ${fromSystem}, ${fromPlanet},
				${toGalaxy}, ${toSystem}, ${toPlanet},
				${JSON.stringify(ships)}::jsonb,
				${mission}
			) as movement_info
		`);

		const movementInfo = result.rows[0].movement_info as MovementInfo;

		return json({
			distance: Math.round(movementInfo.distance),
			duration: movementInfo.duration,
			durationFormatted: formatDuration(movementInfo.duration),
			fleetSpeed: movementInfo.fleet_speed,
			slowestShip: movementInfo.slowest_ship,
			fuelConsumption: movementInfo.fuel_consumption,
			canReach: movementInfo.can_reach,
			reason: movementInfo.reason
		});
	} catch (error) {
		console.error('Error calculating fleet movement:', error);
		return json({ error: 'Calculation failed' }, { status: 500 });
	}
};
