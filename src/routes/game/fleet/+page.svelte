<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import Spinner from '$lib/components/Spinner.svelte';
	import { fade, fly, slide } from 'svelte/transition';

	let { data } = $props();

	const shipTypes = [
		{ id: 'light_fighter', name: 'Light Fighter', icon: '🚀', category: 'Combat' },
		{ id: 'heavy_fighter', name: 'Heavy Fighter', icon: '⚔️', category: 'Combat' },
		{ id: 'cruiser', name: 'Cruiser', icon: '🛸', category: 'Combat' },
		{ id: 'battleship', name: 'Battleship', icon: '🚢', category: 'Combat' },
		{ id: 'battle_cruiser', name: 'Battle Cruiser', icon: '🛡️', category: 'Combat' },
		{ id: 'bomber', name: 'Bomber', icon: '💣', category: 'Combat' },
		{ id: 'destroyer', name: 'Destroyer', icon: '⚡', category: 'Combat' },
		{ id: 'death_star', name: 'Death Star', icon: '💀', category: 'Combat' },
		{ id: 'small_cargo', name: 'Small Cargo', icon: '📦', category: 'Civilian' },
		{ id: 'large_cargo', name: 'Large Cargo', icon: '🚛', category: 'Civilian' },
		{ id: 'colony_ship', name: 'Colony Ship', icon: '🏘️', category: 'Civilian' },
		{ id: 'espionage_probe', name: 'Espionage Probe', icon: '👁️', category: 'Civilian' },
		{ id: 'recycler', name: 'Recycler', icon: '♻️', category: 'Civilian' }
	];

	// Wizard State
	let currentStep = $state(1); // 1: Ships, 2: Target, 3: Logistics

	// Reactive state for ship inputs
	let shipCounts = $state(Object.fromEntries(shipTypes.map((s) => [s.id, 0])));
	let ships = $derived(data.ships || {}) as Record<string, number>;

	// Resources
	let resourceMetal = $state(0);
	let resourceCrystal = $state(0);
	let resourceGas = $state(0);

	// Get query params for pre-filling
	let targetGalaxy = $state($page.url.searchParams.get('galaxy') || '1');
	let targetSystem = $state($page.url.searchParams.get('system') || '1');
	let targetPlanet = $state($page.url.searchParams.get('planet') || '');
	let targetMission = $state($page.url.searchParams.get('mission') || 'attack');

	// Set defaults from current planet if available
	$effect(() => {
		if (data.currentPlanet && !targetGalaxy) {
			targetGalaxy = data.currentPlanet.galaxyId.toString();
		}
		if (data.currentPlanet && !targetSystem) {
			targetSystem = data.currentPlanet.systemId.toString();
		}
	});

	let newTemplateName = $state('');
	let loading = $state(false);
	let deletingTemplate = $state<Record<string, boolean>>({});
	let savingTemplate = $state(false);

	// Movement calculation
	let movementInfo = $state<{
		distance: number;
		duration: number;
		durationFormatted: string;
		fleetSpeed: number;
		slowestShip: string;
		fuelConsumption: number;
		canReach: boolean;
		reason?: string;
	} | null>(null);
	let calculatingMovement = $state(false);

	// Calculate movement when inputs change
	$effect(() => {
		const hasShips = Object.values(shipCounts).some((count) => count > 0);
		const hasTarget = targetGalaxy && targetSystem && targetPlanet;

		if (hasShips && hasTarget) {
			calculateMovement();
		} else {
			movementInfo = null;
		}
	});

	async function calculateMovement() {
		if (calculatingMovement) return;
		calculatingMovement = true;

		try {
			const params = new URLSearchParams({
				fromGalaxy: data.currentPlanet.galaxyId.toString(),
				fromSystem: data.currentPlanet.systemId.toString(),
				fromPlanet: data.currentPlanet.planetNumber.toString(),
				toGalaxy: targetGalaxy.toString(),
				toSystem: targetSystem.toString(),
				toPlanet: targetPlanet.toString(),
				mission: targetMission
			});

			for (const [shipType, count] of Object.entries(shipCounts)) {
				if (count > 0) params.append(shipType, count.toString());
			}

			const response = await fetch(`/api/fleet/calculate?${params}`);
			if (response.ok) {
				movementInfo = await response.json();
			} else {
				movementInfo = null;
			}
		} catch (error) {
			console.error('Error calculating movement:', error);
			movementInfo = null;
		} finally {
			calculatingMovement = false;
		}
	}

	function toCamel(s: string) {
		return s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
	}

	function loadTemplate(template: { id: number; name: string; ships: Record<string, number> }) {
		for (const key in shipCounts) shipCounts[key] = 0;
		if (template.ships) {
			for (const [key, value] of Object.entries(template.ships)) {
				if (key in shipCounts) shipCounts[key] = Number(value);
			}
		}
	}

	async function handleDeleteTemplate(id: number) {
		deletingTemplate[id] = true;
		try {
			const response = await fetch('/api/fleet', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'deleteTemplate', id })
			});
			if (response.ok) await invalidateAll();
		} catch (error) {
			console.error('Error deleting template:', error);
		} finally {
			deletingTemplate[id] = false;
		}
	}

	async function handleCreateTemplate() {
		if (!newTemplateName) return;
		savingTemplate = true;
		const ships: Record<string, number> = {};
		for (const [id, count] of Object.entries(shipCounts)) {
			if (count > 0) ships[id] = count;
		}
		try {
			const response = await fetch('/api/fleet', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'createTemplate', name: newTemplateName, ships })
			});
			if (response.ok) {
				newTemplateName = '';
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error creating template:', error);
		} finally {
			savingTemplate = false;
		}
	}

	async function handleDispatch() {
		loading = true;
		const ships: Record<string, number> = {};
		for (const [id, count] of Object.entries(shipCounts)) {
			if (count > 0) ships[id] = count;
		}
		const resources = { metal: resourceMetal, crystal: resourceCrystal, gas: resourceGas };
		try {
			const response = await fetch('/api/fleet', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'dispatch',
					planetId: data.currentPlanet.id,
					galaxy: Number(targetGalaxy),
					system: Number(targetSystem),
					planet: Number(targetPlanet),
					mission: targetMission,
					ships,
					resources
				})
			});
			const result = await response.json();
			if (response.ok) {
				await invalidateAll();
				for (const key in shipCounts) shipCounts[key] = 0;
				currentStep = 1;
			} else {
				alert(result.error);
			}
		} catch (error) {
			console.error('Error dispatching fleet:', error);
		} finally {
			loading = false;
		}
	}

	function setMax(shipId: string) {
		const shipKey = toCamel(shipId);
		shipCounts[shipId] = ships[shipKey] || 0;
	}

	function clearAll() {
		for (const key in shipCounts) shipCounts[key] = 0;
	}

	const hasSelectedShips = $derived(Object.values(shipCounts).some(c => c > 0));
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

	<div class="relative z-10 mx-auto max-w-7xl px-4 py-8 pb-32">
		<!-- Header -->
		<header class="mb-10 flex flex-col items-center justify-between gap-6 md:flex-row">
			<div>
				<h1 class="text-4xl font-black tracking-tighter text-white glow-blue uppercase">
					Tactical <span class="text-blue-500">Command</span>
				</h1>
				<p class="mt-1 text-[10px] font-black tracking-[0.4em] text-gray-500 uppercase">Sector Expeditionary Force Dispatcher</p>
			</div>
			
			<div class="flex items-center space-x-4">
				<a
					href="/game/fleet/movements"
					class="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-500/5 px-6 py-3 text-xs font-black tracking-widest text-blue-400 transition-all hover:bg-blue-500/10 active:scale-95 uppercase"
				>
					<span class="relative z-10">📡 Live Movements</span>
					<span class="relative z-10 rounded-full bg-blue-500/20 px-2 py-0.5 text-blue-300">{data.activeFleetsCount}</span>
					<div class="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
				</a>
			</div>
		</header>

		<!-- Progress Wizard -->
		<div class="mb-12 flex items-center justify-center">
			<div class="flex items-center space-x-4 md:space-x-12">
				{#each [1, 2, 3] as step}
					<div class="flex items-center">
						<button 
							onclick={() => step < currentStep && (currentStep = step)}
							disabled={step > currentStep}
							class="flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-300 {currentStep === step ? 'border-blue-500 bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-110' : step < currentStep ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-white/5 bg-white/5 text-gray-600'}"
						>
							{#if step < currentStep}✓{:else}{step}{/if}
						</button>
						<span class="ml-3 hidden text-[10px] font-black uppercase tracking-widest md:block {currentStep === step ? 'text-white' : 'text-gray-600'}">
							{step === 1 ? 'Fleet Selection' : step === 2 ? 'Mission Target' : 'Logistics'}
						</span>
						{#if step < 3}
							<div class="ml-4 h-px w-8 md:w-16 bg-white/10"></div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Main Content Area -->
		<div class="relative min-h-[400px]">
			{#if currentStep === 1}
				<div in:fade={{ duration: 300 }}>
					<!-- Templates Bar -->
					{#if data.templates && data.templates.length > 0}
						<div class="mb-8" in:slide>
							<div class="flex items-center space-x-3 mb-4">
								<div class="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
								<h3 class="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Fleet Templates</h3>
							</div>
							<div class="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
								{#each data.templates as template (template.id)}
									<div class="glass-panel group relative flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-white/5 p-4 transition-all hover:border-blue-500/30">
										<button 
											onclick={() => loadTemplate(template)}
											class="text-left"
										>
											<div class="text-sm font-black text-white group-hover:text-blue-400 transition-colors uppercase truncate max-w-[120px]">{template.name}</div>
											<div class="mt-1 flex items-center space-x-2">
												<span class="text-[9px] text-gray-500 uppercase">Configured</span>
											</div>
										</button>
										<button
											onclick={() => handleDeleteTemplate(template.id)}
											disabled={deletingTemplate[template.id]}
											class="h-7 w-7 rounded-xl bg-white/5 text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-all"
										>
											{#if deletingTemplate[template.id]}<Spinner size="sm" />{:else}✕{/if}
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Ship Selection Grid -->
					<div class="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each shipTypes as ship (ship.id)}
							{@const shipKey = toCamel(ship.id)}
							{@const available = ships[shipKey] || 0}
							{#if available > 0}
								<div class="glass-panel group relative overflow-hidden rounded-3xl border border-white/5 p-5 transition-all hover:border-blue-500/20 {shipCounts[ship.id] > 0 ? 'ring-1 ring-blue-500/50' : ''}">
									<div class="mb-4 flex items-start justify-between">
										<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-2xl group-hover:scale-110 transition-transform">
											{ship.icon}
										</div>
										<button 
											onclick={() => setMax(ship.id)}
											class="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-white transition-colors"
										>
											Max: {available}
										</button>
									</div>
									<h4 class="text-lg font-black text-white uppercase tracking-tighter leading-none">{ship.name}</h4>
									<div class="mt-6 flex items-center space-x-3">
										<input
											type="number"
											bind:value={shipCounts[ship.id]}
											min="0"
											max={available}
											class="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-center font-mono text-xl font-black text-blue-400 focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700"
											placeholder="0"
										/>
									</div>
									{#if shipCounts[ship.id] > 0}
										<div class="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
									{/if}
								</div>
							{/if}
						{/each}
					</div>

					<!-- Wizard Footer Step 1 -->
					<div class="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#05070a]/80 p-6 backdrop-blur-xl md:relative md:block md:bg-transparent md:border-none md:p-0">
						<div class="mx-auto flex max-w-7xl items-center justify-between">
							<button 
								onclick={clearAll}
								class="text-xs font-black text-gray-500 uppercase tracking-widest hover:text-red-400 transition-colors"
							>
								Reset Selection
							</button>
							<button 
								onclick={() => currentStep = 2}
								disabled={!hasSelectedShips}
								class="flex items-center space-x-4 rounded-2xl bg-blue-600 px-10 py-4 text-xs font-black tracking-widest text-white transition-all hover:bg-blue-500 active:scale-95 disabled:bg-white/5 disabled:text-gray-600 uppercase"
							>
								<span>Set Mission Parameters</span>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
							</button>
						</div>
					</div>
				</div>
			{/if}

			{#if currentStep === 2}
				<div in:fly={{ x: 50, duration: 400 }} class="flex flex-col items-center">
					<div class="w-full max-w-2xl space-y-10">
						<!-- Tactical Grid Selector -->
						<div class="glass-panel overflow-hidden rounded-[2.5rem] border border-white/10 p-10">
							<div class="mb-8 flex items-center space-x-4">
								<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-xl">📍</div>
								<div>
									<h2 class="text-xl font-black text-white uppercase tracking-tight">Deployment Coordinates</h2>
									<p class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Sector Designation</p>
								</div>
							</div>

							<div class="grid grid-cols-3 gap-6">
								<div class="space-y-2">
									<label class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Galaxy</label>
									<input
										type="number"
										bind:value={targetGalaxy}
										class="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-center font-mono text-2xl font-black text-white outline-none focus:border-blue-500 transition-all"
									/>
								</div>
								<div class="space-y-2">
									<label class="text-[9px] font-black text-gray-500 uppercase tracking-widest">System</label>
									<input
										type="number"
										bind:value={targetSystem}
										class="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-center font-mono text-2xl font-black text-white outline-none focus:border-blue-500 transition-all"
									/>
								</div>
								<div class="space-y-2">
									<label class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Planet</label>
									<input
										type="number"
										bind:value={targetPlanet}
										placeholder="1-15"
										class="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-center font-mono text-2xl font-black text-white outline-none focus:border-blue-500 transition-all placeholder:text-gray-800"
									/>
								</div>
							</div>
						</div>

						<!-- Mission Objective -->
						<div class="glass-panel overflow-hidden rounded-[2.5rem] border border-white/10 p-10">
							<div class="mb-8 flex items-center space-x-4">
								<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-xl">🎯</div>
								<div>
									<h2 class="text-xl font-black text-white uppercase tracking-tight">Mission Objective</h2>
									<p class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Strategic Authority Selection</p>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
								{#each ['attack', 'transport', 'deploy', 'espionage', 'colonize', 'expedition'] as mission}
									<button 
										onclick={() => targetMission = mission}
										class="group relative flex flex-col items-center justify-center rounded-2xl border p-4 transition-all duration-300 {targetMission === mission ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-white/5 bg-white/2 hover:border-white/10'}"
									>
										{#if targetMission === mission}
											<div class="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-purple-400"></div>
										{/if}
										<div class="mb-2 text-xl filter grayscale group-hover:grayscale-0 transition-all {targetMission === mission ? 'grayscale-0' : ''}">
											{#if mission === 'attack'}🗡️
											{:else if mission === 'transport'}📦
											{:else if mission === 'deploy'}🛡️
											{:else if mission === 'espionage'}👁️
											{:else if mission === 'colonize'}🏘️
											{:else if mission === 'expedition'}🚀
											{/if}
										</div>
										<span class="text-[10px] font-black uppercase tracking-widest {targetMission === mission ? 'text-white' : 'text-gray-500'}">{mission}</span>
									</button>
								{/each}
							</div>
						</div>

						<div class="flex items-center justify-between pt-4">
							<button 
								onclick={() => currentStep = 1}
								class="flex items-center space-x-4 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
								<span>Modify Fleet</span>
							</button>
							<button 
								onclick={() => currentStep = 3}
								disabled={!targetPlanet}
								class="flex items-center space-x-4 rounded-2xl bg-blue-600 px-10 py-4 text-xs font-black tracking-widest text-white transition-all hover:bg-blue-500 active:scale-95 disabled:bg-white/5 disabled:text-gray-600 uppercase"
							>
								<span>Initialize Logistics</span>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
							</button>
						</div>
					</div>
				</div>
			{/if}

			{#if currentStep === 3}
				<div class="grid gap-10 lg:grid-cols-2">
					<!-- Flight Telemetry -->
					<section class="space-y-8">
						<div class="glass-panel overflow-hidden rounded-[2.5rem] border border-white/5 p-10 bg-gradient-to-br from-blue-500/5 to-transparent">
							<div class="mb-10 flex items-center justify-between">
								<div class="flex items-center space-x-4">
									<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl">📡</div>
									<div>
										<h2 class="text-2xl font-black text-white uppercase tracking-tighter">Tactical Link</h2>
										<p class="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Real-time Telemetry Acquisition</p>
									</div>
								</div>
								{#if calculatingMovement}
									<div class="flex items-center space-x-3 text-cyan-500 animate-pulse">
										<Spinner size="sm" />
										<span class="text-[10px] font-black uppercase tracking-widest">Syncing</span>
									</div>
								{/if}
							</div>

							{#if movementInfo}
								<div class="grid grid-cols-2 gap-8">
									<div class="space-y-1">
										<p class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Enroute Time</p>
										<p class="font-mono text-2xl font-black text-white">{movementInfo.durationFormatted}</p>
									</div>
									<div class="space-y-1">
										<p class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fuel Consumption</p>
										<p class="font-mono text-2xl font-black text-yellow-500">{movementInfo.fuelConsumption.toLocaleString()} <span class="text-xs uppercase">gas</span></p>
									</div>
									<div class="space-y-1">
										<p class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Distance</p>
										<p class="font-mono text-xl font-black text-white/60">{movementInfo.distance.toLocaleString()} <span class="text-[10px] uppercase">units</span></p>
									</div>
									<div class="space-y-1">
										<p class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Formation Speed</p>
										<p class="font-mono text-xl font-black text-white/60">{movementInfo.fleetSpeed.toLocaleString()}</p>
									</div>
								</div>

								{#if !movementInfo.canReach}
									<div class="mt-8 overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-center">
										<span class="text-[11px] font-black text-red-500 uppercase tracking-widest leading-none">⚠️ {movementInfo.reason}</span>
									</div>
								{:else}
									<div class="mt-10 flex items-center space-x-4 rounded-3xl bg-[#0a0f18] p-5 border border-white/5">
										<div class="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.4)]"></div>
										<p class="text-xs font-black text-gray-400 uppercase tracking-wide leading-relaxed">
											Formation synchronized. Slowest vessel: <span class="text-white">{movementInfo.slowestShip?.replace(/_/g, ' ') || 'N/A'}</span>. Fuel reserve verified.
										</p>
									</div>
								{/if}
							{:else}
								<div class="flex h-48 flex-col items-center justify-center text-gray-500">
									<span class="text-4xl opacity-20">📡</span>
									<span class="mt-4 text-[10px] font-black uppercase tracking-widest text-blue-400/50">Calculating Strategic Parameters...</span>
								</div>
							{/if}
						</div>

						<!-- Template Saving -->
						<div class="glass-panel overflow-hidden rounded-[2.5rem] border border-white/5 p-8 bg-white/2">
							<div class="flex flex-col gap-6 sm:flex-row sm:items-center">
								<div class="flex-1">
									<h4 class="text-xs font-black text-gray-400 uppercase tracking-widest">Protocol Memory</h4>
									<p class="text-[10px] text-gray-600 mt-1">Archive this vessel configuration for rapid future deployment.</p>
								</div>
								<div class="flex items-center gap-2">
									<input
										type="text"
										bind:value={newTemplateName}
										placeholder="Protocol ID"
										class="w-40 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white outline-none focus:border-blue-500 transition-all placeholder:text-gray-800"
									/>
									<button
										onclick={handleCreateTemplate}
										disabled={savingTemplate || !newTemplateName}
										class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all disabled:opacity-30 disabled:grayscale"
									>
										{#if savingTemplate}<Spinner size="sm" />{:else}💾{/if}
									</button>
								</div>
							</div>
						</div>
					</section>

					<!-- Strategic Payload -->
					<section class="space-y-10">
						<div class="glass-panel overflow-hidden rounded-[2.5rem] border border-white/10 p-10">
							<div class="mb-10 flex items-center space-x-4">
								<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-xl">📦</div>
								<div>
									<h2 class="text-xl font-black text-white uppercase tracking-tight">Cargo Loadout</h2>
									<p class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Payload Distribution & Logistics</p>
								</div>
							</div>

							<div class="grid gap-6">
								<div class="relative rounded-3xl border border-white/5 bg-white/2 p-6 transition-all hover:bg-white/5">
									<div class="flex items-center justify-between mb-2">
										<span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Raw Metal</span>
										<span class="text-[10px] font-black text-gray-700 uppercase">Available: {(data.resources?.metal ?? 0).toLocaleString()}</span>
									</div>
									<input
										type="number"
										bind:value={resourceMetal}
										class="w-full bg-transparent text-left font-mono text-4xl font-black text-white outline-none"
									/>
									<div class="absolute right-6 bottom-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-600">🏗️</div>
								</div>

								<div class="relative rounded-3xl border border-white/5 bg-white/2 p-6 transition-all hover:bg-white/5">
									<div class="flex items-center justify-between mb-2">
										<span class="text-[10px] font-black text-blue-500/60 uppercase tracking-widest">Fused Crystal</span>
										<span class="text-[10px] font-black text-gray-700 uppercase">Available: {(data.resources?.crystal ?? 0).toLocaleString()}</span>
									</div>
									<input
										type="number"
										bind:value={resourceCrystal}
										class="w-full bg-transparent text-left font-mono text-4xl font-black text-blue-400 outline-none"
									/>
									<div class="absolute right-6 bottom-6 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/5 text-blue-500/40">💎</div>
								</div>

								<div class="relative rounded-3xl border border-white/5 bg-white/2 p-6 transition-all hover:bg-white/5">
									<div class="flex items-center justify-between mb-2">
										<span class="text-[10px] font-black text-purple-500/60 uppercase tracking-widest">Synthesized Gas</span>
										<span class="text-[10px] font-black text-gray-700 uppercase">Available: {(data.resources?.gas ?? 0).toLocaleString()}</span>
									</div>
									<input
										type="number"
										bind:value={resourceGas}
										class="w-full bg-transparent text-left font-mono text-4xl font-black text-purple-400 outline-none"
									/>
									<div class="absolute right-6 bottom-6 flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/5 text-purple-500/40">⛽</div>
								</div>
							</div>
						</div>

						<!-- Final Action -->
						<div class="flex items-center space-x-6">
							<button 
								onclick={() => currentStep = 2}
								class="flex flex-1 items-center justify-center rounded-[2rem] border border-white/5 bg-white/2 py-8 text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
							>
								Adjust Coordinates
							</button>
							<button 
								onclick={handleDispatch}
								disabled={loading || (movementInfo && !movementInfo.canReach)}
								class="relative flex-[2] overflow-hidden rounded-[2rem] bg-blue-600 py-8 text-xs font-black tracking-[0.3em] text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] active:scale-95 disabled:bg-white/5 disabled:text-gray-700 uppercase"
							>
								<div class="relative z-10 flex items-center justify-center space-x-4">
									{#if loading}
										<Spinner size="sm" />
										<span>Authorizing...</span>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4-4-4"/><path d="M3 3.412C3 2.632 3.632 2 4.412 2H19.588C20.368 2 21 2.632 21 3.412V20.588C21 21.368 20.368 22 19.588 22H4.412C3.632 22 3 21.368 3 20.588V3.412Z"/><path d="M8 10h8"/><path d="M8 14h4"/></svg>
										<span>Initiate Fleet Dispatch</span>
									{/if}
								</div>
								<div class="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
							</button>
						</div>
					</section>
				</div>
			{/if}
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

	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	input[type='number'] {
		-moz-appearance: textfield;
	}
</style>
