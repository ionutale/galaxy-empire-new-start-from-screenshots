<script lang="ts">
	import Spinner from '$lib/components/Spinner.svelte';
	import type { BuildingInfo } from '$lib/server/building-service';
	import { DEFENSES } from '$lib/game-config';
	import { invalidateAll } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { data } = $props();
	let loading = $state<Record<string, boolean>>({});

	let resources = $derived({
		metal: data.resources?.metal || 0,
		crystal: data.resources?.crystal || 0,
		gas: data.resources?.gas || 0,
		energy: data.resources?.energy || 0
	});

	let buildings = $derived(data.buildings || []) as BuildingInfo[];
	let defenses = $derived(data.defenses || {}) as Record<string, number>;
	let queue = $derived(data.queue || []);

	// Real-time timer for queue updates
	let currentTime = $state(new Date());

	onMount(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

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

	// Group buildings by category
	let resourceBuildings = $derived(buildings.filter((b) => b.category === 'resource'));
	let facilityBuildings = $derived(buildings.filter((b) => b.category === 'facility'));
	let storageBuildings = $derived(buildings.filter((b) => b.category === 'storage'));

	// Defense types from config
	let defenseTypes = $derived(Object.keys(DEFENSES));

	// Helper function for camelCase conversion
	function toCamel(s: string) {
		return s.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
	}

	let isRenaming = $state(false);

	// Defense amounts
	let defenseAmounts = $state<Record<string, number>>({});

	async function handleCancel(queueId: number) {
		if (!confirm('Abort project synchronization and recoup partial materials?')) return;
		loading[queueId] = true;

		try {
			const response = await fetch('/api/buildings/cancel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					queueId,
					planetId: data.currentPlanet.id
				})
			});

			if (response.ok) {
				await invalidateAll();
			}
		} catch (error) {
			console.error('Cancel failed', error);
		} finally {
			loading[queueId] = false;
		}
	}

	async function handleAbandon() {
		if (!confirm('WARNING: De-establishing orbital presence will result in total loss of sector assets. Proceed with abandonment?')) return;
		loading['abandon'] = true;

		try {
			const response = await fetch('/api/planets/abandon', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					planetId: data.currentPlanet.id
				})
			});

			if (response.ok) {
				window.location.href = '/game';
			}
		} catch (error) {
			console.error('Abandon failed', error);
		} finally {
			loading['abandon'] = false;
		}
	}

	async function handleRename(e: SubmitEvent) {
		// ... existing code ...
		e.preventDefault();
		if (!data.currentPlanet) return;

		loading['rename'] = true;
		const formData = new FormData(e.target as HTMLFormElement);
		const name = formData.get('name') as string;

		try {
			const response = await fetch(`/api/planet/${data.currentPlanet.id}/rename`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});

			if (response.ok) {
				await invalidateAll();
				isRenaming = false;
			}
		} catch (error) {
			console.error('Rename failed', error);
		} finally {
			loading['rename'] = false;
		}
	}

	async function handleUpgrade(building: BuildingInfo) {
		if (!data.currentPlanet) return;
		const id = building.id || building.building_type_id;
		loading[id] = true;

		try {
			const response = await fetch('/api/buildings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					building_type_id: id,
					planet_id: data.currentPlanet.id
				})
			});

			if (response.ok) {
				await invalidateAll();
			}
		} catch (error) {
			console.error('Upgrade failed', error);
		} finally {
			loading[id] = false;
		}
	}

	async function handleBuildDefense(type: string) {
		if (!data.currentPlanet) return;
		loading[type] = true;
		const amount = defenseAmounts[type] || 1;

		try {
			const response = await fetch('/api/defense', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type,
					amount,
					planet_id: data.currentPlanet.id
				})
			});

			if (response.ok) {
				await invalidateAll();
				defenseAmounts[type] = 1; // Reset amount
			}
		} catch (error) {
			console.error('Defense build failed', error);
		} finally {
			loading[type] = false;
		}
	}
</script>

<div class="px-6 py-8 pb-32">
	{#if !data.currentPlanet}
		<div class="flex h-[60vh] flex-col items-center justify-center p-8 text-center" in:fade>
			<div class="mb-6 rounded-full bg-red-500/10 p-6 text-6xl shadow-[0_0_50px_rgba(239,68,68,0.2)]">🛰️</div>
			<h2 class="mb-4 text-3xl font-black tracking-tighter text-white uppercase">Sector Error</h2>
			<p class="max-w-md text-gray-500 font-medium leading-relaxed">
				Current planet coordinates invalid. Please re-establish orbital connection via command center.
			</p>
			<button class="mt-8 rounded-xl bg-white/5 border border-white/10 px-8 py-3 text-xs font-black tracking-[0.2em] text-white hover:bg-white/10 transition-all">RESCAN SECTOR</button>
		</div>
	{:else}
		<!-- Planet Header -->
		<div class="group relative mb-12" in:fly={{ y: -20, duration: 600 }}>
			{#if isRenaming}
				<form onsubmit={handleRename} class="flex items-center space-x-4">
					<input
						type="text"
						name="name"
						value={data.currentPlanet.name}
						class="rounded-xl border border-blue-500 bg-blue-500/10 backdrop-blur-md px-4 py-2 text-2xl font-black text-white focus:outline-none focus:ring-2 ring-blue-500/50"
						maxlength="20"
						autoFocus
					/>
					<button
						type="submit"
						disabled={loading['rename']}
						class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all font-black"
					>
						{#if loading['rename']}
							<Spinner size="sm" />
						{:else}
							✓
						{/if}
					</button>
					<button
						type="button"
						onclick={() => (isRenaming = false)}
						class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all font-black"
					>
						✕
					</button>
				</form>
			{:else}
				<div class="flex items-baseline justify-between">
					<div class="flex items-baseline space-x-4">
						<h1 class="text-5xl font-black tracking-tighter text-white glow-blue uppercase">
							{data.currentPlanet.name}
							<button
								onclick={() => (isRenaming = true)}
								class="text-sm text-gray-600 opacity-0 transition-all group-hover:opacity-100 hover:text-blue-400 ml-4 align-middle"
							>✎</button>
						</h1>
						<p class="text-sm font-black tracking-[0.3em] text-blue-500/60 uppercase">
							[{data.currentPlanet.galaxyId}:{data.currentPlanet.systemId}:{data.currentPlanet.planetNumber}]
						</p>
					</div>
					<button
						onclick={handleAbandon}
						disabled={loading['abandon']}
						class="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-2 text-[10px] font-black tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase"
					>
						{#if loading['abandon']}<Spinner size="sm" />{:else}Abandon Sector{/if}
					</button>
				</div>
				<div class="mt-2 flex items-center space-x-6">
					<a
						href="/game/planet/{data.currentPlanet.id}"
						class="text-[10px] font-black tracking-[0.2em] text-gray-500 hover:text-white transition-colors uppercase border-b border-transparent hover:border-white/20 pb-1"
					>
						Sector Intelligence ❱
					</a>
					<div class="h-1 w-1 rounded-full bg-gray-700"></div>
					<span class="text-[10px] font-black tracking-[0.2em] text-green-500/60 uppercase">System Nominal</span>
				</div>
			{/if}
		</div>

		<div class="space-y-16">
			<!-- Construction Queue -->
			{#if queue.length > 0}
				<section class="space-y-6" in:fly={{ y: 20, duration: 600 }}>
					<div class="flex items-center space-x-4">
						<div class="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_10px_#eab308]"></div>
						<h2 class="text-xl font-black tracking-tight text-white uppercase">Construction Queue</h2>
						<div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
					</div>

					<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{#each queue as item (item.id)}
							<div class="glass-panel group relative overflow-hidden rounded-3xl p-6 transition-all border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.05)]">
								<div class="mb-4 flex items-start justify-between">
									<div class="flex items-center space-x-4">
										<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-2xl group-hover:scale-110 transition-transform">
											{#if item.name.includes('Metal')}⛏️
											{:else if item.name.includes('Crystal')}💎
											{:else if item.name.includes('Gas')}⛽
											{:else if item.name.includes('Solar')}☀️
											{:else if item.name.includes('Shipyard')}🚀
											{:else if item.name.includes('Lab')}🔬
											{:else}🏭
											{/if}
										</div>
										<div>
											<h4 class="font-black text-white uppercase leading-tight">{item.name}</h4>
											<div class="flex items-center space-x-2">
												<span class="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Mark {item.targetLevel}</span>
												<span class="text-[10px] font-black text-gray-500 uppercase tracking-tighter">
													{formatTimeRemaining(item.completionAt)}
												</span>
											</div>
										</div>
									</div>
									<button
										onclick={() => handleCancel(item.id)}
										disabled={loading[item.id]}
										class="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-all"
									>
										{#if loading[item.id]}<Spinner size="sm" />{:else}✕{/if}
									</button>
								</div>

								<!-- Progress Bar -->
								<div class="space-y-2">
									<div class="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
										<div
											class="h-full rounded-full bg-gradient-to-r from-yellow-600 to-amber-400 shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all duration-1000"
											style="width: {calculateProgress(item.startedAt, item.completionAt)}%"
										></div>
									</div>
									<div class="flex justify-end">
										<span class="text-[9px] font-black text-yellow-500/60 uppercase tracking-widest leading-none">
											{calculateProgress(item.startedAt, item.completionAt)}% Synchronized
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Resources Section -->
			<section class="space-y-6">
				<div class="flex items-center space-x-4">
					<div class="h-2 w-2 rounded-full bg-blue-500 glow-blue"></div>
					<h2 class="text-xl font-black tracking-tight text-white uppercase">Resource Extraction</h2>
					<div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
				</div>

				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
					{#each resourceBuildings as building (building.id)}
						<div class="glass-panel group relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 transition-all hover:-translate-y-1 active:translate-y-0 hover:border-white/20">
							<div class="mb-6 flex items-start justify-between">
								<div class="flex items-center space-x-4">
									<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-3xl transition-transform group-hover:scale-110 duration-300">
										{#if building.name.includes('Metal')}⛏️
										{:else if building.name.includes('Crystal')}💎
										{:else if building.name.includes('Gas')}⛽
										{:else if building.name.includes('Solar')}☀️
										{:else}🏭
										{/if}
									</div>
									<div>
										<h3 class="text-lg font-black tracking-tight text-white uppercase leading-tight">{building.name}</h3>
										<div class="flex items-center space-x-2">
											<span class="font-mono text-[10px] font-black text-blue-400 uppercase tracking-widest">Mark {building.level}</span>
											{#if building.isUpgrading}
												<span class="flex h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
												<span class="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Active Upgrading</span>
											{/if}
										</div>
									</div>
								</div>
							</div>

							{#if building.production}
								<div class="mb-6 rounded-2xl bg-white/5 p-4 border border-white/5">
									<div class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Theoretical Hourly Yield</div>
									{#if building.production.metal}
										<div class="font-mono text-xl font-black text-green-400">+{building.production.metal.toLocaleString()}<span class="text-xs ml-1 opacity-60">Mat</span></div>
									{:else if building.production.crystal}
										<div class="font-mono text-xl font-black text-blue-400">+{building.production.crystal.toLocaleString()}<span class="text-xs ml-1 opacity-60">Cry</span></div>
									{:else if building.production.gas}
										<div class="font-mono text-xl font-black text-purple-400">+{building.production.gas.toLocaleString()}<span class="text-xs ml-1 opacity-60">Gas</span></div>
									{:else if building.production.energy}
										<div class="font-mono text-xl font-black text-yellow-400">+{building.production.energy.toLocaleString()}<span class="text-xs ml-1 opacity-60">Pwr</span></div>
									{/if}
								</div>
							{/if}

							<div class="mt-auto space-y-4">
								<div class="grid grid-cols-2 gap-2">
									<div class="flex items-center justify-between rounded-lg px-2 py-1 bg-white/5 border border-white/5">
										<span class="text-[9px] font-black text-gray-500">M</span>
										<span class="font-mono text-[10px] font-bold {resources.metal < building.cost.metal ? 'text-red-400' : 'text-gray-300'}">{building.cost.metal.toLocaleString()}</span>
									</div>
									<div class="flex items-center justify-between rounded-lg px-2 py-1 bg-white/5 border border-white/5">
										<span class="text-[9px] font-black text-gray-500">C</span>
										<span class="font-mono text-[10px] font-bold {resources.crystal < building.cost.crystal ? 'text-red-400' : 'text-gray-300'}">{building.cost.crystal.toLocaleString()}</span>
									</div>
								</div>

								<button
									onclick={() => handleUpgrade(building)}
									disabled={!building.canUpgrade || building.isUpgrading || resources.metal < building.cost.metal || resources.crystal < building.cost.crystal || resources.gas < building.cost.gas || loading[building.id]}
									class="group/btn relative w-full overflow-hidden rounded-xl bg-blue-600 py-3 text-[10px] font-black tracking-widest text-white uppercase transition-all hover:bg-blue-500 disabled:bg-white/5 disabled:text-gray-600 disabled:pointer-events-none"
								>
									<span class="relative z-10 flex items-center justify-center space-x-2">
										{#if loading[building.id]}<Spinner size="sm" />
										{:else if building.isUpgrading}<span>Structural Overhaul...</span>
										{:else}<span>Advance to MK {building.level + 1}</span>{/if}
									</span>
									<div class="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- Facilities Section -->
			<section class="space-y-6">
				<div class="flex items-center space-x-4">
					<div class="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_10px_#bd00ff]"></div>
					<h2 class="text-xl font-black tracking-tight text-white uppercase">Imperial Facilities</h2>
					<div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
				</div>

				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each facilityBuildings as building (building.id)}
						<div class="glass-panel group relative flex items-center space-x-6 rounded-3xl p-6 transition-all hover:border-white/20">
							<div class="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-transparent text-4xl shadow-inner group-hover:scale-105 duration-500">
								{building.icon}
							</div>
							<div class="flex-1">
								<h3 class="text-xl font-black tracking-tighter text-white uppercase group-hover:text-purple-400 transition-colors">{building.name}</h3>
								<div class="mb-4 flex items-center space-x-2">
									<span class="font-mono text-xs font-black text-purple-400 uppercase tracking-widest">Level {building.level}</span>
									{#if building.isUpgrading}
										<span class="text-[10px] font-black text-yellow-500/80 animate-pulse italic uppercase">Optimizing...</span>
									{/if}
								</div>

								<div class="flex items-center justify-between">
									<div class="flex space-x-4 opacity-60 group-hover:opacity-100 transition-opacity">
										{#if building.upgradeCost?.metal}
											<div class="flex flex-col">
												<span class="text-[8px] font-black text-gray-500 uppercase">Mat</span>
												<span class="font-mono text-xs font-bold {resources.metal < building.upgradeCost.metal ? 'text-red-400' : 'text-gray-300'}">{building.upgradeCost.metal.toLocaleString()}</span>
											</div>
										{/if}
										{#if building.upgradeCost?.crystal}
											<div class="flex flex-col">
												<span class="text-[8px] font-black text-gray-500 uppercase">Cry</span>
												<span class="font-mono text-xs font-bold {resources.crystal < building.upgradeCost.crystal ? 'text-red-400' : 'text-gray-300'}">{building.upgradeCost.crystal.toLocaleString()}</span>
											</div>
										{/if}
									</div>
									<button
										onclick={() => handleUpgrade(building)}
										disabled={!building.upgradeCost || resources.metal < building.upgradeCost.metal || resources.crystal < building.upgradeCost.crystal || building.isUpgrading || loading[building.building_type_id]}
										class="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all disabled:opacity-20 disabled:pointer-events-none"
									>
										{#if loading[building.building_type_id]}<Spinner size="sm" />
										{:else}⭡{/if}
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- Defense & Storage Grid -->
			<div class="grid grid-cols-1 gap-16 lg:grid-cols-2">
				<!-- Defenses Section -->
				<section class="space-y-6">
					<div class="flex items-center space-x-4">
						<div class="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_#ff3e3e]"></div>
						<h2 class="text-xl font-black tracking-tight text-white uppercase">Orbital Defenses</h2>
						<div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
					</div>

					{#if (buildings.find((b) => b.name === 'Shipyard')?.level || 0) === 0}
						<div class="rounded-3xl border border-red-500/50 bg-red-950/20 p-8 text-center text-red-200/80 backdrop-blur-md" in:fade>
							<div class="text-4xl mb-4">🚫</div>
							<p class="text-sm font-bold tracking-wide uppercase">Shipyard Link Offline</p>
							<p class="text-[10px] mt-2 opacity-60">Strategic defense deployment requires active shipyard construction facilities.</p>
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{#each defenseTypes as type (type)}
								{@const defense = DEFENSES[type as keyof typeof DEFENSES]}
								{@const count = defenses[toCamel(type)] || 0}
								<div class="glass-panel flex flex-col rounded-2xl p-5 border border-white/5 hover:border-red-500/30 transition-all">
									<div class="mb-4 flex items-start justify-between">
										<div>
											<h4 class="font-black text-white uppercase leading-tight">{defense.name}</h4>
											<span class="text-[10px] font-black text-red-400/80 uppercase tracking-widest">Mark Tactical</span>
										</div>
										<div class="rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-black text-red-400 border border-red-500/20">{count} Units</div>
									</div>

									<div class="mb-6 grid grid-cols-3 gap-2 text-center text-[9px] font-black tracking-widest uppercase">
										<div class="rounded-lg bg-white/5 py-1 text-red-400">ATK {defense.attack}</div>
										<div class="rounded-lg bg-white/5 py-1 text-green-400">DEF {defense.defense}</div>
										<div class="rounded-lg bg-white/5 py-1 text-blue-400">SHD {defense.shield}</div>
									</div>

									<div class="flex items-center space-x-2">
										<input
											type="number"
											min="1"
											bind:value={defenseAmounts[type]}
											class="w-14 rounded-xl bg-white/5 border border-white/10 px-2 py-2 text-center text-xs font-black text-white focus:outline-none focus:border-red-500/50 transition-colors"
										/>
										<button
											onclick={() => handleBuildDefense(type)}
											disabled={loading[type]}
											class="flex-1 rounded-xl bg-white/5 border border-white/10 py-2 text-[10px] font-black tracking-widest text-white uppercase hover:bg-red-600/20 hover:border-red-500/40 hover:text-red-400 transition-all disabled:opacity-20"
										>
											{#if loading[type]}<Spinner size="sm" />
											{:else}DEPLOY UNIT{/if}
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- Storage Section -->
				<section class="space-y-6">
					<div class="flex items-center space-x-4">
						<div class="h-2 w-2 rounded-full bg-gold-400 shadow-[0_0_10px_#ffb800]"></div>
						<h2 class="text-xl font-black tracking-tight text-white uppercase">Vault Logistics</h2>
						<div class="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
					</div>

					<div class="grid grid-cols-1 gap-6">
						{#each storageBuildings as building (building.id)}
							<div class="glass-panel flex items-center p-6 rounded-3xl border border-white/5 hover:border-gold-500/30 transition-all">
								<div class="mr-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-4xl shadow-inner">
									{building.icon}
								</div>
								<div class="flex-1">
									<div class="flex items-center justify-between mb-2">
										<h4 class="font-black text-white uppercase tracking-tighter text-lg">{building.name}</h4>
										<span class="font-mono text-xs font-black text-gold-500 uppercase">MK {building.level}</span>
									</div>
									<div class="flex items-center justify-between">
										<div class="flex space-x-4">
											{#if building.upgradeCost?.metal}
												<div class="flex flex-col">
													<span class="text-[8px] font-black text-gray-500 uppercase">M</span>
													<span class="font-mono text-[10px] font-bold {resources.metal < building.upgradeCost.metal ? 'text-red-400' : 'text-gray-300'}">{building.upgradeCost.metal.toLocaleString()}</span>
												</div>
											{/if}
											{#if building.upgradeCost?.crystal}
												<div class="flex flex-col">
													<span class="text-[8px] font-black text-gray-500 uppercase">C</span>
													<span class="font-mono text-[10px] font-bold {resources.crystal < building.upgradeCost.crystal ? 'text-red-400' : 'text-gray-300'}">{building.upgradeCost.crystal.toLocaleString()}</span>
												</div>
											{/if}
										</div>
										<button
											onclick={() => handleUpgrade(building)}
											disabled={!building.upgradeCost || resources.metal < building.upgradeCost.metal || resources.crystal < building.upgradeCost.crystal || building.isUpgrading || loading[building.building_type_id]}
											class="rounded-xl px-6 py-2 bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-gold-500/20 hover:border-gold-500/40 hover:text-gold-400 transition-all disabled:opacity-20"
										>
											{building.isUpgrading ? 'LOCK' : 'EXPAND'}
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</section>
			</div>
		</div>
	{/if}
</div>

<style>
	.glass-panel {
		background: rgba(13, 17, 23, 0.75);
		backdrop-filter: blur(15px);
		border: 1px solid rgba(255, 255, 255, 0.05);
		box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
	}
	
	.glow-blue {
		text-shadow: 0 0 25px rgba(59, 130, 246, 0.6);
	}

	.bg-gold-400 { background-color: #ffb800; }
	.text-gold-400 { color: #ffb800; }
	.border-gold-500\/30 { border-color: rgba(255, 184, 0, 0.3); }
	.hover\:border-gold-500\/40:hover { border-color: rgba(255, 184, 0, 0.4); }
	.hover\:text-gold-400:hover { color: #ffb800; }
	.hover\:bg-gold-500\/20:hover { background-color: rgba(255, 184, 0, 0.2); }
</style>
