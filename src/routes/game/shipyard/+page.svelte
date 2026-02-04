<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Spinner from '$lib/components/Spinner.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	// Get data from the new structure
	let shipyardData = $derived(data.shipyardData);
	let ships = $derived(shipyardData?.ships || {});
	let queue = $derived(shipyardData?.queue || []);
	let shipyardInfo = $derived(shipyardData?.shipyardInfo || []);
	let resources = $derived(shipyardData?.resources || {});
	let shipyardLevel = $derived(shipyardData?.shipyardLevel || 0);

	// Real-time timer for queue updates
	let currentTime = $state(new Date());

	onMount(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

	// Track input amounts
	let amounts: Record<string, number> = $state({});

	// Update amounts when shipyardInfo changes
	$effect(() => {
		if (shipyardInfo.length > 0) {
			amounts = Object.fromEntries(shipyardInfo.map((ship: any) => [ship.shipType, 1]));
		}
	});

	let loading = $state<Record<string, boolean>>({});

	function canBuild(ship: any) {
		const amount = amounts[ship.shipType] || 1;
		const cost = {
			metal: ship.cost.metal * amount,
			crystal: ship.cost.crystal * amount,
			gas: ship.cost.gas * amount
		};

		return ship.canBuild &&
			resources.metal >= cost.metal &&
			resources.crystal >= cost.crystal &&
			(cost.gas === 0 || resources.gas >= cost.gas);
	}

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

	async function handleBuild(shipType: string) {
		loading[shipType] = true;
		const amount = amounts[shipType] || 1;
		try {
			const response = await fetch('/api/shipyard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'build',
					planetId: data.currentPlanet.id,
					shipType,
					amount
				})
			});
			if (response.ok) {
				await invalidateAll();
			} else {
				console.error('Failed to build ships');
			}
		} catch (error) {
			console.error('Error building ships:', error);
		} finally {
			loading[shipType] = false;
		}
	}

	async function handleCancel(queueId: number) {
		try {
			const response = await fetch('/api/shipyard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'cancel',
					queueId
				})
			});
			if (response.ok) {
				await invalidateAll();
			} else {
				console.error('Failed to cancel construction');
			}
		} catch (error) {
			console.error('Error canceling construction:', error);
		}
	}
</script>

<div class="p-4 pb-20">
	<h2 class="mb-6 text-2xl font-bold text-blue-300">Shipyard</h2>

	{#if shipyardLevel === 0}
		<div class="mb-6 rounded border border-red-500 bg-red-900/50 p-4 text-center text-red-200">
			You need a Shipyard to build ships. <a
				href="/game"
				class="font-bold underline hover:text-white">Build one in the Facilities menu.</a
			>
		</div>
	{/if}

	<!-- Construction Queue -->
	{#if queue.length > 0}
		<div class="mb-6 rounded-lg border border-blue-500 bg-blue-900/20 p-4">
			<h3 class="mb-3 text-lg font-bold text-blue-300">Construction Queue</h3>
			<div class="space-y-2">
				{#each queue as item}
					<div class="flex items-center justify-between rounded bg-gray-800 p-3">
						<div class="flex items-center space-x-3">
							<span class="font-medium text-gray-200">{item.shipType.replace(/_/g, ' ')}</span>
							<span class="text-sm text-gray-400">x{item.amount}</span>
							<span class="text-sm text-yellow-400">{formatTimeRemaining(new Date(item.completionAt))}</span>
						</div>
						<button
							onclick={() => handleCancel(item.id)}
							class="rounded bg-red-600 px-3 py-1 text-sm font-bold text-white hover:bg-red-500"
						>
							Cancel
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div
		class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 {shipyardLevel === 0
			? 'pointer-events-none opacity-50 grayscale'
			: ''}"
	>
		{#each shipyardInfo as ship}
			{@const count = ships[ship.shipType.replace(/_([a-z])/g, (g: any) => g[1].toUpperCase())] || 0}
			{@const amount = amounts[ship.shipType] || 1}
			{@const totalCost = {
				metal: ship.cost.metal * amount,
				crystal: ship.cost.crystal * amount,
				gas: ship.cost.gas * amount
			}}

			<div class="flex flex-col rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-lg">
				<div class="mb-2 flex items-start justify-between">
					<h3 class="text-lg font-bold text-gray-200">{ship.name}</h3>
					<span class="rounded bg-blue-900 px-2 py-1 text-xs text-blue-300">Owned: {count}</span>
				</div>

				<div class="mb-4 space-y-1 text-xs text-gray-400">
					<div class="flex justify-between">
						<span>Attack:</span> <span class="text-red-400">{ship.attack}</span>
					</div>
					<div class="flex justify-between">
						<span>Defense:</span> <span class="text-green-400">{ship.defense}</span>
					</div>
					<div class="flex justify-between">
						<span>Speed:</span> <span class="text-yellow-400">{ship.speed}</span>
					</div>
					<div class="flex justify-between">
						<span>Capacity:</span> <span class="text-blue-400">{ship.capacity}</span>
					</div>
				</div>

				<div class="mt-auto">
					<div class="mb-2 space-x-2 text-xs text-gray-500">
						{#if totalCost.metal > 0}
							<span class={resources.metal < totalCost.metal ? 'text-red-500' : ''}>
								M: {totalCost.metal.toLocaleString()}
							</span>
						{/if}
						{#if totalCost.crystal > 0}
							<span class={resources.crystal < totalCost.crystal ? 'text-red-500' : ''}>
								C: {totalCost.crystal.toLocaleString()}
							</span>
						{/if}
						{#if totalCost.gas > 0}
							<span class={resources.gas < totalCost.gas ? 'text-red-500' : ''}>
								G: {totalCost.gas.toLocaleString()}
							</span>
						{/if}
					</div>

					{#if !ship.canBuild}
						<div class="mb-2 text-xs text-red-400">{ship.reason}</div>
					{/if}

					<div class="flex space-x-2">
						<input
							type="number"
							min="1"
							bind:value={amounts[ship.shipType]}
							class="w-16 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-center text-white"
							disabled={shipyardLevel === 0}
						/>
						<button
							onclick={() => handleBuild(ship.shipType)}
							class="flex flex-1 transform items-center justify-center rounded bg-blue-600 text-sm font-bold transition hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:opacity-50"
							disabled={shipyardLevel === 0 || !canBuild(ship) || loading[ship.shipType]}
						>
							{#if loading[ship.shipType]}
								<Spinner size="sm" class="mr-2" />
							{/if}
							Build
						</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
