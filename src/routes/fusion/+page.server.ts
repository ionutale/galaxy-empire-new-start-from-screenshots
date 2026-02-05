import { getPlayerGalactoniteItems, getActiveFusionBoosts } from '$lib/server/shop';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const user = locals.user;
	const items = await getPlayerGalactoniteItems(user.id);
	const boosts = await getActiveFusionBoosts(user.id);

	return {
		items,
		boosts
	};
};
