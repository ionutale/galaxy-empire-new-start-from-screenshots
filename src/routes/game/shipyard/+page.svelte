<script lang="ts">
	import { enhance } from '$app/forms';
	import { SHIPS } from '$lib/game-config';
	import Spinner from '$lib/components/Spinner.svelte';

	let { data } = $props();

	const shipTypes = Object.keys(SHIPS);

	// Track input amounts
	let amounts = $state(Object.fromEntries(shipTypes.map((type) => [type, 1])));
	let loading = $state<Record<string, boolean>>({});

	let resources = $derived({
		metal: data.resources?.metal || 0,
		crystal: data.resources?.crystal || 0,
		gas: data.resources?.gas || 0,
		energy: data.resources?.energy || 0
	});
	let ships = $derived(data.ships || {}) as any;
	let shipyardLevel = $derived(data.shipyardLevel || 0);

	function canBuild(type: string) {
		const ship = SHIPS[type as keyof typeof SHIPS];
		const amount = amounts[type] || 1;
		const cost = {
			metal: ship.cost.metal * amount,
			crystal: ship.cost.crystal * amount,
			gas: (ship.cost.gas || 0) * amount
		};

		return (
			resources.metal >= cost.metal &&
			resources.crystal >= cost.crystal &&
			(cost.gas === 0 || resources.gas >= cost.gas)
		);
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

	<div
		class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 {shipyardLevel === 0
			? 'pointer-events-none opacity-50 grayscale'
			: ''}"
	>
		{#each shipTypes as type}
			{@const ship = SHIPS[type as keyof typeof SHIPS]}
			{@const count = ships[type] || 0}
			{@const amount = amounts[type] || 1}
			{@const totalCost = {
				metal: ship.cost.metal * amount,
				crystal: ship.cost.crystal * amount,
				gas: (ship.cost.gas || 0) * amount
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

					<form
						method="POST"
						action="?/build"
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
						<input
							type="number"
							name="amount"
							min="1"
							bind:value={amounts[type]}
							class="w-16 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-center text-white"
							disabled={shipyardLevel === 0}
						/>
						<button
							type="submit"
							class="flex flex-1 transform items-center justify-center rounded bg-blue-600 text-sm font-bold transition hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:opacity-50"
							disabled={shipyardLevel === 0 || !canBuild(type) || loading[type]}
						>
							{#if loading[type]}
								<Spinner size="sm" class="mr-2" />
							{/if}
							Build
						</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
</div>
