<script lang="ts">
    import { enhance } from '$app/forms';
    import { SHIPS } from '$lib/game-config';
    
    let { data } = $props();

    const shipTypes = Object.keys(SHIPS);
</script>

<div class="p-4 pb-20">
    <h2 class="text-2xl font-bold text-blue-300 mb-6">Shipyard</h2>

    {#if data.shipyardLevel === 0}
        <div class="bg-red-900/50 border border-red-500 p-4 rounded text-center text-red-200">
            You need a Shipyard to build ships. Build one in the Facilities menu.
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each shipTypes as type}
                {@const ship = SHIPS[type as keyof typeof SHIPS]}
                {@const count = data.ships ? data.ships[type] : 0}
                
                <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col shadow-lg">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-lg text-gray-200">{ship.name}</h3>
                        <span class="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">Owned: {count}</span>
                    </div>
                    
                    <div class="text-xs text-gray-400 mb-4 space-y-1">
                        <div class="flex justify-between"><span>Attack:</span> <span class="text-red-400">{ship.attack}</span></div>
                        <div class="flex justify-between"><span>Defense:</span> <span class="text-green-400">{ship.defense}</span></div>
                        <div class="flex justify-between"><span>Speed:</span> <span class="text-yellow-400">{ship.speed}</span></div>
                        <div class="flex justify-between"><span>Capacity:</span> <span class="text-blue-400">{ship.capacity}</span></div>
                    </div>
                    
                    <div class="mt-auto">
                        <div class="text-xs text-gray-500 mb-2 space-x-2">
                            {#if ship.cost.metal > 0}<span>M: {ship.cost.metal.toLocaleString()}</span>{/if}
                            {#if ship.cost.crystal > 0}<span>C: {ship.cost.crystal.toLocaleString()}</span>{/if}
                            {#if ship.cost.gas > 0}<span>G: {ship.cost.gas.toLocaleString()}</span>{/if}
                        </div>
                        
                        <form method="POST" action="?/build" use:enhance class="flex space-x-2">
                            <input type="hidden" name="type" value={type}>
                            <input type="hidden" name="planet_id" value={data.currentPlanet.id}>
                            <input type="number" name="amount" min="1" value="1" class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center">
                            <button 
                                type="submit"
                                class="flex-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition"
                            >
                                Build
                            </button>
                        </form>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
