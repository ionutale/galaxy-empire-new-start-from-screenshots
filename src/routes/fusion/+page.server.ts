import { getPlayerGalactoniteItems, getActiveFusionBoosts } from '$lib/server/shop';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	const items = await getPlayerGalactoniteItems(user.id);
	const boosts = await getActiveFusionBoosts(user.id);

	return {
		items,
		boosts
	};
};