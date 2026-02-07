<script lang="ts">
	import { page } from '$app/stores';
	import { fade, fly, slide } from 'svelte/transition';

	let { data } = $props();

	function prevSystem() {
		if (data.system > 1) return `/game/system?galaxy=${data.galaxy}&system=${data.system - 1}`;
		return '#';
	}

	function nextSystem() {
		if (data.system < 499) return `/game/system?galaxy=${data.galaxy}&system=${data.system + 1}`;
		return '#';
	}
</script>

<div class="relative min-h-screen overflow-hidden bg-[#05070a] text-gray-100">
	<!-- Cinematic Background -->
	<div class="fixed inset-0 z-0">
		<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,#1e1b4b_0%,#05070a_100%)]"></div>
		<div class="nebula-bg absolute inset-0 opacity-20"></div>
		<div class="absolute inset-0 bg-gradient-to-b from-[#05070a]/90 via-transparent to-[#05070a]"></div>
	</div>

	<div class="relative z-10 mx-auto max-w-7xl px-4 py-8 pb-32">
		<!-- Navigation Header -->
		<header class="mb-12 flex flex-col items-center justify-between gap-8 md:flex-row">
			<div class="text-center md:text-left">
				<h1 class="text-4xl font-black tracking-tighter text-white glow-blue uppercase">
					Tactical <span class="text-blue-500">Orrery</span>
				</h1>
				<p class="mt-1 text-[10px] font-black tracking-[0.4em] text-gray-500 uppercase">Sector Sensor Array • Active Scan</p>
			</div>

			<div class="glass-panel group flex items-center gap-6 rounded-3xl border border-white/10 p-2 px-8">
				<a
					href={prevSystem()}
					class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-xl transition-all hover:bg-blue-600 hover:text-white disabled:opacity-20 {data.system <= 1 ? 'pointer-events-none opacity-20' : ''}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
				</a>
				
				<div class="text-center">
					<div class="text-[9px] font-black uppercase tracking-[0.3em] text-blue-500/60">Galaxy {data.galaxy}</div>
					<div class="font-mono text-3xl font-black text-white">System {data.system}</div>
				</div>

				<a
					href={nextSystem()}
					class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-xl transition-all hover:bg-blue-600 hover:text-white disabled:opacity-20 {data.system >= 499 ? 'pointer-events-none opacity-20' : ''}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
				</a>
			</div>
		</header>

		<!-- System Grid / Sensor Cards -->
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each data.slots as slot (slot.number)}
				<div
					in:fly={{ y: 20, duration: 400, delay: slot.number * 30 }}
					class="glass-panel group relative flex flex-col items-center justify-between overflow-hidden rounded-[2.5rem] border border-white/5 p-8 transition-all hover:border-blue-500/20"
				>
					<!-- Position Badge -->
					<div class="absolute top-4 left-6">
						<span class="font-mono text-[10px] font-black text-gray-700 uppercase tracking-widest leading-none">Pos {slot.number.toString().padStart(2, '0')}</span>
					</div>

					<!-- Tactical Projection -->
					<div class="relative my-6 flex h-32 w-32 items-center justify-center">
						<!-- Orbital Ring -->
						<div class="absolute inset-0 rounded-full border border-dashed border-white/5 animate-spin-slow"></div>
						
						{#if slot.isNebula}
							<div class="h-16 w-16 animate-pulse rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 shadow-[0_0_30px_rgba(236,72,153,0.5)]"></div>
							<div class="absolute h-20 w-20 rounded-full border border-purple-500/20 blur-sm animate-pulse"></div>
						{:else if slot.broodTarget}
							<div class="h-14 w-14 animate-pulse rounded-full bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]"></div>
							<div class="absolute -inset-2 border-2 border-red-500/10 border-t-red-500/40 rounded-full animate-spin"></div>
						{:else}
							<div class="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 shadow-[0_0_20px_rgba(59,130,246,0.3)] {slot.planet ? 'opacity-100' : 'opacity-10 grayscale'}"></div>
							{#if slot.planet}
								<div class="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)]"></div>
							{/if}
						{/if}
					</div>

					<!-- Telemetry -->
					<div class="text-center">
						{#if slot.isNebula}
							<h3 class="text-xl font-black text-purple-300 uppercase tracking-tight">Mysterious Nebula</h3>
							<p class="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">High-Entropy Anomaly</p>
						{:else if slot.broodTarget}
							<h3 class="text-xl font-black text-red-400 uppercase tracking-tight">Alien Brood L{slot.broodTarget.level}</h3>
							<p class="text-[9px] font-black text-red-500/60 uppercase tracking-widest mt-1">Hostile Signature Detected</p>
						{:else if slot.planet}
							<h3 class="text-xl font-black text-white uppercase tracking-tight">{slot.planet.name}</h3>
							<p class="text-[9px] font-black text-yellow-500/80 uppercase tracking-widest mt-1">{slot.planet.username || 'Unclaimed'}</p>
						{:else}
							<h3 class="text-xl font-black text-gray-700 uppercase tracking-tight">Empty Space</h3>
							<p class="text-[9px] font-black text-gray-800 uppercase tracking-widest mt-1">Silent Sector</p>
						{/if}
					</div>

					<!-- Action Command HUD -->
					<div class="mt-8 flex w-full items-center justify-center gap-3">
						{#if slot.isNebula}
							<a
								href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet=16&mission=expedition"
								class="flex h-12 flex-1 items-center justify-center gap-3 rounded-2xl bg-purple-900/20 text-[10px] font-black uppercase tracking-widest text-purple-400 border border-purple-500/20 transition-all hover:bg-purple-600 hover:text-white active:scale-95"
							>
								<span>Expedition</span>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
							</a>
						{:else if slot.broodTarget}
							<a
								href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=brood_raid"
								class="flex h-12 flex-1 items-center justify-center gap-3 rounded-2xl bg-red-900/20 text-[10px] font-black uppercase tracking-widest text-red-500 border border-red-500/20 transition-all hover:bg-red-600 hover:text-white active:scale-95"
							>
								<span>Raid Brood</span>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10h10V2z"/><path d="M22 12H12v10h10V12z"/><path d="M12 12H2v10h10V12z"/><path d="M22 2H12v10h10V2z"/></svg>
							</a>
						{:else if slot.planet}
							{#if slot.planet.userId !== $page.data.user.id}
								<a
									href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=attack"
									class="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-900/20 text-red-500 border border-red-500/20 transition-all hover:bg-red-600 hover:text-white active:scale-95"
									title="Attack"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4 20 9.5c.6.6.6 1.4 0 2L10.5 21H4v-6.5L14.5 4Z"/><path d="m11.5 7.5 5 5"/></svg>
								</a>
								<a
									href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=espionage"
									class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-900/20 text-blue-400 border border-blue-500/20 transition-all hover:bg-blue-600 hover:text-white active:scale-95"
									title="Espionage"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
								</a>
							{:else}
								<div class="h-12 w-full flex items-center justify-center rounded-2xl bg-green-500/5 border border-green-500/20">
									<span class="text-[10px] font-black text-green-500 uppercase tracking-widest">Imperial Presence</span>
								</div>
							{/if}
						{:else}
							<a
								href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=colonize"
								class="flex h-12 flex-1 items-center justify-center gap-3 rounded-2xl bg-green-900/20 text-[10px] font-black uppercase tracking-widest text-green-400 border border-green-500/20 transition-all hover:bg-green-600 hover:text-white active:scale-95"
							>
								<span>Establish Colony</span>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L4.5 9.22a8 8 0 0 0-2.5 5.78V21h15v-5.22a8 8 0 0 0-2.5-5.78L12 2z"/><path d="M22 21h-5v-6.5c0-1.5-1-2.5-2.5-2.5s-2.5 1-2.5 2.5V21"/></svg>
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>
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

	.nebula-bg {
		background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 60%);
		filter: blur(60px);
		animation: nebula-float 20s ease-in-out infinite alternate;
	}

	@keyframes nebula-float {
		from { transform: translate(-5%, -5%) scale(1); }
		to { transform: translate(5%, 5%) scale(1.1); }
	}

	.animate-spin-slow {
		animation: spin 10s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
