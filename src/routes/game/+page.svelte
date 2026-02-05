<script lang="ts">
	import Spinner from '$lib/components/Spinner.svelte';
	import type { BuildingInfo } from '$lib/server/building-service';
	import { DEFENSES } from '$lib/game-config';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let loading = $state<Record<string, boolean>>({});

	let resources = $derived({
		metal: data.resources?.metal || 0,
		crystal: data.resources?.crystal || 0,
		gas: data.resources?.gas || 0,
		energy: data.resources?.energy || 0
	});

	let buildings = $derived(data.buildings || []) as BuildingInfo[];
	let defenses = $derived(data.defenses || {}) as Record<string, number>;

	// Group buildings by category
	let resourceBuildings = $derived(buildings.filter((b) => b.category === 'resource'));
	let facilityBuildings = $derived(buildings.filter((b) => b.category === 'facility'));
	let storageBuildings = $derived(buildings.filter((b) => b.category === 'storage'));

	// Defense types from config
	let defenseTypes = $derived(Object.keys(DEFENSES));

	// Helper function for camelCase conversion
	function toCamel(s: string) {
		return s.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
	}

	let isRenaming = $state(false);

	// Defense amounts
	let defenseAmounts = $state<Record<string, number>>({});

	async function handleRename(e: SubmitEvent) {
		e.preventDefault();
		if (!data.currentPlanet) return;

		loading['rename'] = true;
		const formData = new FormData(e.target as HTMLFormElement);
		const name = formData.get('name') as string;

		try {
			const response = await fetch(`/api/planet/${data.currentPlanet.id}/rename`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});

			if (response.ok) {
				await invalidateAll();
				isRenaming = false;
			}
		} catch (error) {
			console.error('Rename failed', error);
		} finally {
			loading['rename'] = false;
		}
	}

	async function handleUpgrade(building: BuildingInfo) {
		if (!data.currentPlanet) return;
		const id = building.id || building.building_type_id;
		loading[id] = true;

		try {
			const response = await fetch('/api/buildings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					building_type_id: id,
					planet_id: data.currentPlanet.id
				})
			});

			if (response.ok) {
				await invalidateAll();
			}
		} catch (error) {
			console.error('Upgrade failed', error);
		} finally {
			loading[id] = false;
		}
	}

	async function handleBuildDefense(type: string) {
		if (!data.currentPlanet) return;
		loading[type] = true;
		const amount = defenseAmounts[type] || 1;

		try {
			const response = await fetch('/api/defense', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type,
					amount,
					planet_id: data.currentPlanet.id
				})
			});

			if (response.ok) {
				await invalidateAll();
				defenseAmounts[type] = 1; // Reset amount
			}
		} catch (error) {
			console.error('Defense build failed', error);
		} finally {
			loading[type] = false;
		}
	}
</script>

<div class="p-4 pb-20">
	{#if !data.currentPlanet}
		<div class="flex h-full flex-col items-center justify-center p-8 text-center">
			<h2 class="mb-4 text-2xl font-bold text-red-400">No Planet Found</h2>
			<p class="text-gray-400">
				You don't seem to have any planets. Please contact support or try re-registering.
			</p>
		</div>
	{:else}
		<div class="group relative mb-6 text-center">
			{#if isRenaming}
				<form onsubmit={handleRename} class="flex items-center justify-center gap-2">
					<input
						type="text"
						name="name"
						value={data.currentPlanet.name}
						class="rounded border border-blue-500 bg-white px-2 py-1 text-gray-900 focus:outline-none dark:bg-gray-700 dark:text-white"
						maxlength="20"
					/>
					<button
						type="submit"
						disabled={loading['rename']}
						class="text-green-600 hover:text-green-500 disabled:opacity-50 dark:text-green-400 dark:hover:text-green-300"
					>
						{#if loading['rename']}
							<Spinner size="sm" />
						{:else}
							✓
						{/if}
					</button>
					<button
						type="button"
						onclick={() => (isRenaming = false)}
						class="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
						>✕</button
					>
				</form>
			{:else}
				<h2
					class="flex items-center justify-center gap-2 text-2xl font-bold text-blue-600 dark:text-blue-300"
				>
					{data.currentPlanet.name}
					<button
						onclick={() => (isRenaming = true)}
						class="text-sm text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-600 dark:text-gray-500 dark:hover:text-white"
						>✎</button
					>
				</h2>
			{/if}
			<p class="text-sm text-gray-600 dark:text-gray-400">
				[{data.currentPlanet.galaxyId}:{data.currentPlanet.systemId}:{data.currentPlanet
					.planetNumber}]
				<a
					href="/game/planet/{data.currentPlanet.id}"
					class="ml-4 text-blue-600 underline hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
				>
					View Details
				</a>
			</p>
		</div>

		<!-- Resources Section -->
		<h3
			class="mb-4 border-b border-gray-200 pb-2 text-xl font-bold text-gray-800 dark:border-gray-700 dark:text-gray-300"
		>
			Resources
		</h3>
		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each resourceBuildings as building (building.id)}
				<div
					class="flex flex-col rounded-lg border border-gray-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80"
				>
					<div class="mb-2 flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<span class="text-3xl">
								{#if building.name.includes('Metal')}⛏️
								{:else if building.name.includes('Crystal')}💎
								{:else if building.name.includes('Gas')}⛽
								{:else if building.name.includes('Solar')}☀️
								{:else}🏭
								{/if}
							</span>
							<div>
								<h3 class="text-lg font-bold text-gray-900 dark:text-gray-200">{building.name}</h3>
								<span class="font-mono text-xs text-blue-600 dark:text-blue-400"
									>Level {building.level}</span
								>
								{#if building.isUpgrading}
									<span class="ml-2 text-xs text-yellow-600 dark:text-yellow-400">Upgrading...</span
									>
								{/if}
							</div>
						</div>
						{#if building.production}
							<div class="text-right">
								<div class="text-xs text-gray-400">Hourly Output</div>
								{#if building.production.metal}
									<div class="font-mono text-sm text-green-400">
										+{building.production.metal.toLocaleString()} Metal
									</div>
								{:else if building.production.crystal}
									<div class="font-mono text-sm text-green-400">
										+{building.production.crystal.toLocaleString()} Crystal
									</div>
								{:else if building.production.gas}
									<div class="font-mono text-sm text-green-400">
										+{building.production.gas.toLocaleString()} Gas
									</div>
								{:else if building.production.energy}
									<div class="font-mono text-sm text-green-400">
										+{building.production.energy.toLocaleString()} Energy
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<div class="mt-auto">
						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							<span
								class={resources.metal < building.cost.metal ? 'text-red-400' : 'text-gray-300'}
							>
								Metal: {building.cost.metal.toLocaleString()}
							</span>
							<span
								class={resources.crystal < building.cost.crystal ? 'text-red-400' : 'text-gray-300'}
							>
								Crystal: {building.cost.crystal.toLocaleString()}
							</span>
							{#if building.cost.gas > 0}
								<span class={resources.gas < building.cost.gas ? 'text-red-400' : 'text-gray-300'}>
									Gas: {building.cost.gas.toLocaleString()}
								</span>
							{/if}
							<span class="text-gray-500">Time: {Math.ceil(building.buildTime / 60)}m</span>
						</div>

						<button
							onclick={() => handleUpgrade(building)}
							disabled={!building.canUpgrade ||
								building.isUpgrading ||
								resources.metal < building.cost.metal ||
								resources.crystal < building.cost.crystal ||
								resources.gas < building.cost.gas ||
								loading[building.id]}
							class="flex w-full items-center justify-center rounded bg-blue-600 py-2 text-sm font-bold transition-transform hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 disabled:opacity-50"
						>
							{#if loading[building.id]}
								<Spinner size="sm" class="mr-2" />
							{:else if building.isUpgrading}
								Upgrading...
							{:else}
								Upgrade to Level {building.level + 1}
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Facilities Section -->
		<h3 class="mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Facilities</h3>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each facilityBuildings as building (building.id)}
				<div
					class="flex flex-col rounded-lg border border-gray-700 bg-gray-800/80 p-4 shadow-lg backdrop-blur-sm"
				>
					<div class="mb-2 flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<span class="text-3xl">{building.icon}</span>
							<div>
								<h3 class="text-lg font-bold text-gray-200">{building.name}</h3>
								<span class="font-mono text-xs text-blue-400">Level {building.level}</span>
							</div>
						</div>
					</div>

					<div class="mt-auto">
						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							{#if building.upgradeCost}
								{#if building.upgradeCost.metal > 0}
									<span
										class={resources.metal < building.upgradeCost.metal
											? 'text-red-400'
											: 'text-gray-300'}
									>
										Metal: {building.upgradeCost.metal.toLocaleString()}
									</span>
								{/if}
								{#if building.upgradeCost.crystal > 0}
									<span
										class={resources.crystal < building.upgradeCost.crystal
											? 'text-red-400'
											: 'text-gray-300'}
									>
										Crystal: {building.upgradeCost.crystal.toLocaleString()}
									</span>
								{/if}
								{#if (building.upgradeCost.gas || 0) > 0}
									<span
										class={resources.gas < (building.upgradeCost.gas || 0)
											? 'text-red-400'
											: 'text-gray-300'}
									>
										Gas: {(building.upgradeCost.gas || 0).toLocaleString()}
									</span>
								{/if}
							{/if}
						</div>

						<button
							onclick={() => handleUpgrade(building)}
							disabled={!building.upgradeCost ||
								resources.metal < building.upgradeCost.metal ||
								resources.crystal < building.upgradeCost.crystal ||
								((building.upgradeCost.gas || 0) > 0 &&
									resources.gas < (building.upgradeCost.gas || 0)) ||
								building.isUpgrading ||
								loading[building.building_type_id]}
							class="flex w-full items-center justify-center rounded bg-blue-600 py-2 text-sm font-bold transition-transform hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 disabled:opacity-50"
						>
							{#if loading[building.building_type_id]}
								<Spinner size="sm" class="mr-2" />
							{:else if building.isUpgrading}
								Upgrading...
							{:else}
								Upgrade to Level {building.level + 1}
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Defenses Section -->
		<h3 class="mt-8 mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">
			Defenses
		</h3>

		{#if (buildings.find((b) => b.name === 'Shipyard')?.level || 0) === 0}
			<div class="mb-6 rounded border border-red-500 bg-red-900/50 p-4 text-center text-red-200">
				You need a Shipyard to build defenses. Build one in the Facilities section above.
			</div>
		{/if}

		<div
			class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 {(buildings.find(
				(b) => b.name === 'Shipyard'
			)?.level || 0) === 0
				? 'pointer-events-none opacity-50 grayscale'
				: ''}"
		>
			{#each defenseTypes as type (type)}
				{@const defense = DEFENSES[type as keyof typeof DEFENSES]}
				{@const count = defenses[toCamel(type)] || 0}

				<div class="flex flex-col rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-lg">
					<div class="mb-2 flex items-start justify-between">
						<h3 class="text-lg font-bold text-gray-200">{defense.name}</h3>
						<span class="rounded bg-blue-900 px-2 py-1 text-xs text-blue-300">Owned: {count}</span>
					</div>

					<div class="mb-4 space-y-1 text-xs text-gray-400">
						<div class="flex justify-between">
							<span>Attack:</span> <span class="text-red-400">{defense.attack}</span>
						</div>
						<div class="flex justify-between">
							<span>Defense:</span> <span class="text-green-400">{defense.defense}</span>
						</div>
						<div class="flex justify-between">
							<span>Shield:</span> <span class="text-blue-400">{defense.shield}</span>
						</div>
					</div>

					<div class="mt-auto">
						<div class="mb-2 space-x-2 text-xs text-gray-500">
							{#if defense.cost.metal > 0}<span>M: {defense.cost.metal.toLocaleString()}</span>{/if}
							{#if defense.cost.crystal > 0}<span>C: {defense.cost.crystal.toLocaleString()}</span
								>{/if}
							{#if (defense.cost.gas || 0) > 0}<span
									>G: {(defense.cost.gas || 0).toLocaleString()}</span
								>{/if}
						</div>

						<div class="flex space-x-2">
							{#if defense.max && count >= defense.max}
								<button
									disabled
									class="w-full rounded bg-gray-600 py-1 text-sm font-bold text-gray-400"
									>Max Reached</button
								>
							{:else}
								<input
									type="number"
									min="1"
									bind:value={defenseAmounts[type]}
									class="w-16 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-center text-white"
									disabled={(buildings.find((b) => b.name === 'Shipyard')?.level || 0) === 0}
								/>
								<button
									onclick={() => handleBuildDefense(type)}
									class="flex flex-1 transform items-center justify-center rounded bg-blue-600 text-sm font-bold transition hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:opacity-50"
									disabled={(buildings.find((b) => b.name === 'Shipyard')?.level || 0) === 0 ||
										loading[type]}
								>
									{#if loading[type]}
										<Spinner size="sm" class="mr-2" />
									{/if}
									Build
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Storage Section -->
		<h3 class="mt-8 mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Storage</h3>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each storageBuildings as building (building.id)}
				<div
					class="flex flex-col rounded-lg border border-gray-700 bg-gray-800/80 p-4 shadow-lg backdrop-blur-sm"
				>
					<div class="mb-2 flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<span class="text-3xl">{building.icon}</span>
							<div>
								<h3 class="text-lg font-bold text-gray-200">{building.name}</h3>
								<span class="font-mono text-xs text-blue-400">Level {building.level}</span>
							</div>
						</div>
					</div>

					<div class="mt-auto">
						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							{#if building.upgradeCost}
								{#if building.upgradeCost.metal > 0}
									<span
										class={resources.metal < building.upgradeCost.metal
											? 'text-red-400'
											: 'text-gray-300'}
									>
										Metal: {building.upgradeCost.metal.toLocaleString()}
									</span>
								{/if}
								{#if building.upgradeCost.crystal > 0}
									<span
										class={resources.crystal < building.upgradeCost.crystal
											? 'text-red-400'
											: 'text-gray-300'}
									>
										Crystal: {building.upgradeCost.crystal.toLocaleString()}
									</span>
								{/if}
								{#if (building.upgradeCost.gas || 0) > 0}
									<span
										class={resources.gas < (building.upgradeCost.gas || 0)
											? 'text-red-400'
											: 'text-gray-300'}
									>
										Gas: {(building.upgradeCost.gas || 0).toLocaleString()}
									</span>
								{/if}
							{/if}
						</div>

						<button
							onclick={() => handleUpgrade(building)}
							disabled={!building.upgradeCost ||
								resources.metal < building.upgradeCost.metal ||
								resources.crystal < building.upgradeCost.crystal ||
								((building.upgradeCost.gas || 0) > 0 &&
									resources.gas < (building.upgradeCost.gas || 0)) ||
								building.isUpgrading ||
								loading[building.building_type_id]}
							class="flex w-full items-center justify-center rounded bg-blue-600 py-2 text-sm font-bold transition-transform hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 disabled:opacity-50"
						>
							{#if loading[building.building_type_id]}
								<Spinner size="sm" class="mr-2" />
							{:else if building.isUpgrading}
								Upgrading...
							{:else}
								Upgrade to Level {building.level + 1}
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
