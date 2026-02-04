<script lang="ts">
	import type { PageData } from './$types';

	interface UserAchievement {
		isCompleted: boolean;
		achievement?: {
			category: string;
			icon?: string;
			name: string;
			description: string;
			rewardType?: string;
			rewardAmount?: number;
		};
	}

	export let data: PageData;
	// @ts-ignore
	$: achievements = data.achievements as UserAchievement[];
	$: newlyUnlocked = data.newlyUnlocked;

	// Group achievements by category
	$: achievementsByCategory = achievements.reduce((acc: Record<string, UserAchievement[]>, userAchievement: UserAchievement) => {
		const category = userAchievement.achievement?.category || 'other';
		if (!acc[category]) {
			acc[category] = [];
		}
		acc[category].push(userAchievement);
		return acc;
	}, {} as Record<string, UserAchievement[]>);

	// Category display names and colors
	const categoryInfo: Record<string, {name: string, color: string}> = {
		building: { name: '🏗️ Building', color: 'bg-blue-600' },
		combat: { name: '⚔️ Combat', color: 'bg-red-600' },
		economy: { name: '💰 Economy', color: 'bg-green-600' },
		exploration: { name: '🪐 Exploration', color: 'bg-purple-600' },
		research: { name: '🔬 Research', color: 'bg-yellow-600' },
		social: { name: '🤝 Social', color: 'bg-pink-600' },
		other: { name: '📋 Other', color: 'bg-gray-600' }
	};

	function getProgressPercentage(userAchievement: any) {
		if (userAchievement.isCompleted) return 100;
		const requirement = userAchievement.achievement?.requirementValue || 1;
		const progress = userAchievement.progress || 0;
		return Math.min((progress / requirement) * 100, 100);
	}

	function formatProgress(userAchievement: any) {
		if (userAchievement.isCompleted) return 'Completed';
		const progress = userAchievement.progress || 0;
		const requirement = userAchievement.achievement?.requirementValue || 1;
		return `${progress}/${requirement}`;
	}
</script>

<svelte:head>
	<title>Achievements - Galaxy Empire</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold text-white mb-8">Achievements</h1>

	{#if newlyUnlocked && newlyUnlocked.length > 0}
		<div class="bg-green-800 border border-green-600 rounded-lg p-6 mb-8">
			<h2 class="text-xl font-bold text-green-200 mb-4">🎉 New Achievements Unlocked!</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each newlyUnlocked as achievement}
					<div class="bg-green-700 rounded-lg p-4">
						<div class="text-3xl mb-2">{achievement.icon}</div>
						<h3 class="font-bold text-green-100">{achievement.name}</h3>
						<p class="text-sm text-green-200">{achievement.description}</p>
						{#if achievement.rewardType && achievement.rewardAmount}
							<p class="text-xs text-yellow-300 mt-2">
								Reward: {achievement.rewardAmount} {achievement.rewardType === 'dark_matter' ? 'DM' : achievement.rewardType}
							</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#each Object.entries(achievementsByCategory) as [category, categoryAchievements]}
		<div class="mb-8">
			<h2 class="text-2xl font-bold text-white mb-4">
				{categoryInfo[category]?.name || category}
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each categoryAchievements as userAchievement}
					<div class="bg-gray-800 rounded-lg p-6 border-2 {userAchievement.isCompleted ? 'border-green-500' : 'border-gray-600'}">
						<div class="flex items-start space-x-4">
							<div class="text-4xl flex-shrink-0">
								{userAchievement.achievement?.icon || '🏆'}
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="text-lg font-bold text-white mb-2">
									{userAchievement.achievement?.name || 'Unknown Achievement'}
								</h3>
								<p class="text-gray-300 text-sm mb-3">
									{userAchievement.achievement?.description || ''}
								</p>

								{#if userAchievement.isCompleted}
									<div class="flex items-center text-green-400 mb-2">
										<span class="text-lg mr-2">✅</span>
										<span class="font-medium">Completed</span>
									</div>
									{#if userAchievement.achievement?.rewardType && userAchievement.achievement?.rewardAmount}
										<p class="text-sm text-yellow-400">
											Reward: {userAchievement.achievement.rewardAmount} {userAchievement.achievement.rewardType === 'dark_matter' ? 'DM' : userAchievement.achievement.rewardType}
										</p>
									{/if}
								{:else}
									<div class="mb-3">
										<div class="flex justify-between text-sm text-gray-400 mb-1">
											<span>Progress</span>
											<span>{formatProgress(userAchievement)}</span>
										</div>
										<div class="w-full bg-gray-700 rounded-full h-2">
											<div
												class="bg-blue-600 h-2 rounded-full transition-all duration-300"
												style="width: {getProgressPercentage(userAchievement)}%"
											></div>
										</div>
									</div>
									{#if userAchievement.achievement?.rewardType && userAchievement.achievement?.rewardAmount}
										<p class="text-sm text-gray-500">
											Reward: {userAchievement.achievement.rewardAmount} {userAchievement.achievement.rewardType === 'dark_matter' ? 'DM' : userAchievement.achievement.rewardType}
										</p>
									{/if}
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	{#if achievements.length === 0}
		<div class="text-center py-12">
			<div class="text-6xl mb-4">🏆</div>
			<h3 class="text-xl font-bold text-white mb-2">No Achievements Yet</h3>
			<p class="text-gray-400">Start playing to unlock your first achievements!</p>
		</div>
	{/if}
</div>