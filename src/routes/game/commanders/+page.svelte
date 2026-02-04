<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import Spinner from '$lib/components/Spinner.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let commanders = $derived(data.commanders);
	let durationCosts = $derived(data.durationCosts) as any;
	let activeCommanders = $derived(data.activeCommanders);
	let commanderExperience = $derived(data.commanderExperience);
	let darkMatter = $derived(data.darkMatter);

	let selectedDuration = $state(7);
	let loading = $state<Record<string, boolean>>({});
	let savingSettings = $state(false);

	// Settings state
	let settingsEnabled = $state(false);
	let settingsTemplateId = $state('');
	let settingsOriginPlanetId = $state('');
	
	// Initialize settings from data when available
	$effect(() => {
		if (data.autoExploreSettings) {
			settingsEnabled = data.autoExploreSettings.enabled;
			settingsTemplateId = data.autoExploreSettings.templateId || '';
			settingsOriginPlanetId = data.autoExploreSettings.originPlanetId || '';
		}
	});

	function formatDate(dateStr: string | Date) {
		return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString();
	}

	async function handlePurchase(commanderId: string) {
		loading[commanderId] = true;
		try {
			const response = await fetch('/api/commanders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					action: 'purchase',
					commanderId, 
					duration: selectedDuration 
				})
			});
			
			if (response.ok) {
				await invalidateAll();
			} else {
				console.error('Failed to purchase commander');
			}
		} catch (error) {
			console.error('Error purchasing commander:', error);
		} finally {
			loading[commanderId] = false;
		}
	}

	async function handleSaveSettings() {
		savingSettings = true;
		try {
			const response = await fetch('/api/commanders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					action: 'saveSettings',
					enabled: settingsEnabled,
					templateId: settingsTemplateId,
					originPlanetId: settingsOriginPlanetId
				})
			});
			
			if (response.ok) {
				await invalidateAll();
			} else {
				console.error('Failed to save settings');
			}
		} catch (error) {
			console.error('Error saving settings:', error);
		} finally {
			savingSettings = false;
		}
	}
</script>

<div class="mx-auto w-full max-w-6xl p-4">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-purple-400">Commanders</h1>
		<div class="rounded-lg border border-purple-500/30 bg-gray-800 px-4 py-2">
			<span class="text-gray-400">Dark Matter:</span>
			<span class="ml-2 font-bold text-purple-400">{darkMatter}</span>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		{#each Object.values(commanders) as commander}
			<div
				class="overflow-hidden rounded-lg border border-gray-700 bg-gray-900/80 transition-colors hover:border-purple-500/50"
			>
				<div class="flex items-center justify-between border-b border-gray-700 bg-gray-800/50 p-4">
					<h3 class="text-xl font-bold text-white">{commander.name}</h3>
					{#if activeCommanders[commander.id]}
						<span
							class="rounded border border-green-500/30 bg-green-900/50 px-2 py-1 text-xs text-green-400"
							>Active</span
						>
					{/if}
				</div>

				<div class="space-y-4 p-6">
					<div class="mb-4 flex h-32 items-center justify-center rounded bg-black/40">
						<!-- Placeholder for image -->
						<span class="text-4xl">👨‍✈️</span>
					</div>

					<p class="h-12 text-sm text-gray-300">{commander.description}</p>

					{#if activeCommanders[commander.id]}
						{@const exp = commanderExperience[commander.id]}
						{@const currentBonus = commander.baseBonusValue + ((exp?.level || 1) - 1) * commander.levelBonusMultiplier}
						<div class="font-mono text-sm text-purple-300">
							Bonus: +{currentBonus}% {commander.bonusType.replace('_', ' ')}
						</div>

						{#if exp}
							<div class="mt-2 space-y-1">
								<div class="flex justify-between text-xs text-gray-400">
									<span>Level {exp.level}</span>
									<span>{exp.experience}/{exp.experienceToNext} XP</span>
								</div>
								<div class="h-1 rounded-full bg-gray-700">
									<div
										class="h-1 rounded-full bg-purple-500 transition-all"
										style="width: {(exp.experience / exp.experienceToNext) * 100}%"
									></div>
								</div>
								{#if exp.level < commander.maxLevel}
									<div class="text-xs text-gray-500">
										Next level: {exp.experienceToNext - exp.experience} XP needed
									</div>
								{:else}
									<div class="text-xs text-yellow-400">Max level reached!</div>
								{/if}
							</div>
						{/if}

						<div class="mt-2 text-xs text-gray-400">
							Expires: {formatDate(activeCommanders[commander.id])}
						</div>
					{:else}
						<div class="font-mono text-sm text-purple-300">
							Bonus: +{commander.baseBonusValue}% {commander.bonusType.replace('_', ' ')}
						</div>
					{/if}

					{#if commander.id === 'nebula_explorer' && activeCommanders[commander.id]}
						<div class="mt-4 border-t border-gray-700 pt-4">
							<h4 class="mb-2 text-sm font-bold text-purple-400">Auto-Explore Settings</h4>
							<div class="space-y-2">
								<label class="flex items-center space-x-2 text-sm text-gray-300">
									<input
										type="checkbox"
										name="enabled"
										bind:checked={settingsEnabled}
										class="rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
									/>
									<span>Enable Auto-Explore</span>
								</label>

								<select
									name="templateId"
									bind:value={settingsTemplateId}
									class="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white"
								>
									<option value="">Select Template</option>
									{#each data.templates as template}
										<option
											value={template.id}
											>{template.name}</option
										>
									{/each}
								</select>

								<select
									name="originPlanetId"
									bind:value={settingsOriginPlanetId}
									class="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white"
								>
									<option value="">Select Origin Planet</option>
									{#each data.userPlanets as planet}
										<option
											value={planet.id}
											>{planet.name} [{planet.galaxyId}:{planet.systemId}:{planet.planetNumber}]</option
										>
									{/each}
								</select>

								<button
									onclick={handleSaveSettings}
									disabled={savingSettings}
									class="flex w-full items-center justify-center rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{#if savingSettings}
										<Spinner size="sm" class="mr-2" />
									{/if}
									Save Settings
								</button>
							</div>
						</div>
					{/if}

					<div class="mt-4 space-y-3">
						<select
							name="duration"
							class="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
							bind:value={selectedDuration}
						>
							{#each Object.entries(durationCosts) as [days, cost]}
								<option value={days}>{days} Days - {cost} DM</option>
							{/each}
						</select>

						<button
							onclick={() => handlePurchase(commander.id)}
							class="flex w-full transform items-center justify-center rounded bg-purple-600 px-4 py-2 font-bold text-white transition-colors hover:bg-purple-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={darkMatter < durationCosts[selectedDuration as any] ||
								loading[commander.id]}
						>
							{#if loading[commander.id]}
								<Spinner size="sm" class="mr-2" />
							{/if}
							{activeCommanders[commander.id] ? 'Extend' : 'Recruit'}
						</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
