<script lang="ts">
    let { data } = $props();
</script>

<div class="p-4 pb-20">
    <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-blue-300">Fleet Movements</h2>
        <a href="/game/fleet" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-bold transition">
            ← Back to Fleet
        </a>
    </div>

    {#if data.fleets.length === 0}
        <div class="p-8 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 text-center">
            <div class="text-4xl mb-2">📡</div>
            No active fleet movements detected.
        </div>
    {:else}
        <div class="space-y-3">
            {#each data.fleets as fleet}
                <div class="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-yellow-400 font-bold uppercase text-sm tracking-wider">
                                {fleet.status === 'returning' ? 'Returning' : fleet.mission}
                            </span>
                            {#if fleet.status === 'returning'}
                                <span class="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full">Return Flight</span>
                            {/if}
                        </div>
                        
                        <div class="text-sm text-gray-300 flex items-center gap-2">
                            <span>From: <span class="font-mono text-white">[{fleet.origin_galaxy}:{fleet.origin_system}:{fleet.origin_planet}]</span></span>
                            <span class="text-gray-500">→</span>
                            <span>To: <span class="font-mono text-white">[{fleet.target_galaxy}:{fleet.target_system}:{fleet.target_planet}]</span></span>
                        </div>
                    </div>
                    
                    <div class="text-left sm:text-right w-full sm:w-auto bg-gray-900/50 p-2 rounded sm:bg-transparent sm:p-0">
                        <div class="text-xs text-gray-400 uppercase tracking-wide mb-1">Arrival Time</div>
                        <div class="font-mono text-blue-300 text-lg">
                            {new Date(fleet.arrival_time).toLocaleTimeString()}
                        </div>
                        <div class="text-xs text-gray-500">
                            {new Date(fleet.arrival_time).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
