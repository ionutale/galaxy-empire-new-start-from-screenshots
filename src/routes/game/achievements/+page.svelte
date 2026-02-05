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
	// @ts-expect-error
	$: achievements = data.achievements as UserAchievement[];
	$: newlyUnlocked = data.newlyUnlocked;

	// Group achievements by category
	$: achievementsByCategory = achievements.reduce(
		(acc: Record<string, UserAchievement[]>, userAchievement: UserAchievement) => {
			const category = userAchievement.achievement?.category || 'other';
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push(userAchievement);
			return acc;
		},
		{} as Record<string, UserAchievement[]>
	);

	// Category display names and colors
	const categoryInfo: Record<string, { name: string; color: string }> = {
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
	<h1 class="mb-8 text-3xl font-bold text-white">Achievements</h1>

	{#if newlyUnlocked && newlyUnlocked.length > 0}
		<div class="mb-8 rounded-lg border border-green-600 bg-green-800 p-6">
			<h2 class="mb-4 text-xl font-bold text-green-200">🎉 New Achievements Unlocked!</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each newlyUnlocked as achievement (achievement.id || achievement.name)}
					<div class="rounded-lg bg-green-700 p-4">
						<div class="mb-2 text-3xl">{achievement.icon}</div>
						<h3 class="font-bold text-green-100">{achievement.name}</h3>
						<p class="text-sm text-green-200">{achievement.description}</p>
						{#if achievement.rewardType && achievement.rewardAmount}
							<p class="mt-2 text-xs text-yellow-300">
								Reward: {achievement.rewardAmount}
								{achievement.rewardType === 'dark_matter' ? 'DM' : achievement.rewardType}
							</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#each Object.entries(achievementsByCategory) as [category, categoryAchievements] (category)}
		<div class="mb-8">
			<h2 class="mb-4 text-2xl font-bold text-white">
				{categoryInfo[category]?.name || category}
			</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each categoryAchievements as userAchievement (userAchievement.id || userAchievement.achievement?.name)}
					<div
						class="rounded-lg border-2 bg-gray-800 p-6 {userAchievement.isCompleted
							? 'border-green-500'
							: 'border-gray-600'}"
					>
						<div class="flex items-start space-x-4">
							<div class="flex-shrink-0 text-4xl">
								{userAchievement.achievement?.icon || '🏆'}
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="mb-2 text-lg font-bold text-white">
									{userAchievement.achievement?.name || 'Unknown Achievement'}
								</h3>
								<p class="mb-3 text-sm text-gray-300">
									{userAchievement.achievement?.description || ''}
								</p>

								{#if userAchievement.isCompleted}
									<div class="mb-2 flex items-center text-green-400">
										<span class="mr-2 text-lg">✅</span>
										<span class="font-medium">Completed</span>
									</div>
									{#if userAchievement.achievement?.rewardType && userAchievement.achievement?.rewardAmount}
										<p class="text-sm text-yellow-400">
											Reward: {userAchievement.achievement.rewardAmount}
											{userAchievement.achievement.rewardType === 'dark_matter'
												? 'DM'
												: userAchievement.achievement.rewardType}
										</p>
									{/if}
								{:else}
									<div class="mb-3">
										<div class="mb-1 flex justify-between text-sm text-gray-400">
											<span>Progress</span>
											<span>{formatProgress(userAchievement)}</span>
										</div>
										<div class="h-2 w-full rounded-full bg-gray-700">
											<div
												class="h-2 rounded-full bg-blue-600 transition-all duration-300"
												style="width: {getProgressPercentage(userAchievement)}%"
											></div>
										</div>
									</div>
									{#if userAchievement.achievement?.rewardType && userAchievement.achievement?.rewardAmount}
										<p class="text-sm text-gray-500">
											Reward: {userAchievement.achievement.rewardAmount}
											{userAchievement.achievement.rewardType === 'dark_matter'
												? 'DM'
												: userAchievement.achievement.rewardType}
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
		<div class="py-12 text-center">
			<div class="mb-4 text-6xl">🏆</div>
			<h3 class="mb-2 text-xl font-bold text-white">No Achievements Yet</h3>
			<p class="text-gray-400">Start playing to unlock your first achievements!</p>
		</div>
	{/if}
</div>
