<script lang="ts">
	import { fade, fly, slide } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { data } = $props();

	// Navigation logic
	function prevGalaxy() {
		if (data.galaxy > 1) return `/game/galaxy?galaxy=${data.galaxy - 1}`;
		return '#';
	}

	function nextGalaxy() {
		if (data.galaxy < 9) return `/game/galaxy?galaxy=${data.galaxy + 1}`;
		return '#';
	}

	// Constants for sectoring
	const SECTORS_PER_ROW = 50;
	const SYSTEMS_PER_GALAXY = 499;
	
	// Mobile UX: Sectoring (0-9, each 50 systems)
	let activeSector = $state(0);
	const sectorStart = $derived(activeSector * SECTORS_PER_ROW + 1);
	const sectorEnd = $derived(Math.min((activeSector + 1) * SECTORS_PER_ROW, SYSTEMS_PER_GALAXY));
	
	let filteredSystems = $derived(
		data.systems.slice(activeSector * SECTORS_PER_ROW, (activeSector + 1) * SECTORS_PER_ROW)
	);

	function getSystemStatus(system: { hasActivity: boolean; playerCount: number }) {
		if (!system.hasActivity) return 'empty';
		if (system.playerCount > 5) return 'high';
		if (system.playerCount > 2) return 'medium';
		return 'low';
	}

	function getStatusGlow(status: string) {
		const glows = {
			high: 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse',
			medium: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]',
			low: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]',
			empty: 'bg-white/10'
		};
		return glows[status as keyof typeof glows] || glows.empty;
	}

    let starfield: HTMLDivElement;
    onMount(() => {
        // Subtle parallax or star generation could go here
    });
</script>

<div class="relative min-h-screen overflow-hidden bg-[#05070a] text-gray-100">
	<!-- Cinematic Background -->
	<div class="fixed inset-0 z-0">
		<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,#05070a_100%)]"></div>
		<div class="stars-container absolute inset-0 opacity-30"></div>
		<div class="absolute inset-0 bg-gradient-to-b from-[#05070a]/90 via-transparent to-[#05070a]"></div>
	</div>

	<div class="relative z-10 mx-auto max-w-7xl px-4 py-8 pb-32">
		<!-- Navigation Header -->
		<header class="mb-12 flex flex-col items-center justify-between gap-8 md:flex-row">
			<div class="text-center md:text-left">
				<h1 class="text-5xl font-black tracking-tighter text-white uppercase italic">
					Universe <span class="text-blue-500 not-italic">Visualizer</span>
				</h1>
				<p class="mt-2 text-[10px] font-black tracking-[0.5em] text-gray-500 uppercase">Astro-navigation Interface • Mark IV</p>
			</div>

			<div class="glass-panel flex items-center bg-black/40 p-2 rounded-2xl border border-white/10">
				<a
					href={prevGalaxy()}
					aria-label="Previous Galaxy"
					class="flex h-12 w-14 items-center justify-center rounded-xl bg-white/5 text-xl transition-all hover:bg-blue-600 hover:text-white disabled:opacity-20 {data.galaxy <= 1 ? 'pointer-events-none opacity-20' : ''}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
				</a>
				
				<div class="px-10 text-center">
					<div class="text-[8px] font-black uppercase tracking-[0.3em] text-blue-500/60 mb-1">Galaxy Designation</div>
					<div class="font-mono text-4xl font-black text-white leading-none">{data.galaxy}</div>
				</div>

				<a
					href={nextGalaxy()}
					aria-label="Next Galaxy"
					class="flex h-12 w-14 items-center justify-center rounded-xl bg-white/5 text-xl transition-all hover:bg-blue-600 hover:text-white disabled:opacity-20 {data.galaxy >= 9 ? 'pointer-events-none opacity-20' : ''}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
				</a>
			</div>
		</header>

		<!-- Sub-Sector Navigation -->
		<div class="mb-12 flex flex-wrap justify-center gap-3">
			{#each Array(10) as _, i}
				<button
					onclick={() => activeSector = i}
					class="group relative overflow-hidden rounded-xl border px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all {activeSector === i ? 'border-blue-500 bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20 hover:text-white'}"
				>
					<span class="relative z-10 text-xs">Sector {i * 50 + 1}-{Math.min((i + 1) * 50, 499)}</span>
					{#if activeSector === i}
						<div class="absolute inset-x-0 bottom-0 h-1 bg-white/40"></div>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Galaxy Grid Interface -->
		<div in:fade={{ duration: 450 }} class="glass-panel relative overflow-hidden rounded-[3.5rem] border border-white/5 bg-black/20 p-12 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
			<div class="mb-12 flex items-center justify-between border-b border-white/5 pb-10">
				<div class="flex items-center space-x-4">
					<div class="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-pulse"></div>
					<h2 class="text-2xl font-black tracking-tight text-white uppercase italic">Sector Analysis: <span class="text-blue-500 not-italic">{sectorStart.toString().padStart(1, '0')} - {sectorEnd.toString().padStart(1, '0')}</span></h2>
				</div>

				<!-- Legend -->
				<div class="hidden items-center space-x-8 lg:flex">
					{#each ['empty', 'low', 'medium', 'high'] as status}
						<div class="flex items-center space-x-3 opacity-40 transition-all hover:opacity-100">
							<div class="h-2 w-2 rounded-full {getStatusGlow(status)}"></div>
							<span class="text-[9px] font-black uppercase tracking-[0.2em] text-white italic">{status} activity</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="grid grid-cols-5 gap-6 sm:grid-cols-10 lg:grid-cols-10">
				{#each filteredSystems as system (system.systemId)}
					<a
						href="/game/system?galaxy={data.galaxy}&system={system.systemId}"
						class="group relative aspect-square"
					>
						<!-- Star Node -->
						<div class="absolute inset-0 flex items-center justify-center">
							<div class="h-16 w-16 rounded-full border border-white/5 bg-white/[0.01] transition-all duration-700 group-hover:scale-125 group-hover:border-blue-500/30 group-hover:bg-blue-500/5 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]"></div>
							
							<!-- Core Particle -->
							<div class="absolute h-3 w-3 rounded-full transition-all duration-700 group-hover:scale-150 {getStatusGlow(getSystemStatus(system))}"></div>
						</div>

						<!-- Telemetry Label -->
						<div class="absolute inset-x-0 bottom-0 flex flex-col items-center">
							<span class="font-mono text-[10px] font-black text-gray-700 transition-colors group-hover:text-white leading-none tracking-tighter">{system.systemId.toString().padStart(3, '0')}</span>
							{#if system.playerCount > 0}
								<div class="mt-1 h-0.5 w-6 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse"></div>
							{/if}
						</div>

						<!-- Hover Data Card -->
						<div class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-4 -translate-x-1/2 scale-90 opacity-0 transition-all group-hover:translate-y-[-8px] group-hover:scale-100 group-hover:opacity-100">
							<div class="glass-panel w-32 rounded-2xl border border-white/10 p-3 text-center shadow-2xl">
								<div class="text-[9px] font-black uppercase tracking-widest text-blue-400">System Information</div>
								<div class="my-1 font-mono text-xs font-bold text-white">[{data.galaxy}:{system.systemId}]</div>
								<div class="grid grid-cols-2 gap-2 border-t border-white/5 pt-2">
									<div class="flex flex-col">
										<span class="text-[7px] font-black uppercase text-gray-500">Bodies</span>
										<span class="text-[10px] font-black text-white">{system.planetCount}</span>
									</div>
									<div class="flex flex-col">
										<span class="text-[7px] font-black uppercase text-gray-500">Signatures</span>
										<span class="text-[10px] font-black text-white">{system.playerCount}</span>
									</div>
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.glass-panel {
		background: rgba(13, 17, 23, 0.7);
		backdrop-filter: blur(24px);
	}
	
	.glow-blue {
		text-shadow: 0 0 30px rgba(59, 130, 246, 0.7);
	}
	
	.glow-text {
		text-shadow: 0 0 10px currentColor;
	}

	.stars-container {
		background-image: 
			radial-gradient(1px 1px at 25px 5px, white, transparent),
			radial-gradient(1px 1px at 50px 25px, white, transparent),
			radial-gradient(1px 1px at 125px 80px, white, transparent),
			radial-gradient(1.5px 1.5px at 50px 80px, white, transparent),
			radial-gradient(2px 2px at 15px 150px, white, transparent),
			radial-gradient(2px 2px at 150px 150px, white, transparent);
		background-size: 256px 256px;
		animation: drift 60s linear infinite;
	}

	@keyframes drift {
		from { background-position: 0 0; }
		to { background-position: 256px 256px; }
	}

	/* Sub-sector scroll on tiny screens */
	@media (max-width: 640px) {
		.hide-scrollbar::-webkit-scrollbar { display: none; }
		.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
	}
</style>
