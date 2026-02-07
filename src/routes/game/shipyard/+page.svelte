<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Spinner from '$lib/components/Spinner.svelte';
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';

	let { data } = $props();

	// Get data from the new structure
	let shipyardData = $derived(data.shipyardData);
	let ships = $derived(shipyardData?.ships || {});
	let queue = $derived(shipyardData?.queue || []);
	let shipyardInfo = $derived(shipyardData?.shipyardInfo || []);
	let resources = $derived(shipyardData?.resources || {});
	let shipyardLevel = $derived(shipyardData?.shipyardLevel || 0);

	// Real-time timer for queue updates
	let currentTime = $state(new Date());

	onMount(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

	// Track input amounts
	let amounts: Record<string, number> = $state({});

	// Update amounts when shipyardInfo changes
	$effect(() => {
		if (shipyardInfo.length > 0) {
			amounts = Object.fromEntries(
				shipyardInfo.map((ship: { shipType: string }) => [ship.shipType, 1])
			);
		}
	});

	let loading = $state<Record<string, boolean>>({});

	function canBuild(ship: {
		shipType: string;
		cost: { metal: number; crystal: number; gas: number };
		canBuild: boolean;
	}) {
		const amount = amounts[ship.shipType] || 1;
		const cost = {
			metal: ship.cost.metal * amount,
			crystal: ship.cost.crystal * amount,
			gas: ship.cost.gas * amount
		};

		return (
			ship.canBuild &&
			resources.metal >= cost.metal &&
			resources.crystal >= cost.crystal &&
			(cost.gas === 0 || resources.gas >= cost.gas)
		);
	}

	function formatTimeRemaining(completionAt: Date | string) {
		const compDate = new Date(completionAt);
		const diff = compDate.getTime() - currentTime.getTime();
		if (diff <= 0) return 'Analyzing...';

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
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

	async function handleBuild(shipType: string) {
		loading[shipType] = true;
		const amount = amounts[shipType] || 1;
		try {
			const response = await fetch('/api/shipyard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'build',
					planetId: data.currentPlanet.id,
					shipType,
					amount
				})
			});
			if (response.ok) {
				await invalidateAll();
			} else {
				console.error('Failed to build ships');
			}
		} catch (error) {
			console.error('Error building ships:', error);
		} finally {
			loading[shipType] = false;
		}
	}

	async function handleCancel(queueId: number) {
		try {
			const response = await fetch('/api/shipyard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'cancel',
					queueId
				})
			});
			if (response.ok) {
				await invalidateAll();
			} else {
				console.error('Failed to cancel construction');
			}
		} catch (error) {
			console.error('Error canceling construction:', error);
		}
	}

	function getShipImage(shipType: string) {
		const shipMap: Record<string, string> = {
			'light_fighter': '/assets/generated/light_fighter_1770456225939.png',
			'cruiser': '/assets/generated/cruiser_ship_1770456243978.png',
			'battleship': '/assets/generated/battleship_ship_1770456260256.png'
		};
		return shipMap[shipType.toLowerCase()] || '';
	}
</script>

<div class="relative min-h-screen overflow-hidden bg-[#05070a] text-gray-100">
	<!-- Cinematic Background -->
	<div class="fixed inset-0 z-0">
		<img 
			src="/assets/generated/shipyard_background_1770456204701.png" 
			alt="Hangar Background" 
			class="h-full w-full object-cover opacity-20 filter blur-[2px]"
		/>
		<div class="absolute inset-0 bg-gradient-to-b from-[#05070a]/80 via-transparent to-[#05070a]"></div>
	</div>

	<div class="relative z-10 mx-auto max-w-7xl px-6 py-12 pb-32">
		<!-- Header -->
		<header class="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
			<div in:fade={{ duration: 800 }}>
				<h1 class="text-5xl font-black tracking-tighter text-white glow-cyan uppercase">
					Orbital <span class="text-cyan-500">Shipyard</span>
				</h1>
				<p class="mt-2 text-xs font-black tracking-[0.4em] text-gray-500 uppercase">Sector Manufacturing Authority</p>
			</div>
			
			{#if shipyardLevel > 0}
				<div class="flex items-center space-x-6 rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md" in:fly={{ x: 20, duration: 800 }}>
					<div class="flex flex-col">
						<span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Facility Level</span>
						<span class="font-mono text-2xl font-black text-white">{shipyardLevel}</span>
					</div>
					<div class="h-10 w-px bg-white/10"></div>
					<div class="flex flex-col">
						<span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Builds</span>
						<span class="font-mono text-2xl font-black text-cyan-400">{queue.length}</span>
					</div>
				</div>
			{/if}
		</header>

		{#if shipyardLevel === 0}
			<div
				class="mb-12 overflow-hidden rounded-3xl border border-red-500/50 bg-red-500/5 p-8 backdrop-blur-xl"
				in:fade
			>
				<div class="flex items-center space-x-6">
					<span class="text-4xl">⚠️</span>
					<div>
						<h3 class="text-xl font-black text-red-400 uppercase tracking-tight">Infrastructure Deficiency</h3>
						<p class="mt-1 text-sm text-red-200/60 leading-relaxed">
							Orbital ship construction requires a functional Shipyard. <a
								href="/game"
								class="font-black text-white underline hover:no-underline"
								>De-establish priority and prioritize Facilities construction.</a
							>
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Construction Queue -->
		{#if queue.length > 0}
			<section class="mb-16 space-y-6" in:fly={{ y: 20, duration: 600 }}>
				<div class="flex items-center space-x-4">
					<div class="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
					<h2 class="text-xl font-black tracking-tight text-white uppercase">Active Assembly Line</h2>
					<div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
				</div>

				<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each queue as item (item.id)}
						<div class="glass-panel group relative overflow-hidden rounded-3xl p-6 transition-all border border-white/5 hover:border-cyan-500/30">
							<div class="mb-4 flex items-center justify-between">
								<div class="flex items-center space-x-4">
									<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-xl font-black text-cyan-400">
										{item.amount}x
									</div>
									<div>
										<h4 class="font-black text-white uppercase leading-tight">{item.shipType.replace(/_/g, ' ')}</h4>
										<p class="text-[10px] font-black text-cyan-500 uppercase tracking-widest leading-none mt-1">
											{formatTimeRemaining(item.completionAt)}
										</p>
									</div>
								</div>
								<button
									onclick={() => handleCancel(item.id)}
									class="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-all"
								>
									✕
								</button>
							</div>

							<!-- Progress Tracking -->
							<div class="space-y-2">
								<div class="flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest">
									<span>Fabricating</span>
									<span class="text-cyan-400">{calculateProgress(item.startedAt, item.completionAt)}%</span>
								</div>
								<div class="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
									<div
										class="h-full rounded-full bg-gradient-to-r from-cyan-600 to-blue-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-1000"
										style="width: {calculateProgress(item.startedAt, item.completionAt)}%"
									></div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Vessel Catalog -->
		<div
			class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 {shipyardLevel === 0
				? 'pointer-events-none opacity-30 grayscale'
				: ''}"
		>
			{#each shipyardInfo as ship (ship.shipType)}
				{@const count =
					ships[ship.shipType.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase())] || 0}
				{@const amount = amounts[ship.shipType] || 1}
				{@const totalCost = {
					metal: ship.cost.metal * amount,
					crystal: ship.cost.crystal * amount,
					gas: ship.cost.gas * amount
				}}
				{@const shipImg = getShipImage(ship.shipType)}

				<div
					class="glass-panel group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-white/5 p-6 transition-all hover:-translate-y-2 hover:border-cyan-500/20 shadow-2xl"
					in:fly={{ y: 30, duration: 800 }}
				>
					<div>
						<!-- Mini Header -->
						<div class="mb-6 flex items-start justify-between">
							<div>
								<h3 class="text-2xl font-black tracking-tighter text-white uppercase">{ship.name}</h3>
								<div class="mt-1 flex items-center space-x-2">
									<span class="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Registered</span>
									<span class="font-mono text-sm font-black text-white">{count}</span>
								</div>
							</div>
							{#if shipyardLevel > 0}
								<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gray-400 transition-colors group-hover:bg-cyan-500/10 group-hover:text-cyan-400">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2s0 8.84-6.05 11a22 22 0 0 1-3.95 2z"/><path d="M9 15c-1.26 1.5-5 2-5 2s.5-3.74 2-5c.84-.71 2.13-.7 2.91.09.79.78.82 2.07.09 2.91z"/></svg>
								</div>
							{/if}
						</div>

						<!-- Ship Visualization -->
						<div class="relative mb-8 h-48 w-full overflow-hidden rounded-3xl bg-[#0a0f18]">
							{#if shipImg}
								<img src={shipImg} alt={ship.name} class="h-full w-full object-contain transition-transform duration-700 group-hover:scale-110" />
							{:else}
								<div class="flex h-full w-full flex-col items-center justify-center text-gray-700">
									<span class="text-4xl opacity-20">🚀</span>
									<span class="mt-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Visual Link Offline</span>
								</div>
							{/if}
							<div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a0f18] to-transparent"></div>
						</div>

						<!-- Combat Specs Grid -->
						<div class="mb-8 grid grid-cols-2 gap-3">
							<div class="rounded-2xl border border-white/5 bg-white/2 p-3">
								<span class="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Offensive Capability</span>
								<div class="mt-1 flex items-end justify-between">
									<span class="text-lg font-black text-red-500">{ship.attack.toLocaleString()}</span>
									<div class="mb-1.5 h-1 w-12 overflow-hidden rounded-full bg-red-500/10">
										<div class="h-full bg-red-500" style="width: {Math.min(100, (ship.attack / 5000) * 100)}%"></div>
									</div>
								</div>
							</div>
							<div class="rounded-2xl border border-white/5 bg-white/2 p-3">
								<span class="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Hull Integrity</span>
								<div class="mt-1 flex items-end justify-between">
									<span class="text-lg font-black text-green-500">{ship.defense.toLocaleString()}</span>
									<div class="mb-1.5 h-1 w-12 overflow-hidden rounded-full bg-green-500/10">
										<div class="h-full bg-green-500" style="width: {Math.min(100, (ship.defense / 5000) * 100)}%"></div>
									</div>
								</div>
							</div>
							<div class="rounded-2xl border border-white/5 bg-white/2 p-3">
								<span class="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Drive Velocity</span>
								<div class="mt-1 flex items-end justify-between">
									<span class="text-lg font-black text-yellow-500">{ship.speed.toLocaleString()}</span>
									<div class="mb-1.5 h-1 w-12 overflow-hidden rounded-full bg-yellow-500/10">
										<div class="h-full bg-yellow-500" style="width: {Math.min(100, (ship.speed / 20000) * 100)}%"></div>
									</div>
								</div>
							</div>
							<div class="rounded-2xl border border-white/5 bg-white/2 p-3">
								<span class="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Cargo Volume</span>
								<div class="mt-1 flex items-end justify-between">
									<span class="text-lg font-black text-blue-500">{ship.capacity.toLocaleString()}</span>
									<div class="mb-1.5 h-1 w-12 overflow-hidden rounded-full bg-blue-500/10">
										<div class="h-full bg-blue-500" style="width: {Math.min(100, (ship.capacity / 100000) * 100)}%"></div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Procurement Section -->
					<div class="space-y-4">
						<div class="flex flex-wrap gap-2 rounded-2xl bg-[#0a0f18]/50 p-3 border border-white/5">
							{#if totalCost.metal > 0}
								<div class="flex-1 rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10">
									<span class="text-[8px] font-black text-gray-500 uppercase">Metal</span>
									<p class="font-mono text-[10px] font-black {resources.metal < totalCost.metal ? 'text-red-500' : 'text-gray-300'}">
										{totalCost.metal.toLocaleString()}
									</p>
								</div>
							{/if}
							{#if totalCost.crystal > 0}
								<div class="flex-1 rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10">
									<span class="text-[8px] font-black text-blue-500 uppercase">Crystal</span>
									<p class="font-mono text-[10px] font-black {resources.crystal < totalCost.crystal ? 'text-red-500' : 'text-gray-300'}">
										{totalCost.crystal.toLocaleString()}
									</p>
								</div>
							{/if}
							{#if totalCost.gas > 0}
								<div class="flex-1 rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10">
									<span class="text-[8px] font-black text-purple-500 uppercase">Gas</span>
									<p class="font-mono text-[10px] font-black {resources.gas < totalCost.gas ? 'text-red-500' : 'text-gray-300'}">
										{totalCost.gas.toLocaleString()}
									</p>
								</div>
							{/if}
						</div>

						{#if !ship.canBuild}
							<div class="px-2 text-center text-[10px] font-black text-red-500 uppercase tracking-widest leading-tight">
								{ship.reason}
							</div>
						{/if}

						<div class="flex items-stretch space-x-3">
							<div class="relative flex w-24 flex-col justify-center rounded-2xl border border-white/10 bg-white/5 px-2">
								<span class="absolute -top-2 left-3 bg-[#0a0f18] px-1 text-[8px] font-black text-gray-500 uppercase">Units</span>
								<input
									type="number"
									min="1"
									bind:value={amounts[ship.shipType]}
									class="w-full bg-transparent p-1 text-center font-mono text-lg font-black text-white outline-none"
									disabled={shipyardLevel === 0}
								/>
							</div>
							<button
								onclick={() => handleBuild(ship.shipType)}
								class="relative flex flex-1 overflow-hidden rounded-2xl bg-cyan-600 py-4 text-xs font-black tracking-[0.2em] text-white uppercase transition-all hover:bg-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:bg-white/5 disabled:text-gray-600 disabled:shadow-none active:scale-95"
								disabled={shipyardLevel === 0 || !canBuild(ship) || loading[ship.shipType]}
							>
								<div class="relative z-10 flex w-full items-center justify-center">
									{#if loading[ship.shipType]}
										<Spinner size="sm" />
									{:else}
										<span>Authorize Fleet Expansion</span>
									{/if}
								</div>
								<div class="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.glass-panel {
		background: rgba(13, 17, 23, 0.7);
		backdrop-filter: blur(16px);
	}
	
	.glow-cyan {
		text-shadow: 0 0 20px rgba(6, 182, 212, 0.5);
	}

	/* Hide spin buttons */
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	input[type='number'] {
		-moz-appearance: textfield;
		appearance: textfield;
	}
</style>
