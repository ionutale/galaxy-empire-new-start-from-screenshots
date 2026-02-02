<script lang="ts">
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/Spinner.svelte';
	import type { ResearchInfo } from '$lib/server/research-service';

	let { data } = $props();
	let loading = $state<Record<string, boolean>>({});

	let resources = $derived({
		metal: data.resources?.metal || 0,
		crystal: data.resources?.crystal || 0,
		gas: data.resources?.gas || 0,
		energy: data.resources?.energy || 0
	});

	let research = $derived(data.research || []) as ResearchInfo[];

	// Group research by category
	let energyResearch = $derived(research.filter(r => r.category === 'energy'));
	let combatResearch = $derived(research.filter(r => r.category === 'combat'));
	let propulsionResearch = $derived(research.filter(r => r.category === 'propulsion'));
	let intelligenceResearch = $derived(research.filter(r => r.category === 'intelligence'));
	let expansionResearch = $derived(research.filter(r => r.category === 'expansion'));

	// Check if user has research lab
	let hasResearchLab = $derived(data.currentPlanet?.buildings?.find((b: any) => b.name === 'Research Lab')?.level > 0);
</script>

<div class="p-4 pb-20">
	<h2 class="mb-6 text-2xl font-bold text-blue-300">Research Lab</h2>

	{#if !hasResearchLab}
		<div class="mb-6 rounded border border-red-500 bg-red-900/50 p-4 text-center text-red-200">
			You need a Research Lab to conduct research. <a
				href="/game"
				class="font-bold underline hover:text-white">Build one in the Facilities menu.</a
			>
		</div>
	{/if}

	<!-- Energy Research -->
	{#if energyResearch.length > 0}
		<h3 class="mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Energy Technologies</h3>
		<div
			class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 {!hasResearchLab
				? 'pointer-events-none opacity-50 grayscale'
				: ''}"
		>
			{#each energyResearch as tech}
				<div class="flex flex-col justify-between rounded border border-gray-700 bg-gray-800 p-4">
					<div>
						<div class="mb-2 flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<span class="text-3xl">{tech.icon}</span>
								<div>
									<h3 class="text-lg font-bold text-gray-200">{tech.name}</h3>
									<span class="font-mono text-xs text-blue-400">Level {tech.level}</span>
								</div>
							</div>
						</div>

						{#if tech.description}
							<p class="mb-3 text-sm text-gray-400">{tech.description}</p>
						{/if}

						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							{#if tech.cost.metal > 0}
								<span class={resources.metal < tech.cost.metal ? 'text-red-400' : 'text-gray-300'}>
									Metal: {tech.cost.metal.toLocaleString()}
								</span>
							{/if}
							{#if tech.cost.crystal > 0}
								<span class={resources.crystal < tech.cost.crystal ? 'text-red-400' : 'text-gray-300'}>
									Crystal: {tech.cost.crystal.toLocaleString()}
								</span>
							{/if}
							{#if tech.cost.gas > 0}
								<span class={resources.gas < tech.cost.gas ? 'text-red-400' : 'text-gray-300'}>
									Gas: {tech.cost.gas.toLocaleString()}
								</span>
							{/if}
						</div>

						{#if Object.keys(tech.prerequisites).length > 0}
							<div class="mb-2 text-xs text-gray-500">
								Prerequisites: {Object.entries(tech.prerequisites).map(([k, v]) => `${k} ${v}`).join(', ')}
							</div>
						{/if}
					</div>

					<form
						method="POST"
						action="?/research"
						use:enhance={() => {
							loading[tech.id] = true;
							return async ({ update }) => {
								loading[tech.id] = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="research_type_id" value={tech.id} />
						<input type="hidden" name="planet_id" value={data.currentPlanet.id} />
						<button
							type="submit"
							disabled={!hasResearchLab ||
								!tech.canResearch ||
								resources.metal < tech.cost.metal ||
								resources.crystal < tech.cost.crystal ||
								resources.gas < tech.cost.gas ||
								tech.isResearching ||
								loading[tech.id]}
							class="flex w-full items-center justify-center rounded bg-blue-600 py-2 text-sm font-bold transition-transform hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 disabled:opacity-50"
						>
							{#if loading[tech.id]}
								<Spinner size="sm" class="mr-2" />
							{:else if tech.isResearching}
								Researching...
							{:else}
								Research Level {tech.level + 1}
							{/if}
						</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Combat Research -->
	{#if combatResearch.length > 0}
		<h3 class="mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Combat Technologies</h3>
		<div
			class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 {!hasResearchLab
				? 'pointer-events-none opacity-50 grayscale'
				: ''}"
		>
			{#each combatResearch as tech}
				<div class="flex flex-col justify-between rounded border border-gray-700 bg-gray-800 p-4">
					<div>
						<div class="mb-2 flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<span class="text-3xl">{tech.icon}</span>
								<div>
									<h3 class="text-lg font-bold text-gray-200">{tech.name}</h3>
									<span class="font-mono text-xs text-blue-400">Level {tech.level}</span>
								</div>
							</div>
						</div>

						{#if tech.description}
							<p class="mb-3 text-sm text-gray-400">{tech.description}</p>
						{/if}

						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							{#if tech.cost.metal > 0}
								<span class={resources.metal < tech.cost.metal ? 'text-red-400' : 'text-gray-300'}>
									Metal: {tech.cost.metal.toLocaleString()}
								</span>
							{/if}
							{#if tech.cost.crystal > 0}
								<span class={resources.crystal < tech.cost.crystal ? 'text-red-400' : 'text-gray-300'}>
									Crystal: {tech.cost.crystal.toLocaleString()}
								</span>
							{/if}
							{#if tech.cost.gas > 0}
								<span class={resources.gas < tech.cost.gas ? 'text-red-400' : 'text-gray-300'}>
									Gas: {tech.cost.gas.toLocaleString()}
								</span>
							{/if}
						</div>

						{#if Object.keys(tech.prerequisites).length > 0}
							<div class="mb-2 text-xs text-gray-500">
								Prerequisites: {Object.entries(tech.prerequisites).map(([k, v]) => `${k} ${v}`).join(', ')}
							</div>
						{/if}
					</div>

					<form
						method="POST"
						action="?/research"
						use:enhance={() => {
							loading[tech.id] = true;
							return async ({ update }) => {
								loading[tech.id] = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="research_type_id" value={tech.id} />
						<input type="hidden" name="planet_id" value={data.currentPlanet.id} />
						<button
							type="submit"
							disabled={!hasResearchLab ||
								!tech.canResearch ||
								resources.metal < tech.cost.metal ||
								resources.crystal < tech.cost.crystal ||
								resources.gas < tech.cost.gas ||
								tech.isResearching ||
								loading[tech.id]}
							class="flex w-full items-center justify-center rounded bg-blue-600 py-2 text-sm font-bold transition-transform hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 disabled:opacity-50"
						>
							{#if loading[tech.id]}
								<Spinner size="sm" class="mr-2" />
							{:else if tech.isResearching}
								Researching...
							{:else}
								Research Level {tech.level + 1}
							{/if}
						</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Propulsion Research -->
	{#if propulsionResearch.length > 0}
		<h3 class="mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Propulsion Technologies</h3>
		<div
			class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 {!hasResearchLab
				? 'pointer-events-none opacity-50 grayscale'
				: ''}"
		>
			{#each propulsionResearch as tech}
				<div class="flex flex-col justify-between rounded border border-gray-700 bg-gray-800 p-4">
					<div>
						<div class="mb-2 flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<span class="text-3xl">{tech.icon}</span>
								<div>
									<h3 class="text-lg font-bold text-gray-200">{tech.name}</h3>
									<span class="font-mono text-xs text-blue-400">Level {tech.level}</span>
								</div>
							</div>
						</div>

						{#if tech.description}
							<p class="mb-3 text-sm text-gray-400">{tech.description}</p>
						{/if}

						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							{#if tech.cost.metal > 0}
								<span class={resources.metal < tech.cost.metal ? 'text-red-400' : 'text-gray-300'}>
									Metal: {tech.cost.metal.toLocaleString()}
								</span>
							{/if}
							{#if tech.cost.crystal > 0}
								<span class={resources.crystal < tech.cost.crystal ? 'text-red-400' : 'text-gray-300'}>
									Crystal: {tech.cost.crystal.toLocaleString()}
								</span>
							{/if}
							{#if tech.cost.gas > 0}
								<span class={resources.gas < tech.cost.gas ? 'text-red-400' : 'text-gray-300'}>
									Gas: {tech.cost.gas.toLocaleString()}
								</span>
							{/if}
						</div>

						{#if Object.keys(tech.prerequisites).length > 0}
							<div class="mb-2 text-xs text-gray-500">
								Prerequisites: {Object.entries(tech.prerequisites).map(([k, v]) => `${k} ${v}`).join(', ')}
							</div>
						{/if}
					</div>

					<form
						method="POST"
						action="?/research"
						use:enhance={() => {
							loading[tech.id] = true;
							return async ({ update }) => {
								loading[tech.id] = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="research_type_id" value={tech.id} />
						<input type="hidden" name="planet_id" value={data.currentPlanet.id} />
						<button
							type="submit"
							disabled={!hasResearchLab ||
								!tech.canResearch ||
								resources.metal < tech.cost.metal ||
								resources.crystal < tech.cost.crystal ||
								resources.gas < tech.cost.gas ||
								tech.isResearching ||
								loading[tech.id]}
							class="flex w-full items-center justify-center rounded bg-blue-600 py-2 text-sm font-bold transition-transform hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 disabled:opacity-50"
						>
							{#if loading[tech.id]}
								<Spinner size="sm" class="mr-2" />
							{:else if tech.isResearching}
								Researching...
							{:else}
								Research Level {tech.level + 1}
							{/if}
						</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Intelligence Research -->
	{#if intelligenceResearch.length > 0}
		<h3 class="mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Intelligence Technologies</h3>
		<div
			class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 {!hasResearchLab
				? 'pointer-events-none opacity-50 grayscale'
				: ''}"
		>
			{#each intelligenceResearch as tech}
				<div class="flex flex-col justify-between rounded border border-gray-700 bg-gray-800 p-4">
					<div>
						<div class="mb-2 flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<span class="text-3xl">{tech.icon}</span>
								<div>
									<h3 class="text-lg font-bold text-gray-200">{tech.name}</h3>
									<span class="font-mono text-xs text-blue-400">Level {tech.level}</span>
								</div>
							</div>
						</div>

						{#if tech.description}
							<p class="mb-3 text-sm text-gray-400">{tech.description}</p>
						{/if}

						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							{#if tech.cost.metal > 0}
								<span class={resources.metal < tech.cost.metal ? 'text-red-400' : 'text-gray-300'}>
									Metal: {tech.cost.metal.toLocaleString()}
								</span>
							{/if}
							{#if tech.cost.crystal > 0}
								<span class={resources.crystal < tech.cost.crystal ? 'text-red-400' : 'text-gray-300'}>
									Crystal: {tech.cost.crystal.toLocaleString()}
								</span>
							{/if}
							{#if tech.cost.gas > 0}
								<span class={resources.gas < tech.cost.gas ? 'text-red-400' : 'text-gray-300'}>
									Gas: {tech.cost.gas.toLocaleString()}
								</span>
							{/if}
						</div>

						{#if Object.keys(tech.prerequisites).length > 0}
							<div class="mb-2 text-xs text-gray-500">
								Prerequisites: {Object.entries(tech.prerequisites).map(([k, v]) => `${k} ${v}`).join(', ')}
							</div>
						{/if}
					</div>

					<form
						method="POST"
						action="?/research"
						use:enhance={() => {
							loading[tech.id] = true;
							return async ({ update }) => {
								loading[tech.id] = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="research_type_id" value={tech.id} />
						<input type="hidden" name="planet_id" value={data.currentPlanet.id} />
						<button
							type="submit"
							disabled={!hasResearchLab ||
								!tech.canResearch ||
								resources.metal < tech.cost.metal ||
								resources.crystal < tech.cost.crystal ||
								resources.gas < tech.cost.gas ||
								tech.isResearching ||
								loading[tech.id]}
							class="flex w-full items-center justify-center rounded bg-blue-600 py-2 text-sm font-bold transition-transform hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 disabled:opacity-50"
						>
							{#if loading[tech.id]}
								<Spinner size="sm" class="mr-2" />
							{:else if tech.isResearching}
								Researching...
							{:else}
								Research Level {tech.level + 1}
							{/if}
						</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Expansion Research -->
	{#if expansionResearch.length > 0}
		<h3 class="mb-4 border-b border-gray-700 pb-2 text-xl font-bold text-gray-300">Expansion Technologies</h3>
		<div
			class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 {!hasResearchLab
				? 'pointer-events-none opacity-50 grayscale'
				: ''}"
		>
			{#each expansionResearch as tech}
				<div class="flex flex-col justify-between rounded border border-gray-700 bg-gray-800 p-4">
					<div>
						<div class="mb-2 flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<span class="text-3xl">{tech.icon}</span>
								<div>
									<h3 class="text-lg font-bold text-gray-200">{tech.name}</h3>
									<span class="font-mono text-xs text-blue-400">Level {tech.level}</span>
								</div>
							</div>
						</div>

						{#if tech.description}
							<p class="mb-3 text-sm text-gray-400">{tech.description}</p>
						{/if}

						<div class="mb-2 flex flex-wrap gap-2 text-xs text-gray-400">
							{#if tech.cost.metal > 0}
								<span class={resources.metal < tech.cost.metal ? 'text-red-400' : 'text-gray-300'}>
									Metal: {tech.cost.metal.toLocaleString()}
								</span>
							{/if}
							{#if tech.cost.crystal > 0}
								<span class={resources.crystal < tech.cost.crystal ? 'text-red-400' : 'text-gray-300'}>
									Crystal: {tech.cost.crystal.toLocaleString()}
								</span>
							{/if}
							{#if tech.cost.gas > 0}
								<span class={resources.gas < tech.cost.gas ? 'text-red-400' : 'text-gray-300'}>
									Gas: {tech.cost.gas.toLocaleString()}
								</span>
							{/if}
						</div>

						{#if Object.keys(tech.prerequisites).length > 0}
							<div class="mb-2 text-xs text-gray-500">
								Prerequisites: {Object.entries(tech.prerequisites).map(([k, v]) => `${k} ${v}`).join(', ')}
							</div>
						{/if}
					</div>

					<form
						method="POST"
						action="?/research"
						use:enhance={() => {
							loading[tech.id] = true;
							return async ({ update }) => {
								loading[tech.id] = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="research_type_id" value={tech.id} />
						<input type="hidden" name="planet_id" value={data.currentPlanet.id} />
						<button
							type="submit"
							disabled={!hasResearchLab ||
								!tech.canResearch ||
								resources.metal < tech.cost.metal ||
								resources.crystal < tech.cost.crystal ||
								resources.gas < tech.cost.gas ||
								tech.isResearching ||
								loading[tech.id]}
							class="flex w-full items-center justify-center rounded bg-blue-600 py-2 text-sm font-bold transition-transform hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 disabled:opacity-50"
						>
							{#if loading[tech.id]}
								<Spinner size="sm" class="mr-2" />
							{:else if tech.isResearching}
								Researching...
							{:else}
								Research Level {tech.level + 1}
							{/if}
						</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}
</div>
