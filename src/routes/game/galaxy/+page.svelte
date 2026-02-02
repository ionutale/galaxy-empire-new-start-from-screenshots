<script lang="ts">
	let { data } = $props();

	function prevGalaxy() {
		if (data.galaxy > 1) return `/game/galaxy?galaxy=${data.galaxy - 1}`;
		return '#';
	}

	function nextGalaxy() {
		if (data.galaxy < 9) return `/game/galaxy?galaxy=${data.galaxy + 1}`;
		return '#';
	}

	function getSystemColor(system: any) {
		if (system.hasActivity) {
			if (system.playerCount > 5) return 'bg-red-600'; // High activity
			if (system.playerCount > 2) return 'bg-yellow-600'; // Medium activity
			return 'bg-green-600'; // Low activity
		}
		return 'bg-gray-700'; // Empty
	}
</script>

<div class="p-4 pb-20">
	<!-- Navigation Header -->
	<div
		class="mb-4 flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-4"
	>
		<a
			href={prevGalaxy()}
			class="rounded bg-gray-700 p-2 transition hover:bg-gray-600 {data.galaxy <= 1
				? 'pointer-events-none opacity-50'
				: ''}"
		>
			◀
		</a>
		<div class="text-center">
			<h2 class="text-xl font-bold text-blue-300">Universe Map</h2>
			<div class="font-mono text-2xl font-bold">Galaxy {data.galaxy}</div>
		</div>
		<a
			href={nextGalaxy()}
			class="rounded bg-gray-700 p-2 transition hover:bg-gray-600 {data.galaxy >= 9
				? 'pointer-events-none opacity-50'
				: ''}"
		>
			▶
		</a>
	</div>

	<!-- Legend -->
	<div class="mb-4 flex flex-wrap justify-center gap-4 text-sm">
		<div class="flex items-center space-x-2">
			<div class="h-4 w-4 rounded bg-gray-700"></div>
			<span>Empty System</span>
		</div>
		<div class="flex items-center space-x-2">
			<div class="h-4 w-4 rounded bg-green-600"></div>
			<span>Low Activity</span>
		</div>
		<div class="flex items-center space-x-2">
			<div class="h-4 w-4 rounded bg-yellow-600"></div>
			<span>Medium Activity</span>
		</div>
		<div class="flex items-center space-x-2">
			<div class="h-4 w-4 rounded bg-red-600"></div>
			<span>High Activity</span>
		</div>
	</div>

	<!-- Galaxy Grid -->
	<div class="grid grid-cols-25 gap-1">
		{#each data.systems as system}
			<a
				href="/game/system?galaxy={data.galaxy}&system={system.systemId}"
				class="flex aspect-square items-center justify-center rounded border border-gray-600 text-xs font-bold transition hover:border-gray-400 hover:shadow-lg {getSystemColor(
					system
				)}"
				title="System {system.systemId}: {system.planetCount} planets, {system.playerCount} players"
			>
				{system.systemId}
			</a>
		{/each}
	</div>
</div>

<style>
	.grid-cols-25 {
		grid-template-columns: repeat(25, minmax(0, 1fr));
	}
</style>