<script lang="ts">
    let { data } = $props();
</script>

<div class="p-4 pb-20">
    <h2 class="text-2xl font-bold text-blue-300 mb-6">Highscores</h2>

    <div class="bg-gray-800 border border-gray-700 rounded overflow-hidden">
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
                {#each data.highscores as player, i}
                    <tr class="border-b border-gray-700 hover:bg-gray-700/50 transition">
                        <td class="p-3 text-gray-500 font-mono w-16">#{i + 1}</td>
                        <td class="p-3 font-bold text-gray-200">{player.username}</td>
                        <td class="p-3">
                            {#if player.allianceTag}
                                <span class="text-blue-400">[{player.allianceTag}]</span>
                                <span class="text-gray-500 text-xs hidden sm:inline ml-1">{player.allianceName}</span>
                            {:else}
                                <span class="text-gray-600">-</span>
                            {/if}
                        </td>
                        <td class="p-3 text-right font-mono text-yellow-500">{player.points.toLocaleString()}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
