<script lang="ts">
    import { enhance } from '$app/forms';
    import { SHIPS } from '$lib/game-config';
    
    let { data } = $props();

    const shipTypes = Object.keys(SHIPS);
    
    // Track input amounts
    let amounts = $state(Object.fromEntries(shipTypes.map(type => [type, 1])));

    function canBuild(type: string) {
        const ship = SHIPS[type as keyof typeof SHIPS];
        const amount = amounts[type] || 1;
        const cost = {
            metal: ship.cost.metal * amount,
            crystal: ship.cost.crystal * amount,
            gas: ship.cost.gas * amount
        };
        
        if (!data.resources) return false;
        
        return data.resources.metal >= cost.metal && 
               data.resources.crystal >= cost.crystal && 
               (cost.gas === 0 || data.resources.gas >= cost.gas);
    }
</script>

<div class="p-4 pb-20">
    <h2 class="text-2xl font-bold text-blue-300 mb-6">Shipyard</h2>

    {#if data.shipyardLevel === 0}
        <div class="bg-red-900/50 border border-red-500 p-4 rounded text-center text-red-200 mb-6">
            You need a Shipyard to build ships. <a href="/game/facilities" class="underline font-bold hover:text-white">Build one in the Facilities menu.</a>
        </div>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 {data.shipyardLevel === 0 ? 'opacity-50 pointer-events-none grayscale' : ''}">
        {#each shipTypes as type}
            {@const ship = SHIPS[type as keyof typeof SHIPS]}
            {@const count = data.ships ? data.ships[type] : 0}
            {@const amount = amounts[type] || 1}
            {@const totalCost = {
                metal: ship.cost.metal * amount,
                crystal: ship.cost.crystal * amount,
                gas: ship.cost.gas * amount
            }}
            
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
                        {#if totalCost.metal > 0}
                            <span class={data.resources.metal < totalCost.metal ? 'text-red-500' : ''}>
                                M: {totalCost.metal.toLocaleString()}
                            </span>
                        {/if}
                        {#if totalCost.crystal > 0}
                            <span class={data.resources.crystal < totalCost.crystal ? 'text-red-500' : ''}>
                                C: {totalCost.crystal.toLocaleString()}
                            </span>
                        {/if}
                        {#if totalCost.gas > 0}
                            <span class={data.resources.gas < totalCost.gas ? 'text-red-500' : ''}>
                                G: {totalCost.gas.toLocaleString()}
                            </span>
                        {/if}
                    </div>
                    
                    <form method="POST" action="?/build" use:enhance class="flex space-x-2">
                        <input type="hidden" name="type" value={type}>
                        <input type="hidden" name="planet_id" value={data.currentPlanet.id}>
                        <input 
                            type="number" 
                            name="amount" 
                            min="1" 
                            bind:value={amounts[type]} 
                            class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center" 
                            disabled={data.shipyardLevel === 0}
                        >
                        <button 
                            type="submit"
                            class="flex-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition disabled:bg-gray-600 disabled:cursor-not-allowed active:scale-95 transform"
                            disabled={data.shipyardLevel === 0 || !canBuild(type)}
                        >
                            Build
                        </button>
                    </form>
                </div>
            </div>
        {/each}
    </div>
</div>
