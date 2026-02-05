import { json, error } from '@sveltejs/kit';
import { purchaseCommander } from '$lib/server/commanders';
import { db } from '$lib/server/db';
import { autoExploreSettings } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	try {
		const { action, ...data } = await request.json();

		if (action === 'purchase') {
			const { commanderId, duration } = data;
			if (!commanderId || !duration) throw error(400, 'Missing parameters');
			const result = await purchaseCommander(locals.user.id, commanderId, duration);
			return json(result);
		}

		if (action === 'saveSettings') {
			const { enabled, templateId, originPlanetId } = data;
			if (enabled && (!templateId || !originPlanetId)) {
				throw error(400, 'Template and Planet are required when enabled');
			}

			await db
				.insert(autoExploreSettings)
				.values({
					userId: locals.user.id,
					enabled,
					templateId: templateId || null,
					originPlanetId: originPlanetId || null
				})
				.onConflictDoUpdate({
					target: autoExploreSettings.userId,
					set: {
						enabled,
						templateId: templateId || null,
						originPlanetId: originPlanetId || null
					}
				});

			return json({ success: true });
		}

		throw error(400, 'Invalid action');
	} catch (e: unknown) {
		return json({ success: false, error: (e as Error).message }, { status: 400 });
	}
};
