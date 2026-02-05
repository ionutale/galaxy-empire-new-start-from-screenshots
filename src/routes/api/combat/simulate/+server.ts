import { json } from '@sveltejs/kit';
import { simulateCombat } from '$lib/server/combat-engine';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { attackerFleet, defenderFleet, defenderDefenses } = await request.json();

		if (!attackerFleet || !defenderFleet) {
			return json({ error: 'Missing fleet data' }, { status: 400 });
		}

		// Validate input data
		const validateFleet = (fleet: any) => {
			if (typeof fleet !== 'object') return false;
			for (const [, value] of Object.entries(fleet)) {
				if (typeof value !== 'number' || value < 0) return false;
			}
			return true;
		};

		if (
			!validateFleet(attackerFleet) ||
			!validateFleet(defenderFleet) ||
			(defenderDefenses && !validateFleet(defenderDefenses))
		) {
			return json({ error: 'Invalid fleet data' }, { status: 400 });
		}

		// Run combat simulation
		const result = simulateCombat(attackerFleet, defenderFleet, defenderDefenses || {});

		return json({
			result,
			attackerFleet,
			defenderFleet,
			defenderDefenses: defenderDefenses || {}
		});
	} catch (error) {
		console.error('Combat simulation error:', error);
		return json({ error: 'Simulation failed' }, { status: 500 });
	}
};
