<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	function calculateProduction(planet: any) {
		// Simplified production calculation
		const metalProd = (planet.metalMine || 0) * 30; // 30 metal per level per hour
		const crystalProd = (planet.crystalMine || 0) * 20; // 20 crystal per level per hour
		const gasProd = (planet.gasExtractor || 0) * 10; // 10 gas per level per hour

		// Energy production
		const solarEnergy = (planet.solarPlant || 0) * 20;
		const fusionEnergy = (planet.fusionReactor || 0) * 30;
		const totalEnergy = solarEnergy + fusionEnergy;

		// Energy consumption (simplified)
		const consumption = metalProd + crystalProd + gasProd;

		return {
			metal: metalProd,
			crystal: crystalProd,
			gas: gasProd,
			energy: totalEnergy,
			energyConsumption: consumption,
			netEnergy: totalEnergy - consumption
		};
	}

	function switchToPlanet(planetId: number) {
		goto(`/game?planet=${planetId}`);
	}
</script>

<div class="p-4 pb-20">
	<h2 class="mb-6 text-2xl font-bold text-blue-300">Planet Overview</h2>

	{#if data.planets.length === 0}
		<div class="text-center text-gray-400">
			<p>You don't have any planets yet.</p>
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.planets as planet}
				{@const production = calculateProduction(planet)}
				<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-lg font-bold text-blue-200">{planet.name}</h3>
						<span class="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
							[{planet.galaxyId}:{planet.systemId}:{planet.planetNumber}]
						</span>
					</div>

					<div class="mb-3 text-sm text-gray-400">
						{planet.planetType} • {planet.fieldsMax} fields
					</div>

					<!-- Resources -->
					<div class="mb-4 space-y-1">
						<div class="flex justify-between text-sm">
							<span class="text-gray-400">Metal:</span>
							<span class="text-yellow-400">{Math.floor(planet.metal || 0).toLocaleString()}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-400">Crystal:</span>
							<span class="text-blue-400">{Math.floor(planet.crystal || 0).toLocaleString()}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-400">Gas:</span>
							<span class="text-purple-400">{Math.floor(planet.gas || 0).toLocaleString()}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-400">Energy:</span>
							<span class="{production.netEnergy >= 0 ? 'text-green-400' : 'text-red-400'}">
								{production.netEnergy >= 0 ? '+' : ''}{production.netEnergy}
							</span>
						</div>
					</div>

					<!-- Production -->
					<div class="mb-4 space-y-1">
						<div class="text-xs font-bold text-gray-300 uppercase">Production /h</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-400">Metal:</span>
							<span class="text-yellow-400">+{production.metal}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-400">Crystal:</span>
							<span class="text-blue-400">+{production.crystal}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-400">Gas:</span>
							<span class="text-purple-400">+{production.gas}</span>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex gap-2">
						<button
							onclick={() => switchToPlanet(planet.id)}
							class="flex-1 rounded bg-blue-600 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
						>
							Switch To
						</button>
						<a
							href="/game/planet/{planet.id}"
							class="flex-1 rounded border border-gray-600 py-2 text-center text-sm font-bold text-gray-300 transition hover:bg-gray-700"
						>
							Manage
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>