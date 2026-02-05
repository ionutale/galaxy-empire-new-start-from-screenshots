<script lang="ts">
	let { data } = $props();
</script>

<div class="p-4 pb-20">
	<h2 class="mb-6 text-2xl font-bold text-blue-300">Highscores</h2>

	<div class="overflow-hidden rounded border border-gray-700 bg-gray-800">
		<table class="w-full text-left">
			<thead class="bg-gray-900 text-gray-400">
				<tr>
					<th class="p-3">Rank</th>
					<th class="p-3">Player</th>
					<th class="p-3">Alliance</th>
					<th class="p-3 text-right">Points</th>
				</tr>
			</thead>
			<tbody>
				{#each data.highscores as player, i (player.id || player.username)}
					<tr class="border-b border-gray-700 transition hover:bg-gray-700/50">
						<td class="w-16 p-3 font-mono text-gray-500">#{i + 1}</td>
						<td class="p-3 font-bold text-gray-200">{player.username}</td>
						<td class="p-3">
							{#if player.allianceTag}
								<span class="text-blue-400">[{player.allianceTag}]</span>
								<span class="ml-1 hidden text-xs text-gray-500 sm:inline"
									>{player.allianceName}</span
								>
							{:else}
								<span class="text-gray-600">-</span>
							{/if}
						</td>
						<td class="p-3 text-right font-mono text-yellow-500"
							>{(player.points || 0).toLocaleString()}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
