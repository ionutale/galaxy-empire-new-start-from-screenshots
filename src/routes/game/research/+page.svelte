<script lang="ts">
	import { getResearchCost } from '$lib/game-config';
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/Spinner.svelte';

	let { data } = $props();
	let loading = $state<Record<string, boolean>>({});

	let resources = $derived({
		metal: data.resources?.metal || 0,
		crystal: data.resources?.crystal || 0,
		gas: data.resources?.gas || 0,
		energy: data.resources?.energy || 0
	});
	let userResearch = $derived(data.userResearch || {}) as any;
	let researchLabLevel = $derived(data.researchLabLevel || 0);
	let techs = $derived(data.techs || {});

	// Helper to format numbers
	const f = (n: number) => Math.floor(n).toLocaleString();

	function toCamel(s: string) {
		return s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
	}
</script>

<div class="p-4 pb-20">
	<h2 class="mb-6 text-2xl font-bold text-blue-300">Research Lab</h2>

	{#if researchLabLevel === 0}
		<div class="mb-6 rounded border border-red-500 bg-red-900/50 p-4 text-center text-red-200">
			You need a Research Lab to conduct research. <a
				href="/game"
				class="font-bold underline hover:text-white">Build one in the Facilities menu.</a
			>
		</div>
	{/if}

	<div
		class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 {researchLabLevel === 0
			? 'pointer-events-none opacity-50 grayscale'
			: ''}"
	>
		{#each Object.entries(techs) as [id, tech]}
			{@const currentLevel = userResearch[toCamel(id)] || 0}
			{@const cost = getResearchCost(id, currentLevel)}

			<div class="flex flex-col justify-between rounded border border-gray-700 bg-gray-800 p-4">
				<div>
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-lg font-bold text-green-400">{tech.name}</h3>
						<span class="rounded bg-gray-700 px-2 py-1 text-xs">Lvl {currentLevel}</span>
					</div>
					<p class="mb-4 h-10 text-sm text-gray-400">{tech.description}</p>

					<div class="mb-4 space-y-1 text-sm">
						{#if cost}
							{#if cost.metal > 0}
								<div class="flex justify-between">
									<span class="text-gray-500">Metal:</span>
									<span class={resources.metal < cost.metal ? 'text-red-500' : 'text-gray-300'}
										>{f(cost.metal)}</span
									>
								</div>
							{/if}
							{#if cost.crystal > 0}
								<div class="flex justify-between">
									<span class="text-gray-500">Crystal:</span>
									<span class={resources.crystal < cost.crystal ? 'text-red-500' : 'text-gray-300'}
										>{f(cost.crystal)}</span
									>
								</div>
							{/if}
							{#if (cost.gas || 0) > 0}
								<div class="flex justify-between">
									<span class="text-gray-500">Gas:</span>
									<span class={resources.gas < (cost.gas || 0) ? 'text-red-500' : 'text-gray-300'}
										>{f(cost.gas || 0)}</span
									>
								</div>
							{/if}
							{#if (cost.energy || 0) > 0}
								<div class="flex justify-between">
									<span class="text-gray-500">Energy:</span>
									<span
										class={resources.energy < (cost.energy || 0) ? 'text-red-500' : 'text-gray-300'}
										>{f(cost.energy || 0)}</span
									>
								</div>
							{/if}
						{/if}
					</div>
				</div>

				<form
					method="POST"
					action="?/research"
					use:enhance={() => {
						loading[id] = true;
						return async ({ update }) => {
							loading[id] = false;
							await update();
						};
					}}
				>
					<input type="hidden" name="techId" value={id} />
					<input type="hidden" name="planetId" value={data.currentPlanet.id} />
					<button
						type="submit"
						class="flex w-full transform items-center justify-center rounded py-2 font-bold transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-50
                            {cost &&
						resources.metal >= cost.metal &&
						resources.crystal >= cost.crystal &&
						resources.gas >= (cost.gas || 0) &&
						resources.energy >= (cost.energy || 0) &&
						researchLabLevel > 0
							? 'bg-green-600 text-white hover:bg-green-500'
							: 'cursor-not-allowed bg-gray-600 text-gray-400'}"
						disabled={!cost ||
							!(
								resources.metal >= cost.metal &&
								resources.crystal >= cost.crystal &&
								resources.gas >= (cost.gas || 0) &&
								resources.energy >= (cost.energy || 0)
							) ||
							researchLabLevel === 0 ||
							loading[id]}
					>
						{#if loading[id]}
							<Spinner size="sm" class="mr-2" />
						{/if}
						Research
					</button>
				</form>
			</div>
		{/each}
	</div>
</div>
