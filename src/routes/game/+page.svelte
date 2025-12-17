<script lang="ts">
    import { enhance } from '$app/forms';
    import { getBuildingCost } from '$lib/game-config';
    
    let { data } = $props();

    const buildingTypes = [
        { id: 'metal_mine', name: 'Metal Mine', icon: '⛏️' },
        { id: 'crystal_mine', name: 'Crystal Mine', icon: '💎' },
        { id: 'gas_extractor', name: 'Gas Extractor', icon: '⛽' },
        { id: 'solar_plant', name: 'Solar Plant', icon: '☀️' },
    ];
</script>

<div class="p-4 pb-20">
    <div class="mb-6 text-center">
        <h2 class="text-2xl font-bold text-blue-300">{data.currentPlanet.name}</h2>
        <p class="text-gray-400 text-sm">[{data.currentPlanet.galaxy_id}:{data.currentPlanet.system_id}:{data.currentPlanet.planet_number}]</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each buildingTypes as building}
            {@const level = data.buildings[building.id]}
            {@const cost = getBuildingCost(building.id, level)}
            
            <div class="bg-gray-800/80 border border-gray-700 rounded-lg p-4 flex flex-col shadow-lg backdrop-blur-sm">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-3">
                        <span class="text-3xl">{building.icon}</span>
                        <div>
                            <h3 class="font-bold text-lg text-gray-200">{building.name}</h3>
                            <span class="text-xs text-blue-400 font-mono">Level {level}</span>
                        </div>
                    </div>
                </div>
                
                <div class="mt-auto">
                    <div class="text-xs text-gray-400 mb-2 flex space-x-3">
                        {#if cost}
                            <span class={data.resources.metal < cost.metal ? 'text-red-400' : 'text-gray-300'}>
                                Metal: {cost.metal.toLocaleString()}
                            </span>
                            <span class={data.resources.crystal < cost.crystal ? 'text-red-400' : 'text-gray-300'}>
                                Crystal: {cost.crystal.toLocaleString()}
                            </span>
                        {/if}
                    </div>
                    
                    <form method="POST" action="?/upgrade" use:enhance>
                        <input type="hidden" name="type" value={building.id}>
                        <input type="hidden" name="planet_id" value={data.currentPlanet.id}>
                        <button 
                            type="submit"
                            disabled={!cost || data.resources.metal < cost.metal || data.resources.crystal < cost.crystal}
                            class="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded text-sm font-bold transition"
                        >
                            Upgrade to Level {level + 1}
                        </button>
                    </form>
                </div>
            </div>
        {/each}
    </div>
</div>
