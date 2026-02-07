<script lang="ts">
	import { page } from '$app/stores';
	import { fade, fly, scale } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { data } = $props();

	function prevSystem() {
		if (data.system > 1) return `/game/system?galaxy=${data.galaxy}&system=${data.system - 1}`;
		return '#';
	}

	function nextSystem() {
		if (data.system < 499) return `/game/system?galaxy=${data.galaxy}&system=${data.system + 1}`;
		return '#';
	}

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

	function getPlanetColor(slot: any) {
		if (slot.isNebula) return 'rgb(192, 38, 211)';
		if (slot.broodTarget) return 'rgb(239, 68, 68)';
		if (slot.planet) return 'rgb(59, 130, 246)';
		return 'rgb(71, 85, 105)';
	}
</script>

<div class="zenith-shell relative min-h-screen bg-[#020408] text-white selection:bg-blue-500/30">
	<!-- STAR-CHART BACKGROUND -->
	<div class="fixed inset-0 z-0 opacity-20 pointer-events-none">
		<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#0a1435_0%,transparent_70%)]"></div>
		<div class="star-grid absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
	</div>

	<div class="relative z-10 mx-auto max-w-[1800px] px-8 py-12 pb-44">
		<!-- PRECISION COMMAND RAIL -->
		{#if mounted}
		<header in:fade={{ duration: 1000 }} class="mb-24 flex flex-col items-center justify-between border-b border-white/5 pb-12 lg:flex-row">
			<div class="flex items-center gap-12">
				<div class="h-16 w-1 bg-blue-600 shadow-[0_0_20px_#2563eb]"></div>
				<div>
					<h1 class="text-5xl font-light tracking-[0.3em] uppercase text-white/90">
						ZENITH <span class="font-black text-blue-500">COMMAND</span>
					</h1>
					<p class="mt-2 text-[10px] font-bold uppercase tracking-[0.8em] text-white/20">Tactical Sector Matrix • V.4.0</p>
				</div>
			</div>

			<nav class="flex items-center gap-8 rounded-2xl bg-white/[0.02] p-2 ring-1 ring-white/5">
				<a href={prevSystem()} aria-label="Previous Sector" class="group flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-blue-600 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] {data.system <= 1 ? 'pointer-events-none opacity-10' : ''}">
					<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
				</a>

				<div class="flex flex-col items-center px-10">
					<span class="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Sector.Scan</span>
					<span class="font-mono text-4xl font-light tracking-tighter text-white">[{data.galaxy}:{data.system.toString().padStart(3, '0')}]</span>
				</div>

				<a href={nextSystem()} aria-label="Next Sector" class="group flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-blue-600 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] {data.system >= 499 ? 'pointer-events-none opacity-10' : ''}">
					<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
				</a>
			</nav>

			<div class="hidden lg:flex items-center gap-8 text-right">
				<div class="space-y-1">
					<div class="text-[8px] font-black uppercase tracking-widest text-blue-500">Signal Integrity</div>
					<div class="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
						<div class="h-full bg-blue-500 animate-pulse w-[94%]"></div>
					</div>
				</div>
				<div class="h-12 w-[1px] bg-white/10"></div>
				<div class="text-blue-500/40 font-mono text-xs">UTC: {new Date().toISOString().split('T')[1].slice(0, 8)}</div>
			</div>
		</header>
		{/if}

		<!-- OBSIDIAN TACTICAL GRID -->
		<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each data.slots as slot (slot.number)}
				<div
					in:fly={{ y: 30, duration: 600, delay: slot.number * 40 }}
					class="obsidian-card group relative flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent p-1 transition-all duration-500 hover:border-blue-500/50 hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)]"
				>
					<div class="relative flex h-full flex-col bg-[#040810] p-10 rounded-[1.4rem]">
						<!-- Precision Rim Lighting -->
						<div class="absolute inset-0 rounded-[1.4rem] ring-1 ring-inset ring-white/5 group-hover:ring-blue-500/30 transition-all"></div>
						
						<!-- DIAGNOSTIC HUD LAYER -->
						<div class="mb-10 flex items-center justify-between border-b border-white/5 pb-6">
							<div class="flex items-center gap-3">
								<div class="h-2 w-2 rounded-full" style="background: {getPlanetColor(slot)}; box-shadow: 0 0 10px {getPlanetColor(slot)}"></div>
								<span class="font-mono text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Node.{slot.number.toString().padStart(2, '0')}</span>
							</div>
							<div class="flex gap-1">
								<div class="h-3 w-[2px] bg-white/10"></div>
								<div class="h-3 w-[2px] bg-white/10 group-hover:bg-blue-500 transition-colors"></div>
								<div class="h-3 w-[2px] bg-white/10"></div>
							</div>
						</div>

						<!-- ENTITY VISUALIZER -->
						<div class="relative mb-12 flex aspect-square items-center justify-center p-8">
							<div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
							
							<div class="relative h-full w-full">
								{#if slot.isNebula}
									<div class="h-full w-full rounded-full bg-gradient-to-br from-purple-500/40 to-transparent blur-2xl animate-pulse"></div>
									<div class="absolute inset-0 flex items-center justify-center">
										<svg class="h-32 w-32 text-purple-400 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20M2 12a10 10 0 0 1 20 0"/></svg>
									</div>
								{:else if slot.broodTarget}
									<div class="h-full w-full rounded-full bg-gradient-to-br from-red-600/40 to-black blur-xl shadow-[inset_0_0_40px_rgba(239,68,68,0.2)]"></div>
									<div class="absolute inset-0 flex items-center justify-center">
										<div class="h-24 w-24 border border-red-500/40 rounded-full animate-ping"></div>
									</div>
								{:else}
									<div class="relative h-full w-full rounded-full border border-white/10 shadow-[inset_-20px_-20px_40px_rgba(0,0,0,0.8)] overflow-hidden {slot.planet ? '' : 'opacity-10 bg-white/5'}">
										{#if slot.planet}
											<div class="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-transparent to-black"></div>
											<div class="absolute top-4 left-4 h-full w-full rounded-full bg-blue-400/5 blur-3xl"></div>
										{/if}
									</div>
								{/if}
							</div>
						</div>

						<!-- SENSOR DATA -->
						<div class="flex-1 space-y-6">
							{#if slot.isNebula}
								<h3 class="text-2xl font-light tracking-widest text-white uppercase">Flux Anomaly</h3>
								<div class="flex items-center gap-4 text-[10px] font-mono text-purple-400/60 uppercase">
									<span>Magnitude: 0.84</span>
									<span class="h-1 w-1 rounded-full bg-white/20"></span>
									<span>Class: Nebular</span>
								</div>
							{:else if slot.broodTarget}
								<h3 class="text-2xl font-black tracking-widest text-red-500 uppercase">Hive.Signature</h3>
								<div class="flex items-center gap-4 text-[10px] font-mono text-red-400/60 uppercase">
									<span class="animate-pulse">Active Threat Detected</span>
								</div>
							{:else if slot.planet}
								<h3 class="text-2xl font-bold tracking-widest text-white uppercase">{slot.planet.name}</h3>
								<div class="flex flex-col gap-2">
									<div class="flex items-center gap-4 text-[10px] font-mono text-blue-400/60 uppercase">
										<span>Type: Terrestrial</span>
										<span class="h-1 w-1 rounded-full bg-white/20"></span>
										<span>Sync: Stable</span>
									</div>
									<p class="text-[11px] font-medium text-white/30 uppercase tracking-[0.3em]">{slot.planet.username || 'System Scanned'}</p>
								</div>
							{:else}
								<h3 class="text-2xl font-light tracking-widest text-white/10 uppercase">Void Slot</h3>
								<p class="text-[10px] font-mono text-white/5 uppercase">No Signal detected</p>
							{/if}

							<!-- PRECISION TELEMETRY -->
							<div class="mt-8 grid grid-cols-2 gap-4 border-t border-white/5 pt-6 group-hover:border-blue-500/20 transition-colors">
								<div class="space-y-1">
									<p class="text-[7px] font-bold uppercase tracking-widest text-white/20">Coordinates</p>
									<p class="font-mono text-[9px] text-white/40">0x{slot.number.toString(16).toUpperCase().padStart(2, '0')}</p>
								</div>
								<div class="space-y-1 text-right">
									<p class="text-[7px] font-bold uppercase tracking-widest text-white/20">Diagnostic</p>
									<p class="font-mono text-[9px] text-blue-500/40">READY</p>
								</div>
							</div>
						</div>

						<!-- COMMAND INTERFACE RAIL -->
						<div class="mt-10 flex border-t border-white/5 pt-8 gap-4">
							{#if slot.isNebula}
								<a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet=16&mission=expedition" class="zenith-btn flex-1 bg-purple-600/10 text-purple-400 border border-purple-500/20 hover:bg-purple-600 hover:text-white">
									EXPEDITION.EXE
								</a>
							{:else if slot.broodTarget}
								<a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=brood_raid" class="zenith-btn flex-1 bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white">
									TERMINATE.EXE
								</a>
							{:else if slot.planet}
								{#if slot.planet.userId !== $page.data.user.id}
									<a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=attack" class="zenith-btn-sq flex-1 bg-red-600/5 text-red-500 border border-red-500/10 hover:bg-red-600 hover:text-white" title="Siege">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
									</a>
									<a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=espionage" class="zenith-btn-sq flex-1 bg-blue-600/5 text-blue-400 border border-blue-500/10 hover:bg-blue-600 hover:text-white" title="Intel">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
									</a>
								{:else}
									<div class="flex-1 rounded-xl border border-blue-600/20 bg-blue-600/5 py-4 text-center">
										<span class="text-[9px] font-black uppercase tracking-[0.4em] text-blue-500/60">Imperial Domain</span>
									</div>
								{/if}
							{:else}
								<a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=colonize" class="zenith-btn flex-1 bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95">
									COLONIZE.EXE
								</a>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.zenith-shell { scroll-behavior: smooth; }
	.star-grid { background-size: 400px; }

	.obsidian-card {
		transform-style: preserve-3d;
		perspective: 1000px;
	}

	.zenith-btn {
		display: flex; height: 56px; align-items: center; justify-content: center;
		border-radius: 0.75rem; font-size: 10px; font-weight: 800; letter-spacing: 0.2em;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.zenith-btn-sq {
		display: flex; height: 56px; align-items: center; justify-content: center;
		border-radius: 0.75rem; border-width: 1px;
		transition: all 0.4s;
	}

	@keyframes pulse-slow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
	.animate-pulse-slow { animation: pulse-slow 3s infinite; }
</style>
