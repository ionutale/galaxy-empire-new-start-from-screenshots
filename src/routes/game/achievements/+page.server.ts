import { redirect } from '@sveltejs/kit';
import { AchievementService } from '$lib/server/achievement-service';

export async function load({ fetch, parent }) {
	const { user } = await parent();
	if (!user) throw redirect(303, '/login');

	try {
		const response = await fetch('/api/achievements');
		if (!response.ok) {
			throw new Error('Failed to fetch achievements');
		}
		const data = await response.json();
		return {
			achievements: data.achievements || [],
			newlyUnlocked: data.newlyUnlocked || null
		};
	} catch (error) {
		console.error('Error loading achievements:', error);
		return {
			achievements: [],
			newlyUnlocked: null
		};
	}
}