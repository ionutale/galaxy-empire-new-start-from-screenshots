<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { fade, fly, slide } from 'svelte/transition';
	import Spinner from '$lib/components/Spinner.svelte';

	let { data } = $props();

	interface Fleet {
		id: number;
		userId: number | null;
		originPlanetId: number | null;
		targetGalaxy: number | null;
		targetSystem: number | null;
		targetPlanet: number | null;
		mission: string | null;
		ships: unknown;
		resources: unknown;
		departureTime: Date | null;
		arrivalTime: Date | null;
		returnTime: Date | null;
		status: string | null;
		originGalaxy: number;
		originSystem: number;
		originPlanet: number;
	}

	let now = $state(Date.now());
	let interval: ReturnType<typeof setInterval> | undefined;
	let reloading = false;

	let extraFleets = $state<Fleet[]>([]);
	let loadingMore = $state(false);
	let hasMore = $state(true);

	let allFleets = $derived([...data.fleets, ...extraFleets]);

	onMount(() => {
		interval = setInterval(async () => {
			now = Date.now();
			if (!reloading) {
				const shouldReload = allFleets.some(
					(f: Fleet) => f.arrivalTime && new Date(f.arrivalTime).getTime() <= now
				);
				if (shouldReload) {
					reloading = true;
					await invalidateAll();
					extraFleets = [];
					hasMore = true;
					reloading = false;
				}
			}
		}, 1000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	async function loadMore() {
		if (loadingMore) return;
		loadingMore = true;
		try {
			const currentCount = allFleets.length;
			const res = await fetch(`/api/fleet/movements?offset=${currentCount}&limit=25`);
			if (res.ok) {
				const result = await res.json();
				if (result.fleets.length < 25) hasMore = false;
				if (result.fleets.length > 0) extraFleets.push(...result.fleets);
			}
		} catch (e) {
			console.error('Failed to load fleets', e);
		} finally {
			loadingMore = false;
		}
	}

	function getProgress(fleet: Fleet) {
		if (!fleet.departureTime || !fleet.arrivalTime) return 0;
		const start = new Date(fleet.departureTime).getTime();
		const end = new Date(fleet.arrivalTime).getTime();
		const total = end - start;
		if (total <= 0) return 100;
		const current = now - start;
		const pct = Math.max(0, Math.min(100, (current / total) * 100));
		if (fleet.status === 'returning') return 100 - pct;
		return pct;
	}

	function getRemainingTime(fleet: Fleet) {
		if (!fleet.arrivalTime) return '00:00:00';
		const end = new Date(fleet.arrivalTime).getTime();
		const diff = Math.max(0, end - now);
		const seconds = Math.floor((diff / 1000) % 60);
		const minutes = Math.floor((diff / (1000 * 60)) % 60);
		const hours = Math.floor(diff / (1000 * 60 * 60));
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}
</script>

<div class="relative min-h-screen overflow-hidden bg-[#05070a] text-gray-100">
	<!-- Tactical Background -->
	<div class="fixed inset-0 z-0">
		<img 
			src="/assets/generated/fleet_command_background_1770456832607.png" 
			alt="Command Bridge" 
			class="h-full w-full object-cover opacity-10 filter blur-[1px]"
		/>
		<div class="absolute inset-0 bg-gradient-to-b from-[#05070a]/90 via-transparent to-[#05070a]"></div>
	</div>

	<div class="relative z-10 mx-auto max-w-5xl px-4 py-8 pb-32">
		<!-- Header -->
		<header class="mb-10 flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-black tracking-tighter text-white glow-blue uppercase">
					Vessel <span class="text-blue-500">Tracking</span>
				</h1>
				<p class="mt-1 text-[10px] font-black tracking-[0.4em] text-gray-500 uppercase">Real-time Sector-wide Fleet Analysis</p>
			</div>
			
			<a
				href="/game/fleet"
				class="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-6 py-3 text-xs font-black tracking-widest text-gray-400 transition-all hover:bg-white/10 hover:text-white uppercase"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
				<span>Back</span>
			</a>
		</header>

		{#if allFleets.length === 0}
			<div in:fade class="glass-panel flex flex-col items-center justify-center rounded-[3rem] border border-white/5 p-20 text-center">
				<div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-500/5 text-5xl opacity-20">📡</div>
				<h3 class="text-xl font-black text-gray-500 uppercase tracking-widest">No Active Signatures</h3>
				<p class="mt-2 text-sm text-gray-700 uppercase tracking-wide">All local expeditionary forces are currently stationary.</p>
			</div>
		{:else}
			<div class="grid gap-6">
				{#each allFleets as fleet (fleet.id)}
					<div
						in:fly={{ y: 20, duration: 400 }}
						class="glass-panel group relative flex flex-col gap-8 overflow-hidden rounded-[2.5rem] border border-white/10 p-8 pt-10 transition-all hover:border-blue-500/20"
					>
                        <!-- Status Badge -->
                        <div class="absolute top-0 right-10">
                            <div class="rounded-b-2xl px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] shadow-lg {fleet.status === 'returning' ? 'bg-blue-600 text-white' : 'bg-yellow-500 text-black'}">
                                {fleet.status === 'returning' ? 'Enroute to Base' : fleet.mission}
                            </div>
                        </div>

						<div class="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
							<div class="space-y-6">
								<div class="flex items-center space-x-6">
									<div class="flex flex-col">
										<span class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Origin</span>
										<span class="font-mono text-xl font-black text-white">[{fleet.originGalaxy}:{fleet.originSystem}:{fleet.originPlanet}]</span>
									</div>
									<div class="h-px w-8 bg-white/10 mt-4"></div>
									<div class="flex flex-col">
										<span class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Target</span>
										<span class="font-mono text-xl font-black text-blue-400">[{fleet.targetGalaxy}:{fleet.targetSystem}:{fleet.targetPlanet}]</span>
									</div>
								</div>

                                <div class="flex flex-wrap gap-3">
                                    {#if typeof fleet.ships === 'object' && fleet.ships}
                                        {#each Object.entries(fleet.ships) as [type, count]}
                                            {#if count > 0}
                                                <div class="rounded-xl border border-white/5 bg-white/2 px-3 py-1.5 text-[9px] font-black uppercase tracking-tighter text-gray-400">
                                                    {count} <span class="text-gray-600">{type.replace(/_/g, ' ')}</span>
                                                </div>
                                            {/if}
                                        {/each}
                                    {/if}
                                </div>
							</div>

							<div class="text-right">
								<div class="mb-1 text-[9px] font-black tracking-widest text-gray-500 uppercase">Projected Arrival</div>
								<div class="font-mono text-2xl font-black text-white">
									{fleet.arrivalTime ? new Date(fleet.arrivalTime).toLocaleTimeString() : '---'}
								</div>
							</div>
						</div>

						<!-- Progress Visualization -->
						<div class="relative pt-6">
							<div class="relative h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
								<div
									class="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(34,211,238,0.5)]"
									style="width: {getProgress(fleet)}%"
								></div>
							</div>
                            
                            <!-- Detailed Telemetry -->
                            <div class="mt-6 flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <div class="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] animate-pulse"></div>
                                    <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Signal Stable</span>
                                </div>
                                <div class="flex items-center space-x-6">
                                    <div class="flex flex-col items-end">
                                        <span class="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">Remaining</span>
                                        <span class="font-mono text-2xl font-black text-blue-300 leading-none">{getRemainingTime(fleet)}</span>
                                    </div>
                                </div>
                            </div>
						</div>
					</div>
				{/each}
			</div>

			{#if hasMore && allFleets.length >= 25}
				<div class="mt-12 text-center">
					<button
						class="group relative overflow-hidden rounded-2xl bg-white/5 px-10 py-5 text-[10px] font-black tracking-widest text-white transition-all hover:bg-white/10 uppercase"
						onclick={loadMore}
						disabled={loadingMore}
					>
						{#if loadingMore}<Spinner size="sm" />{:else}Synchronize Archive{/if}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.glass-panel {
		background: rgba(13, 17, 23, 0.7);
		backdrop-filter: blur(24px);
	}
	
	.glow-blue {
		text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
	}
</style>
