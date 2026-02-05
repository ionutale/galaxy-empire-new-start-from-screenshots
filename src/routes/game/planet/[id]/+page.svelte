<script lang="ts">
	import Spinner from '$lib/components/Spinner.svelte';
	import type { BuildingInfo } from '$lib/server/building-service';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let loading = $state<Record<string, boolean>>({});

	let buildings = $derived(data.buildings || []) as BuildingInfo[];
	let queue = $derived(data.queue || []);
	let resources = $derived(data.resources || { metal: 0, crystal: 0, gas: 0, energy: 0 });

	// Real-time timer for queue updates
	let currentTime = $state(new Date());

	onMount(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

	async function handleUpgrade(buildingTypeId: number, planetId: number) {
		loading[buildingTypeId] = true;
		try {
			const res = await fetch('/api/buildings/upgrade', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ buildingTypeId, planetId })
			});

			if (!res.ok) {
				const err = await res.json();
				alert(err.error || 'Upgrade failed');
				return;
			}

			await invalidateAll();
		} catch (e) {
			console.error(e);
			alert('Network error during upgrade');
		} finally {
			loading[buildingTypeId] = false;
		}
	}

	async function handleCancel(queueId: number, planetId: number) {
		// Use a temporary loading state key for cancellation if needed, or just block UI
		if (!confirm('Cancel this construction?')) return;

		try {
			// Optimistic UI update or global loading could be added here
			const res = await fetch('/api/buildings/cancel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ queueId, planetId })
			});

			if (!res.ok) {
				const err = await res.json();
				alert(err.error || 'Cancel failed');
				return;
			}

			await invalidateAll();
		} catch (e) {
			console.error(e);
			alert('Network error during cancellation');
		}
	}

	async function handleAbandon(planetId: number) {
		if (!confirm('Are you sure you want to abandon this planet? This action cannot be undone.'))
			return;

		try {
			const res = await fetch('/api/planets/abandon', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ planetId })
			});

			if (!res.ok) {
				const err = await res.json();
				alert(err.error || 'Abandon failed');
				return;
			}

			// Redirect or reload is handled by invalidateAll -> load function reruns ->
			// if planet is gone, load function might 404. We should probably redirect to game home.
			window.location.href = '/game';
		} catch (e) {
			console.error(e);
			alert('Network error during abandon');
		}
	}

	// Group buildings by category
	let resourceBuildings = $derived(buildings.filter((b) => b.category === 'resource'));
	let facilityBuildings = $derived(buildings.filter((b) => b.category === 'facility'));
	let storageBuildings = $derived(buildings.filter((b) => b.category === 'storage'));

	function formatTimeRemaining(completionAt: Date) {
		const diff = completionAt.getTime() - currentTime.getTime();
		if (diff <= 0) return 'Complete';

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		} else {
			return `${seconds}s`;
		}
	}

	function getBuildingIcon(name: string) {
		if (name.includes('Metal')) return '⛏️';
		if (name.includes('Crystal')) return '💎';
		if (name.includes('Gas')) return '⛽';
		if (name.includes('Solar')) return '☀️';
		if (name.includes('Research')) return '🔬';
		if (name.includes('Shipyard')) return '🚀';
		if (name.includes('Nanite')) return '🤖';
		if (name.includes('Robotics')) return '⚙️';
		if (name.includes('Storage')) return '📦';
		return '🏭';
	}
</script>

<div class="p-4 pb-20">
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-2xl font-bold text-blue-300">{data.planet.name}</h2>
				<p class="text-sm text-gray-400">
					[{data.planet.galaxyId}:{data.planet.systemId}:{data.planet.planetNumber}]
				</p>
			</div>
			<button
				onclick={() => handleAbandon(data.planet.id)}
				class="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
			>
				Abandon Planet
			</button>
		</div>
	</div>

	<!-- Resource Progress Bars -->
	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
		<div class="rounded border border-gray-700 bg-gray-800 p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-medium text-gray-300">Metal</span>
				<span class="text-sm text-gray-400">{(resources.metal ?? 0).toLocaleString()}</span>
			</div>
			<div class="h-2 rounded-full bg-gray-700">
				<div class="h-2 rounded-full bg-gray-400" style="width: 60%"></div>
			</div>
		</div>
		<div class="rounded border border-gray-700 bg-gray-800 p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-medium text-blue-300">Crystal</span>
				<span class="text-sm text-gray-400">{(resources.crystal ?? 0).toLocaleString()}</span>
			</div>
			<div class="h-2 rounded-full bg-gray-700">
				<div class="h-2 rounded-full bg-blue-400" style="width: 45%"></div>
			</div>
		</div>
		<div class="rounded border border-gray-700 bg-gray-800 p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-medium text-purple-300">Gas</span>
				<span class="text-sm text-gray-400">{(resources.gas ?? 0).toLocaleString()}</span>
			</div>
			<div class="h-2 rounded-full bg-gray-700">
				<div class="h-2 rounded-full bg-purple-400" style="width: 30%"></div>
			</div>
		</div>
	</div>

	<!-- Building Queue -->
	{#if queue.length > 0}
		<div class="mb-6 rounded-lg border border-blue-500 bg-blue-900/20 p-4">
			<h3 class="mb-3 text-lg font-bold text-blue-300">Construction Queue</h3>
			<div class="space-y-2">
				{#each queue as item}
					<div class="flex items-center justify-between rounded bg-gray-800 p-3">
						<div class="flex items-center space-x-3">
							<span class="text-2xl">{getBuildingIcon(item.buildingTypeId.toString())}</span>
							<div>
								<span class="font-medium text-gray-200">Building Level {item.targetLevel}</span>
								<div class="text-sm text-yellow-400">
									{formatTimeRemaining(new Date(item.completionAt))}
								</div>
							</div>
						</div>
						<button
							onclick={() => handleCancel(item.id, data.planet.id)}
							class="rounded bg-red-600 px-3 py-1 text-sm font-bold text-white hover:bg-red-500"
						>
							Cancel
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Resource Buildings -->
	{#if resourceBuildings.length > 0}
		<h3 class="mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">
			Resource Production
		</h3>
		<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each resourceBuildings as building}
				<div
					class="flex flex-col justify-between rounded border border-gray-700 bg-gray-800 p-4 transition-all duration-200 hover:scale-105 hover:border-blue-500 hover:shadow-lg"
				>
					<div>
						<div class="mb-2 flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<span class="text-3xl">{getBuildingIcon(building.name)}</span>
								<div>
									<h3 class="text-lg font-bold text-gray-200">{building.name}</h3>
									<span class="font-mono text-xs text-blue-400">Level {building.level}</span>
									{#if building.isUpgrading}
										<span class="ml-2 text-xs text-yellow-400">Upgrading...</span>
									{/if}
								</div>
							</div>
						</div>

						{#if building.description}
							<p class="mb-3 text-sm text-gray-400">{building.description}</p>
						{/if}

						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							{#if building.cost.metal > 0}
								<span
									class={(resources.metal ?? 0) < building.cost.metal
										? 'text-red-400'
										: 'text-gray-300'}
								>
									Metal: {building.cost.metal.toLocaleString()}
								</span>
							{/if}
							{#if building.cost.crystal > 0}
								<span
									class={(resources.crystal ?? 0) < building.cost.crystal
										? 'text-red-400'
										: 'text-gray-300'}
								>
									Crystal: {building.cost.crystal.toLocaleString()}
								</span>
							{/if}
							{#if building.cost.gas > 0}
								<span
									class={(resources.gas ?? 0) < building.cost.gas
										? 'text-red-400'
										: 'text-gray-300'}
								>
									Gas: {building.cost.gas.toLocaleString()}
								</span>
							{/if}
						</div>

						{#if Object.keys(building.prerequisites).length > 0}
							<div class="mb-2 text-xs text-gray-500">
								Prerequisites: {Object.entries(building.prerequisites)
									.map(([k, v]) => `${k} ${v}`)
									.join(', ')}
							</div>
						{/if}
					</div>

					<button
						onclick={() => handleUpgrade(building.id, data.planet.id)}
						disabled={!building.canUpgrade ||
							building.isUpgrading ||
							(resources.metal ?? 0) < building.cost.metal ||
							(resources.crystal ?? 0) < building.cost.crystal ||
							(resources.gas ?? 0) < building.cost.gas ||
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
			{/each}
		</div>
	{/if}

	<!-- Facility Buildings -->
	{#if facilityBuildings.length > 0}
		<h3 class="mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Facilities</h3>
		<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each facilityBuildings as building}
				<div class="flex flex-col justify-between rounded border border-gray-700 bg-gray-800 p-4">
					<div>
						<div class="mb-2 flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<span class="text-3xl">{getBuildingIcon(building.name)}</span>
								<div>
									<h3 class="text-lg font-bold text-gray-200">{building.name}</h3>
									<span class="font-mono text-xs text-blue-400">Level {building.level}</span>
									{#if building.isUpgrading}
										<span class="ml-2 text-xs text-yellow-400">Upgrading...</span>
									{/if}
								</div>
							</div>
						</div>

						{#if building.description}
							<p class="mb-3 text-sm text-gray-400">{building.description}</p>
						{/if}

						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							{#if building.cost.metal > 0}
								<span
									class={(resources.metal ?? 0) < building.cost.metal
										? 'text-red-400'
										: 'text-gray-300'}
								>
									Metal: {building.cost.metal.toLocaleString()}
								</span>
							{/if}
							{#if building.cost.crystal > 0}
								<span
									class={(resources.crystal ?? 0) < building.cost.crystal
										? 'text-red-400'
										: 'text-gray-300'}
								>
									Crystal: {building.cost.crystal.toLocaleString()}
								</span>
							{/if}
							{#if building.cost.gas > 0}
								<span
									class={(resources.gas ?? 0) < building.cost.gas
										? 'text-red-400'
										: 'text-gray-300'}
								>
									Gas: {building.cost.gas.toLocaleString()}
								</span>
							{/if}
						</div>

						{#if Object.keys(building.prerequisites).length > 0}
							<div class="mb-2 text-xs text-gray-500">
								Prerequisites: {Object.entries(building.prerequisites)
									.map(([k, v]) => `${k} ${v}`)
									.join(', ')}
							</div>
						{/if}
					</div>

					<button
						onclick={() => handleUpgrade(building.id, data.planet.id)}
						disabled={!building.canUpgrade ||
							building.isUpgrading ||
							(resources.metal ?? 0) < building.cost.metal ||
							(resources.crystal ?? 0) < building.cost.crystal ||
							(resources.gas ?? 0) < building.cost.gas ||
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
			{/each}
		</div>
	{/if}

	<!-- Storage Buildings -->
	{#if storageBuildings.length > 0}
		<h3 class="mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Storage</h3>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each storageBuildings as building}
				<div class="flex flex-col justify-between rounded border border-gray-700 bg-gray-800 p-4">
					<div>
						<div class="mb-2 flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<span class="text-3xl">{getBuildingIcon(building.name)}</span>
								<div>
									<h3 class="text-lg font-bold text-gray-200">{building.name}</h3>
									<span class="font-mono text-xs text-blue-400">Level {building.level}</span>
									{#if building.isUpgrading}
										<span class="ml-2 text-xs text-yellow-400">Upgrading...</span>
									{/if}
								</div>
							</div>
						</div>

						{#if building.description}
							<p class="mb-3 text-sm text-gray-400">{building.description}</p>
						{/if}

						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							{#if building.cost.metal > 0}
								<span
									class={(resources.metal ?? 0) < building.cost.metal
										? 'text-red-400'
										: 'text-gray-300'}
								>
									Metal: {building.cost.metal.toLocaleString()}
								</span>
							{/if}
							{#if building.cost.crystal > 0}
								<span
									class={(resources.crystal ?? 0) < building.cost.crystal
										? 'text-red-400'
										: 'text-gray-300'}
								>
									Crystal: {building.cost.crystal.toLocaleString()}
								</span>
							{/if}
							{#if building.cost.gas > 0}
								<span
									class={(resources.gas ?? 0) < building.cost.gas
										? 'text-red-400'
										: 'text-gray-300'}
								>
									Gas: {building.cost.gas.toLocaleString()}
								</span>
							{/if}
						</div>

						{#if Object.keys(building.prerequisites).length > 0}
							<div class="mb-2 text-xs text-gray-500">
								Prerequisites: {Object.entries(building.prerequisites)
									.map(([k, v]) => `${k} ${v}`)
									.join(', ')}
							</div>
						{/if}
					</div>

					<button
						onclick={() => handleUpgrade(building.id, data.planet.id)}
						disabled={!building.canUpgrade ||
							building.isUpgrading ||
							(resources.metal ?? 0) < building.cost.metal ||
							(resources.crystal ?? 0) < building.cost.crystal ||
							(resources.gas ?? 0) < building.cost.gas ||
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
			{/each}
		</div>
	{/if}
</div>
