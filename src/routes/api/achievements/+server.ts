import { json } from '@sveltejs/kit';
import { AchievementService } from '$lib/server/achievement-service';

export async function GET({ locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const userId = locals.user.id;

		// Check for new achievements
		const userStats = await AchievementService.getUserStatsForAchievements(userId);
		const newlyUnlocked = await AchievementService.checkAchievements(userId, userStats);

		// Get all user achievements
		const userAchievements = await AchievementService.getUserAchievements(userId);

		return json({
			achievements: userAchievements,
			newlyUnlocked: newlyUnlocked.length > 0 ? newlyUnlocked : null
		});
	} catch (error) {
		console.error('Error fetching achievements:', error);
		return json({ error: 'Failed to fetch achievements' }, { status: 500 });
	}
}

export async function POST({ locals, request }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { action } = await request.json();
		const userId = locals.user.id;

		if (action === 'check') {
			// Manually trigger achievement check
			const userStats = await AchievementService.getUserStatsForAchievements(userId);
			const newlyUnlocked = await AchievementService.checkAchievements(userId, userStats);

			return json({
				success: true,
				newlyUnlocked: newlyUnlocked
			});
		}

		return json({ error: 'Invalid action' }, { status: 400 });
	} catch (error) {
		console.error('Error processing achievement action:', error);
		return json({ error: 'Failed to process action' }, { status: 500 });
	}
}
