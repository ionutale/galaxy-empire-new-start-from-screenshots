<script lang="ts">
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/Spinner.svelte';
	import type { BuildingInfo } from '$lib/server/building-service';
	import { DEFENSES } from '$lib/game-config';

	let { data } = $props();
	let loading = $state<Record<string, boolean>>({});

	let resources = $derived({
		metal: data.resources?.metal || 0,
		crystal: data.resources?.crystal || 0,
		gas: data.resources?.gas || 0,
		energy: data.resources?.energy || 0
	});

	let buildings = $derived(data.buildings || []) as BuildingInfo[];
	let defenses = $derived(data.defenses || {}) as any;

	// Group buildings by category
	let resourceBuildings = $derived(buildings.filter(b => b.category === 'resource'));
	let facilityBuildings = $derived(buildings.filter(b => b.category === 'facility'));
	let storageBuildings = $derived(buildings.filter(b => b.category === 'storage'));

	// Defense types from config
	let defenseTypes = $derived(Object.keys(DEFENSES));

	// Helper function for camelCase conversion
	function toCamel(s: string) {
		return s.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
	}

	let isRenaming = $state(false);
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
				<form
					method="POST"
					action="?/renamePlanet"
					use:enhance={() => {
						loading['rename'] = true;
						return async ({ update }) => {
							loading['rename'] = false;
							await update();
							isRenaming = false;
						};
					}}
					class="flex items-center justify-center gap-2"
				>
					<input type="hidden" name="planet_id" value={data.currentPlanet.id} />
					<input
						type="text"
						name="name"
						value={data.currentPlanet.name}
						class="rounded border border-blue-500 bg-gray-700 px-2 py-1 text-white focus:outline-none"
						maxlength="20"
					/>
					<button
						type="submit"
						disabled={loading['rename']}
						class="text-green-400 hover:text-green-300 disabled:opacity-50"
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
						class="text-red-400 hover:text-red-300">✕</button
					>
				</form>
			{:else}
				<h2 class="flex items-center justify-center gap-2 text-2xl font-bold text-blue-300">
					{data.currentPlanet.name}
					<button
						onclick={() => (isRenaming = true)}
						class="text-sm text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white"
						>✎</button
					>
				</h2>
			{/if}
			<p class="text-sm text-gray-400">
				[{data.currentPlanet.galaxyId}:{data.currentPlanet.systemId}:{data.currentPlanet
					.planetNumber}]
			</p>
		</div>

		<!-- Resources Section -->
		<h3 class="mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Resources</h3>
		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each resourceBuildings as building}
				<div
					class="flex flex-col rounded-lg border border-gray-700 bg-gray-800/80 p-4 shadow-lg backdrop-blur-sm"
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
								<h3 class="text-lg font-bold text-gray-200">{building.name}</h3>
								<span class="font-mono text-xs text-blue-400">Level {building.level}</span>
								{#if building.isUpgrading}
									<span class="ml-2 text-xs text-yellow-400">Upgrading...</span>
								{/if}
							</div>
						</div>
						{#if building.production}
							<div class="text-right">
								<div class="text-xs text-gray-400">Hourly Output</div>
								{#if building.production.metal}
									<div class="font-mono text-sm text-green-400">+{building.production.metal.toLocaleString()} Metal</div>
								{:else if building.production.crystal}
									<div class="font-mono text-sm text-green-400">+{building.production.crystal.toLocaleString()} Crystal</div>
								{:else if building.production.gas}
									<div class="font-mono text-sm text-green-400">+{building.production.gas.toLocaleString()} Gas</div>
								{:else if building.production.energy}
									<div class="font-mono text-sm text-green-400">+{building.production.energy.toLocaleString()} Energy</div>
								{/if}
							</div>
						{/if}
					</div>

					<div class="mt-auto">
						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							<span class={resources.metal < building.cost.metal ? 'text-red-400' : 'text-gray-300'}>
								Metal: {building.cost.metal.toLocaleString()}
							</span>
							<span class={resources.crystal < building.cost.crystal ? 'text-red-400' : 'text-gray-300'}>
								Crystal: {building.cost.crystal.toLocaleString()}
							</span>
							{#if building.cost.gas > 0}
								<span class={resources.gas < building.cost.gas ? 'text-red-400' : 'text-gray-300'}>
									Gas: {building.cost.gas.toLocaleString()}
								</span>
							{/if}
							<span class="text-gray-500">Time: {Math.ceil(building.buildTime / 60)}m</span>
						</div>

						<form
							method="POST"
							action="?/upgrade"
							use:enhance={() => {
								loading[building.id] = true;
								return async ({ update }) => {
									loading[building.id] = false;
									await update();
								};
							}}
						>
							<input type="hidden" name="building_type_id" value={building.id} />
							<input type="hidden" name="planet_id" value={data.currentPlanet.id} />
							<button
								type="submit"
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
						</form>
					</div>
				</div>
			{/each}
		</div>

		<!-- Facilities Section -->
		<h3 class="mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Facilities</h3>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each facilityBuildings as building}
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
									<span class={resources.metal < building.upgradeCost.metal ? 'text-red-400' : 'text-gray-300'}>
										Metal: {building.upgradeCost.metal.toLocaleString()}
									</span>
								{/if}
								{#if building.upgradeCost.crystal > 0}
									<span class={resources.crystal < building.upgradeCost.crystal ? 'text-red-400' : 'text-gray-300'}>
										Crystal: {building.upgradeCost.crystal.toLocaleString()}
									</span>
								{/if}
								{#if (building.upgradeCost.gas || 0) > 0}
									<span class={resources.gas < (building.upgradeCost.gas || 0) ? 'text-red-400' : 'text-gray-300'}>
										Gas: {(building.upgradeCost.gas || 0).toLocaleString()}
									</span>
								{/if}
							{/if}
						</div>

						<form
							method="POST"
							action="?/upgrade"
							use:enhance={() => {
								loading[building.building_type_id] = true;
								return async ({ update }) => {
									loading[building.building_type_id] = false;
									await update();
								};
							}}
						>
							<input type="hidden" name="type" value={building.building_type_id} />
							<input type="hidden" name="planet_id" value={data.currentPlanet.id} />
							<button
								type="submit"
								disabled={!building.upgradeCost ||
									resources.metal < building.upgradeCost.metal ||
									resources.crystal < building.upgradeCost.crystal ||
									((building.upgradeCost.gas || 0) > 0 && resources.gas < (building.upgradeCost.gas || 0)) ||
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
						</form>
					</div>
				</div>
			{/each}
		</div>

		<!-- Defenses Section -->
		<h3 class="mt-8 mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">
			Defenses
		</h3>

		{#if (buildings.find(b => b.name === 'Shipyard')?.level || 0) === 0}
			<div class="mb-6 rounded border border-red-500 bg-red-900/50 p-4 text-center text-red-200">
				You need a Shipyard to build defenses. Build one in the Facilities section above.
			</div>
		{/if}

		<div
			class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 {(buildings.find(b => b.name === 'Shipyard')?.level || 0) === 0
				? 'pointer-events-none opacity-50 grayscale'
				: ''}"
		>
			{#each defenseTypes as type}
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

						<form
							method="POST"
							action="?/build_defense"
							use:enhance={() => {
								loading[type] = true;
								return async ({ update }) => {
									loading[type] = false;
									await update();
								};
							}}
							class="flex space-x-2"
						>
							<input type="hidden" name="type" value={type} />
							<input type="hidden" name="planet_id" value={data.currentPlanet.id} />

							{#if defense.max && count >= defense.max}
								<button
									disabled
									class="w-full rounded bg-gray-600 py-1 text-sm font-bold text-gray-400"
									>Max Reached</button
								>
							{:else}
								<input
									type="number"
									name="amount"
									min="1"
									value="1"
									class="w-16 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-center text-white"
									disabled={(buildings.find(b => b.name === 'Shipyard')?.level || 0) === 0}
								/>
								<button
									type="submit"
									class="flex flex-1 transform items-center justify-center rounded bg-blue-600 text-sm font-bold transition hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:opacity-50"
									disabled={(buildings.find(b => b.name === 'Shipyard')?.level || 0) === 0 || loading[type]}
								>
									{#if loading[type]}
										<Spinner size="sm" class="mr-2" />
									{/if}
									Build
								</button>
							{/if}
						</form>
					</div>
				</div>
			{/each}
		</div>

		<!-- Storage Section -->
		<h3 class="mt-8 mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Storage</h3>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each storageBuildings as building}
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
									<span class={resources.metal < building.upgradeCost.metal ? 'text-red-400' : 'text-gray-300'}>
										Metal: {building.upgradeCost.metal.toLocaleString()}
									</span>
								{/if}
								{#if building.upgradeCost.crystal > 0}
									<span class={resources.crystal < building.upgradeCost.crystal ? 'text-red-400' : 'text-gray-300'}>
										Crystal: {building.upgradeCost.crystal.toLocaleString()}
									</span>
								{/if}
								{#if (building.upgradeCost.gas || 0) > 0}
									<span class={resources.gas < (building.upgradeCost.gas || 0) ? 'text-red-400' : 'text-gray-300'}>
										Gas: {(building.upgradeCost.gas || 0).toLocaleString()}
									</span>
								{/if}
							{/if}
						</div>

						<form
							method="POST"
							action="?/upgrade"
							use:enhance={() => {
								loading[building.building_type_id] = true;
								return async ({ update }) => {
									loading[building.building_type_id] = false;
									await update();
								};
							}}
						>
							<input type="hidden" name="type" value={building.building_type_id} />
							<input type="hidden" name="planet_id" value={data.currentPlanet.id} />
							<button
								type="submit"
								disabled={!building.upgradeCost ||
									resources.metal < building.upgradeCost.metal ||
									resources.crystal < building.upgradeCost.crystal ||
									((building.upgradeCost.gas || 0) > 0 && resources.gas < (building.upgradeCost.gas || 0)) ||
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
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
