<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let now = $state(Date.now());
	let interval: any;
	let reloading = false;

	let extraFleets = $state<any[]>([]);
	let loadingMore = $state(false);
	let hasMore = $state(true);

	let allFleets = $derived([...data.fleets, ...extraFleets]);

	// TODO: Optimize this with server-sent events or websockets
	onMount(() => {
		interval = setInterval(async () => {
			now = Date.now();

			if (!reloading) {
				const shouldReload = allFleets.some((f: any) => new Date(f.arrivalTime).getTime() <= now);
				if (shouldReload) {
					reloading = true;
					await invalidateAll();
					// Reset extra fleets on reload as the page data refreshes
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
				if (result.fleets.length < 25) {
					hasMore = false;
				}
				if (result.fleets.length > 0) {
					extraFleets.push(...result.fleets);
				}
			}
		} catch (e) {
			console.error('Failed to load fleets', e);
		} finally {
			loadingMore = false;
		}
	}

	function getProgress(fleet: any) {
		const start = new Date(fleet.departureTime).getTime();
		const end = new Date(fleet.arrivalTime).getTime();
		const total = end - start;
		if (total <= 0) return 100;
		const current = now - start;
		const pct = Math.max(0, Math.min(100, (current / total) * 100));

		if (fleet.status === 'returning') {
			return 100 - pct;
		}

		return pct;
	}

	function getRemainingTime(fleet: any) {
		const end = new Date(fleet.arrivalTime).getTime();
		const diff = Math.max(0, end - now);
		const seconds = Math.floor((diff / 1000) % 60);
		const minutes = Math.floor((diff / (1000 * 60)) % 60);
		const hours = Math.floor(diff / (1000 * 60 * 60));
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}
</script>

<div class="p-4 pb-20">
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-2xl font-bold text-blue-300">Fleet Movements</h2>
		<a
			href="/game/fleet"
			class="rounded bg-gray-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-600"
		>
			← Back to Fleet
		</a>
	</div>

	{#if allFleets.length === 0}
		<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center text-gray-400">
			<div class="mb-2 text-4xl">📡</div>
			No active fleet movements detected.
		</div>
	{:else}
		<div class="space-y-3">
			{#each allFleets as fleet}
				<div
					id="fleet-{fleet.id}"
					class="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-lg"
				>
					<div class="flex items-start justify-between">
						<div>
							<div class="mb-1 flex items-center gap-2">
								<span class="text-sm font-bold tracking-wider text-yellow-400 uppercase">
									{fleet.status === 'returning' ? 'Returning' : fleet.mission}
								</span>
								{#if fleet.status === 'returning'}
									<span class="rounded-full bg-blue-900 px-2 py-0.5 text-xs text-blue-200"
										>Return Flight</span
									>
								{/if}
							</div>

							<div class="flex items-center gap-2 text-sm text-gray-300">
								<span
									>From: <span class="font-mono text-white"
										>[{fleet.originGalaxy}:{fleet.originSystem}:{fleet.originPlanet}]</span
									></span
								>
								<span class="text-gray-500">→</span>
								<span
									>To: <span class="font-mono text-white"
										>[{fleet.targetGalaxy}:{fleet.targetSystem}:{fleet.targetPlanet}]</span
									></span
								>
							</div>
						</div>

						<div class="text-right">
							<div class="mb-1 text-xs tracking-wide text-gray-400 uppercase">Arrival</div>
							<div class="font-mono text-blue-300">
								{fleet.arrivalTime ? new Date(fleet.arrivalTime).toLocaleTimeString() : 'Unknown'}
							</div>
						</div>
					</div>

					<!-- Progress Bar -->
					<div class="relative pt-4 pb-2">
						<div class="relative h-2 w-full rounded-full bg-gray-700">
							<div
								class="absolute top-0 left-0 h-full rounded-full bg-blue-500 transition-all duration-1000 ease-linear"
								style="width: {getProgress(fleet)}%"
							></div>
							<!-- Icon -->
							<div
								class="absolute top-1/2 z-10 -translate-y-1/2 transition-all duration-1000 ease-linear"
								style="left: {getProgress(fleet)}%"
							>
								<div
									class="-translate-x-1/2 transform text-xl {fleet.status === 'returning'
										? 'rotate-180'
										: ''}"
								>
									🚀
								</div>
							</div>
						</div>
						<div class="mt-2 text-center font-mono text-lg font-bold text-blue-200">
							{getRemainingTime(fleet)}
						</div>
					</div>
				</div>
			{/each}
		</div>

		{#if hasMore && allFleets.length >= 25}
			<div class="mt-6 text-center">
				<button
					class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
					onclick={loadMore}
					disabled={loadingMore}
				>
					{loadingMore ? 'Loading...' : 'Load More'}
				</button>
			</div>
		{/if}
	{/if}
</div>
