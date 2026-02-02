import { db } from '$lib/server/db';
import { planetShips, fleets, planetResources } from '$lib/server/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { SHIPS } from '$lib/game-config';
import {
	getFleetTemplates,
	createFleetTemplate,
	deleteFleetTemplate
} from '$lib/server/fleet-templates';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentPlanet, user } = await parent();

	if (!currentPlanet) {
		return { ships: null, fleets: [], activeFleetsCount: 0, templates: [] };
	}

	// Fetch ships
	const shipsRes = await db
		.select()
		.from(planetShips)
		.where(eq(planetShips.planetId, currentPlanet.id));

	// Fetch active fleets count
	const fleetsCountRes = await db
		.select({ count: sql<number>`count(*)` })
		.from(fleets)
		.where(
			and(
				eq(fleets.userId, user.id),
				or(eq(fleets.status, 'active'), eq(fleets.status, 'returning'))
			)
		);

	const activeFleetsCount = Number(fleetsCountRes[0]?.count || 0);

	// Fetch templates
	const templates = await getFleetTemplates(user.id);

	return {
		ships: shipsRes[0],
		activeFleetsCount,
		templates
	};
};

import { dispatchFleet } from '$lib/server/fleet-service';

export const actions = {
	createTemplate: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const name = data.get('name') as string;

		const ships: Record<string, number> = {};
		const shipTypes = [
			'light_fighter',
			'heavy_fighter',
			'cruiser',
			'battleship',
			'small_cargo',
			'large_cargo',
			'colony_ship',
			'espionage_probe',
			'recycler',
			'bomber',
			'destroyer',
			'death_star',
			'battle_cruiser'
		];

		for (const type of shipTypes) {
			const count = Number(data.get(type) || 0);
			if (count > 0) {
				ships[type] = count;
			}
		}

		try {
			await createFleetTemplate(locals.user.id, name, ships);
			return { success: true };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	},

	deleteTemplate: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const id = Number(data.get('id'));

		try {
			await deleteFleetTemplate(locals.user.id, id);
			return { success: true };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	},

	dispatch: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const planetId = Number(data.get('planet_id'));
		const galaxy = Number(data.get('galaxy'));
		const system = Number(data.get('system'));
		const planet = Number(data.get('planet'));
		const mission = data.get('mission') as string;

		// Parse resources
		const metal = Number(data.get('metal') || 0);
		const crystal = Number(data.get('crystal') || 0);
		const gas = Number(data.get('gas') || 0);

		// Parse ships
		const ships: Record<string, number> = {};
		const shipTypes = Object.keys(SHIPS);

		for (const type of shipTypes) {
			const count = Number(data.get(type) || 0);
			if (count > 0) {
				ships[type] = count;
			}
		}

		try {
			await dispatchFleet(locals.user.id, planetId, galaxy, system, planet, mission, ships, {
				metal,
				crystal,
				gas
			});

			return { success: true };
		} catch (e: any) {
			if (
				e.message.startsWith('Not enough') ||
				e.message.startsWith('No ships') ||
				e.message.includes('Max expedition limit') ||
				e.message.includes('Max fleet limit')
			) {
				return fail(400, { error: e.message });
			}
			console.error(e);
			return fail(500, { error: 'Internal server error' });
		}
	}
} satisfies Actions;
