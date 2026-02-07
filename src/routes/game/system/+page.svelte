<script lang="ts">
	import { page } from '$app/stores';
	import { fade, fly, slide } from 'svelte/transition';
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
	let mouseX = $state(0);
	let mouseY = $state(0);

	onMount(() => {
		mounted = true;
		const handleMouseMove = (e: MouseEvent) => {
			mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
			mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
		};
		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	});

	const telemetryStrings = [
		"CORE: OPTIMAL", "SIG: STABLE", "ANOMALY: 0.04%", "WARP: READY",
		"SCAN: ACTIVE", "BIO: TRACE", "HEAT: LOW", "FLUX: STABLE"
	];
</script>

<!-- SVG Filters for Living Holograms -->
<svg class="pointer-events-none fixed h-0 w-0 overflow-hidden" aria-hidden="true">
	<filter id="hologram-distortion">
		<feTurbulence type="fractalNoise" baseFrequency="0.01 0.1" numOctaves="3" result="noise" seed="1">
			<animate attributeName="seed" from="1" to="100" dur="10s" repeatCount="indefinite" />
		</feTurbulence>
		<feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
	</filter>
	<filter id="glow-edge">
		<feGaussianBlur stdDeviation="1" result="blur" />
		<feComposite in="SourceGraphic" in2="blur" operator="over" />
	</filter>
</svg>

<div class="imperium-bridge relative min-h-screen overflow-hidden bg-[#010204] text-white selection:bg-blue-500/50">
	<!-- PARALLAX LAYERS -->
	<div class="parallax-floor fixed inset-0 z-0 pointer-events-none">
		<!-- Layer 0: Deep Space -->
		<div class="absolute inset-0 bg-[#010204]"></div>
		<!-- Layer 1: Nebula Drift -->
		<div class="nebula-layer absolute inset-[-10%] opacity-40" style="transform: translate({mouseX * 0.5}px, {mouseY * 0.5}px)"></div>
		<!-- Layer 2: Grid Projection -->
		<div class="tactical-mesh absolute inset-[-20%] opacity-15" style="transform: perspective(1000px) rotateX(60deg) translate({mouseX}px, {mouseY}px)"></div>
	</div>

	<!-- SCANLINE OVERLAY -->
	<div class="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,45,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[size:100%_4px] opacity-20"></div>

	<div class="relative z-10 mx-auto max-w-[1600px] px-6 py-12 pb-40">
		<!-- WARP CORE HEADER -->
		{#if mounted}
		<header in:fade={{ duration: 1000 }} class="relative mb-24 flex flex-col items-center justify-between gap-12 lg:flex-row">
			<div class="flex items-center gap-8">
				<div class="relative h-24 w-1 bg-blue-500/40 shadow-[0_0_20px_#3b82f6]">
					<div class="absolute inset-x-0 h-1/3 bg-blue-400 animate-warp-pulse"></div>
				</div>
				<div>
					<h1 class="text-7xl font-black italic tracking-tighter uppercase text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
						EMPEROR'S <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">EYE</span>
					</h1>
					<div class="mt-2 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.8em] text-blue-500/80">
						<span>Bridge Command Console</span>
						<span class="h-1 w-1 rounded-full bg-blue-500 animate-flicker"></span>
						<span>Sector Analysis</span>
					</div>
				</div>
			</div>

			<nav class="group relative flex items-center gap-12 px-12 py-4 rounded-full border border-white/5 bg-white/[0.01] backdrop-blur-3xl">
				<div class="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/10 via-transparent to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
				
				<a href={prevSystem()} aria-label="Previous System" class="nav-trigger group/nav {data.system <= 1 ? 'pointer-events-none opacity-10' : ''}">
					<svg class="h-12 w-12 text-blue-500 transition-all group-hover/nav:scale-125 group-hover/nav:-translate-x-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
				</a>

				<div class="relative text-center">
					<span class="text-[9px] font-black uppercase tracking-[0.4em] text-blue-400/60 block mb-1">Target Coordinates</span>
					<span class="font-mono text-5xl font-black italic text-white glow-text">[{data.galaxy}:{data.system.toString().padStart(3, '0')}]</span>
				</div>

				<a href={nextSystem()} aria-label="Next System" class="nav-trigger group/nav {data.system >= 499 ? 'pointer-events-none opacity-10' : ''}">
					<svg class="h-12 w-12 text-blue-500 transition-all group-hover/nav:scale-125 group-hover/nav:translate-x-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
				</a>
			</nav>
		</header>
		{/if}

		<!-- 3D TACTICAL FLOOR -->
		<div class="tactical-grid-perspective grid gap-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each data.slots as slot (slot.number)}
				<div
					in:fly={{ y: 50, duration: 800, delay: slot.number * 50 }}
					class="diagnostic-well group relative flex flex-col justify-between overflow-hidden rounded-[4rem] border border-white/5 p-12 transition-all hover:border-blue-500/30"
				>
					<!-- LIVING HOLOGRAM INTERFACE -->
					<div class="hologram-layer absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
						<div class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
						<div class="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
					</div>

					<!-- Visual Projection -->
					<div class="relative mb-12 flex aspect-square items-center justify-center">
						<!-- Orbital Telemetry Rings -->
						<div class="absolute inset-0 rounded-full border border-blue-500/5 scale-[1.2] animate-spin-veryslow"></div>
						<div class="absolute inset-0 rounded-full border border-blue-500/10 scale-[1.1] animate-reverse-spin"></div>
						
						<!-- High-End 3D Visualizer -->
						<div class="relative h-48 w-48 transition-transform duration-700 group-hover:scale-110">
							{#if slot.isNebula}
								<div class="immersion-nebula h-full w-full rounded-full"></div>
								<div class="absolute inset-0 rounded-full border-2 border-purple-500/10 blur-xl animate-pulse"></div>
							{:else if slot.broodTarget}
								<div class="immersion-brood h-full w-full rounded-full border-4 border-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.2)]"></div>
								<div class="absolute -inset-4 flex items-center justify-center rotate-45">
									<div class="h-full w-full border-[2px] border-red-500/20 rounded-[45%] animate-spin-fast"></div>
								</div>
							{:else}
								<!-- Imperial-Class 3D Sphere -->
								<div class="imperial-sphere h-full w-full rounded-full {slot.planet ? 'opacity-100' : 'opacity-5 grayscale'}">
									{#if slot.planet}
										<div class="sphere-cloud absolute inset-0 rounded-full opacity-30 animate-drift"></div>
										<div class="absolute inset-0 rounded-full shadow-[inset_-30px_-30px_70px_rgba(0,0,0,0.9),0_0_20px_rgba(59,130,246,0.1)]"></div>
									{/if}
								</div>
							{/if}
						</div>

						<!-- Tactical Tag -->
						<div class="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl">
							<span class="font-mono text-[9px] font-black text-blue-400 uppercase tracking-widest">OBJ {slot.number.toString().padStart(2, '0')}</span>
						</div>
					</div>

					<!-- SENSOR DATA STRIP -->
					<div class="relative z-10">
						{#if slot.isNebula}
							<h3 class="text-3xl font-black italic tracking-tighter text-white uppercase mb-1 lining-nums">Cosmic Anomaly</h3>
							<p class="text-[10px] font-black text-purple-400 uppercase tracking-[0.4em] font-mono distortion-text">SIG: UNSTABLE</p>
						{:else if slot.broodTarget}
							<h3 class="text-3xl font-black italic tracking-tighter text-white uppercase mb-1 lining-nums">Hostile Hive L{slot.broodTarget.level}</h3>
							<p class="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] font-mono animate-pulse">Threat Level: MAX</p>
						{:else if slot.planet}
							<h3 class="text-3xl font-black italic tracking-tighter text-white uppercase mb-1 lining-nums">{slot.planet.name}</h3>
							<div class="flex items-center gap-2">
								<span class="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
								<p class="text-[10px] font-black text-blue-300/60 uppercase tracking-[0.4em] font-mono">{slot.planet.username || 'Scanning...'}</p>
							</div>
						{:else}
							<h3 class="text-3xl font-black italic tracking-tighter text-gray-800 uppercase mb-1 lining-nums">Silent Abyss</h3>
							<p class="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] font-mono">Vacuum Detected</p>
						{/if}

						<!-- ADVANCED TELEMETRY -->
						<div class="mt-8 grid grid-cols-2 gap-4 border-t border-white/5 pt-6 opacity-30 group-hover:opacity-100 transition-opacity duration-500">
							<div class="flex flex-col">
								<span class="text-[7px] font-black uppercase text-gray-500 tracking-tighter">Diagnostic</span>
								<span class="text-[9px] font-black text-blue-200 uppercase font-mono">{telemetryStrings[slot.number % 8]}</span>
							</div>
							<div class="flex flex-col text-right">
								<span class="text-[7px] font-black uppercase text-gray-500 tracking-tighter">Coord-Hex</span>
								<span class="text-[9px] font-black text-blue-200 uppercase font-mono">0x{slot.number.toString(16).padStart(2, '0')}</span>
							</div>
						</div>
					</div>

					<!-- ACTION INTERFACE -->
					<div class="mt-10 flex gap-4">
						{#if slot.isNebula}
							<a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet=16&mission=expedition" class="action-btn-god flex-1 bg-purple-600/20 text-purple-400 border-purple-500/20 hover:bg-purple-600 hover:text-white">
								<span>INITIATE EXPEDITION</span>
							</a>
						{:else if slot.broodTarget}
							<a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=brood_raid" class="action-btn-god flex-1 bg-red-600 border-red-500/30 text-white hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
								<span>ERADICATE HIVE</span>
							</a>
						{:else if slot.planet}
							{#if slot.planet.userId !== $page.data.user.id}
								<a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=attack" class="action-btn-sq bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white" title="Siege">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 4 20 9.5c.6.6.6 1.4 0 2L10.5 21H4v-6.5L14.5 4Z"/></svg>
								</a>
								<a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=espionage" class="action-btn-sq bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white" title="Intel">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
								</a>
							{:else}
								<div class="owned-tag flex-1 flex items-center justify-center rounded-3xl border border-blue-500/30 bg-blue-500/5">
									<span class="text-[9px] font-black uppercase tracking-[0.3em] text-blue-500 animate-flicker">Imperial Stronghold</span>
								</div>
							{/if}
						{:else}
							<a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=colonize" class="action-btn-god flex-1 bg-blue-600 border-blue-500/30 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
								<span>ESTABLISH COLONY</span>
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	/* EMPIRE BRIDGE STYLING */
	.parallax-floor { background: #010204; }
	
	.nebula-layer {
		background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 60%);
		filter: blur(100px);
		animation: nebula-float 40s linear infinite;
	}

	.tactical-mesh {
		background: 
			linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
			linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
		background-size: 80px 80px;
	}

	@keyframes nebula-float { 
		0%, 100% { transform: scale(1) translate(0,0); }
		50% { transform: scale(1.2) translate(5%, 5%); }
	}

	.tactical-grid-perspective {
		perspective: 2000px;
		transform-style: preserve-3d;
	}

	.diagnostic-well {
		background: rgba(4, 6, 12, 0.8);
		backdrop-filter: blur(40px);
		transform: rotateX(5deg);
		transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
	}
	.diagnostic-well:hover {
		transform: rotateX(0deg) scale(1.05) translateY(-20px);
		background: rgba(8, 12, 24, 0.9);
	}

	/* GOD-TIER SPHERES */
	.imperial-sphere {
		background: radial-gradient(circle at 30% 30%, #4facfe, #00f2fe, #2e1065, black);
		transform-style: preserve-3d;
	}
	.sphere-cloud {
		background: url('https://www.transparenttextures.com/patterns/clouds-flat.png');
		filter: brightness(2) contrast(1.5) opacity(0.3);
		mix-blend-mode: soft-light;
	}

	.immersion-nebula {
		background: radial-gradient(circle at 40% 40%, rgba(217, 70, 239, 0.8), #701a75, transparent);
		filter: blur(15px);
		animation: morph 6s infinite alternate;
	}

	.immersion-brood {
		background: radial-gradient(circle at 50% 50%, #f43f5e, #9f1239, black);
		filter: url('#hologram-distortion') blur(1px);
	}

	.distortion-text { filter: url('#hologram-distortion'); }

	/* COMMAND INTERFACE */
	.action-btn-god {
		display: flex; height: 64px; align-items: center; justify-content: center; 
		border-radius: 2rem; border-width: 2px;
		font-size: 10px; font-weight: 900; letter-spacing: 0.2em;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.action-btn-sq {
		display: flex; height: 64px; width: 64px; align-items: center; justify-content: center;
		border-radius: 2rem; border-width: 2px; border-color: transparent;
		transition: all 0.4s;
	}

	.glow-text { text-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }

	@keyframes warp-pulse {
		0%, 100% { transform: translateY(-100%) scaleY(0.5); opacity: 0; }
		50% { transform: translateY(100%) scaleY(1); opacity: 1; }
	}
	.animate-warp-pulse { animation: warp-pulse 2s infinite linear; }

	@keyframes drift { from { background-position: 0 0; } to { background-position: 200% 200%; } }
	.animate-drift { animation: drift 120s linear infinite; }

	@keyframes spin-fast { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
	.animate-spin-fast { animation: spin-fast 1s linear infinite; }

	.animate-flicker { animation: flicker 0.15s infinite; }
	@keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }

	.animate-reverse-spin { animation: spin 20s linear infinite reverse; }
	@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
