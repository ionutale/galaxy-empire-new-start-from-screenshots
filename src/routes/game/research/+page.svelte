<script lang="ts">
	import Spinner from '$lib/components/Spinner.svelte';
	import type { ResearchInfo } from '$lib/server/research-service';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';

	let { data } = $props();
	let loading = $state<Record<string, boolean>>({});

	let resources = $derived({
		metal: data.resources?.metal || 0,
		crystal: data.resources?.crystal || 0,
		gas: data.resources?.gas || 0,
		energy: data.resources?.energy || 0
	});

	let research = $derived(data.research || []) as ResearchInfo[];
	let queue = $derived(data.queue || []);
	let hasResearchLab = $derived(data.hasResearchLab || false);

	// Real-time timer for queue updates
	let currentTime = $state(new Date());

	onMount(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

	async function handleResearch(researchTypeId: number, planetId: number) {
		loading[researchTypeId] = true;
		try {
			const res = await fetch('/api/research/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ researchTypeId, planetId })
			});

			if (!res.ok) {
				const err = await res.json();
				alert(err.error || 'Research failed');
				return;
			}

			await invalidateAll();
		} catch (e) {
			console.error(e);
			alert('Network error during research start');
		} finally {
			loading[researchTypeId] = false;
		}
	}

	async function handleCancel(queueId: number) {
		if (!confirm('Cancel this research?')) return;

		try {
			const res = await fetch('/api/research/cancel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ queueId })
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

	// Group research by category
	let energyResearch = $derived(research.filter((r) => r.category === 'energy'));
	let combatResearch = $derived(research.filter((r) => r.category === 'combat'));
	let propulsionResearch = $derived(research.filter((r) => r.category === 'propulsion'));
	let intelligenceResearch = $derived(research.filter((r) => r.category === 'intelligence'));
	let expansionResearch = $derived(research.filter((r) => r.category === 'expansion'));

	let categories = $derived([
		{ name: 'Energy Technologies', items: energyResearch, color: 'blue' },
		{ name: 'Combat Technologies', items: combatResearch, color: 'red' },
		{ name: 'Propulsion Technologies', items: propulsionResearch, color: 'purple' },
		{ name: 'Intelligence Technologies', items: intelligenceResearch, color: 'green' },
		{ name: 'Expansion Technologies', items: expansionResearch, color: 'gold' }
	]);

	function formatTimeRemaining(completionAt: Date | string) {
		const end = new Date(completionAt).getTime();
		const diff = end - currentTime.getTime();
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

	function calculateProgress(startedAt: Date | string | null, completionAt: Date | string) {
		if (!startedAt) return 0;

		const now = currentTime.getTime();
		const start = new Date(startedAt).getTime();
		const end = new Date(completionAt).getTime();

		if (now >= end) return 100;
		if (now <= start) return 0;

		const total = end - start;
		const elapsed = now - start;
		return Math.round((elapsed / total) * 100);
	}

	function getResearchIcon(researchTypeId: number) {
		switch (researchTypeId) {
			case 1: return '⚡';
			case 2: return '🛡️';
			case 3: return '🚀';
			case 4: return '🕵️';
			case 5: return '🏗️';
			default: return '🔬';
		}
	}
</script>

<div class="px-6 py-8 pb-32">
	<div class="mb-10 flex items-center justify-between">
		<div>
			<h1 class="text-4xl font-black tracking-tighter text-white glow-blue">
				RESEARCH <span class="text-blue-500">LAB</span>
			</h1>
			<p class="text-sm font-medium tracking-wide text-gray-500 uppercase">Scientific Advancement Center</p>
		</div>
		
		{#if queue.length > 0}
			<div class="flex items-center space-x-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2">
				<span class="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
				<span class="text-xs font-bold text-blue-400 uppercase tracking-widest">{queue.length} Active Project{queue.length > 1 ? 's' : ''}</span>
			</div>
		{/if}
	</div>

	{#if !hasResearchLab}
		<div
			class="mb-8 overflow-hidden rounded-2xl border border-red-500/50 bg-red-500/5 p-6 backdrop-blur-md"
			in:fade
		>
			<div class="flex items-center space-x-4">
				<span class="text-3xl">⚠️</span>
				<div>
					<h3 class="font-bold text-red-400">Infrastructure Required</h3>
					<p class="text-sm text-red-200/80">
						You need a Research Lab to conduct research. <a
							href="/game"
							class="font-black text-white underline hover:no-underline"
							>Establish one in Facilities.</a
						>
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Research Queue -->
	{#if queue.length > 0}
		<div class="mb-12 space-y-4">
			<h2 class="text-xs font-black tracking-[0.2em] text-blue-400 uppercase">Ongoing Research</h2>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each queue as item (item.id)}
					<div 
						class="glass-panel group relative overflow-hidden rounded-2xl p-4 transition-all hover:border-blue-500/50 shadow-lg"
						in:fly={{ y: 20, duration: 400 }}
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-4">
								<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-2xl group-hover:bg-blue-500/20 transition-colors">
									{getResearchIcon(item.researchTypeId || 0)}
								</div>
								<div>
									<h4 class="font-bold text-white leading-tight">Level {item.level} Promotion</h4>
									<p class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
										{formatTimeRemaining(item.completionAt)}
									</p>
								</div>
							</div>
							<button
								onclick={() => handleCancel(item.id)}
								class="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
							>
								✕
							</button>
						</div>

						<!-- Progress HUD -->
						<div class="mt-4 space-y-2">
							<div class="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-tighter">
								<span>Completion</span>
								<span class="text-blue-400">{calculateProgress(item.startedAt, item.completionAt)}%</span>
							</div>
							<div class="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
								<div
									class="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all duration-1000"
									style="width: {calculateProgress(item.startedAt, item.completionAt)}%"
								></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Research Categories -->
	<div class="space-y-16">
		{#each categories as cat}
			{#if cat.items.length > 0}
				<section class="space-y-6" in:fade={{ delay: 200 }}>
					<div class="flex items-center space-x-4">
						<div class="h-2 w-2 rounded-full bg-{cat.color}-500 shadow-[0_0_10px_rgba(var(--color-accent-{cat.color}),0.5)]"></div>
						<h2 class="text-xl font-black tracking-tight text-white uppercase">{cat.name}</h2>
						<div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
					</div>

					<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each cat.items as tech (tech.id)}
							<div 
								class="glass-panel group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-white/20 active:translate-y-0 {!hasResearchLab ? 'opacity-40 grayscale pointer-events-none' : ''}"
							>
								<div>
									<div class="mb-4 flex items-center justify-between">
										<span class="text-3xl transition-transform group-hover:scale-110 duration-300">{tech.icon}</span>
										<div class="flex flex-col items-end">
											<span class="text-[10px] font-black tracking-widest text-blue-400 uppercase">Level</span>
											<span class="font-mono text-xl font-black text-white">{tech.level}</span>
										</div>
									</div>

									<h3 class="mb-1 text-lg font-black tracking-tight text-white group-hover:text-blue-400 transition-colors uppercase">{tech.name}</h3>
									<p class="mb-4 line-clamp-2 text-xs leading-relaxed text-gray-400 group-hover:text-gray-300 transition-colors">
										{tech.description}
									</p>

									<!-- Resources Grid -->
									<div class="mb-6 grid grid-cols-2 gap-2">
										{#if tech.cost.metal > 0}
											<div class="flex items-center justify-between rounded-lg bg-white/5 p-2 border border-white/5">
												<span class="text-[10px] font-bold text-gray-500 uppercase">M</span>
												<span class="font-mono text-[10px] font-bold {resources.metal < tech.cost.metal ? 'text-red-400' : 'text-gray-200'}">
													{tech.cost.metal.toLocaleString()}
												</span>
											</div>
										{/if}
										{#if tech.cost.crystal > 0}
											<div class="flex items-center justify-between rounded-lg bg-white/5 p-2 border border-white/5">
												<span class="text-[10px] font-bold text-blue-500 uppercase">C</span>
												<span class="font-mono text-[10px] font-bold {resources.crystal < tech.cost.crystal ? 'text-red-400' : 'text-blue-200'}">
													{tech.cost.crystal.toLocaleString()}
												</span>
											</div>
										{/if}
										{#if tech.cost.gas > 0}
											<div class="flex items-center justify-between rounded-lg bg-white/5 p-2 border border-white/5">
												<span class="text-[10px] font-bold text-purple-500 uppercase">G</span>
												<span class="font-mono text-[10px] font-bold {resources.gas < tech.cost.gas ? 'text-red-400' : 'text-purple-200'}">
													{tech.cost.gas.toLocaleString()}
												</span>
											</div>
										{/if}
									</div>
								</div>

								<button
									onclick={() => data.currentPlanet && handleResearch(tech.id, data.currentPlanet.id)}
									disabled={!hasResearchLab ||
										!tech.canResearch ||
										resources.metal < tech.cost.metal ||
										resources.crystal < tech.cost.crystal ||
										resources.gas < tech.cost.gas ||
										tech.isResearching ||
										loading[tech.id]}
									class="group/btn relative w-full overflow-hidden rounded-xl bg-blue-600 py-3 text-xs font-black tracking-widest text-white uppercase transition-all hover:bg-blue-500 disabled:bg-white/5 disabled:text-gray-600 disabled:pointer-events-none active:scale-[0.98]"
								>
									<div class="relative z-10 flex items-center justify-center space-x-2">
										{#if loading[tech.id]}
											<Spinner size="sm" />
										{:else if tech.isResearching}
											<span>In Progress</span>
										{:else}
											<span>Commence Level {tech.level + 1}</span>
										{/if}
									</div>
									<div class="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
								</button>
							</div>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</div>
</div>

<style>
	.glass-panel {
		background: rgba(13, 17, 23, 0.7);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.05);
	}
	
	.glow-blue {
		text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
	}
</style>
