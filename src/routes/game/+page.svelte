<script lang="ts">
    import { enhance } from '$app/forms';
    import { getBuildingCost, getProduction, DEFENSES } from '$lib/game-config';
    
    let { data } = $props();

    const resourceBuildings = [
        { id: 'metal_mine', name: 'Metal Mine', icon: '⛏️' },
        { id: 'crystal_mine', name: 'Crystal Mine', icon: '💎' },
        { id: 'gas_extractor', name: 'Gas Extractor', icon: '⛽' },
        { id: 'solar_plant', name: 'Solar Plant', icon: '☀️' },
    ];

    const facilityBuildings = [
        { id: 'robotics_factory', name: 'Robotics Factory', icon: '🤖' },
        { id: 'shipyard', name: 'Shipyard', icon: '🛠️' },
        { id: 'research_lab', name: 'Research Lab', icon: '🔬' },
        { id: 'nanite_factory', name: 'Nanite Factory', icon: '🧬' },
    ];

    const defenseTypes = Object.keys(DEFENSES);

    function toCamel(s: string) {
        return s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    }
</script>

<div class="p-4 pb-20">
    <div class="mb-6 text-center">
        <h2 class="text-2xl font-bold text-blue-300">{data.currentPlanet.name}</h2>
        <p class="text-gray-400 text-sm">[{data.currentPlanet.galaxyId}:{data.currentPlanet.systemId}:{data.currentPlanet.planetNumber}]</p>
    </div>

    <!-- Resources Section -->
    <h3 class="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2">Resources</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {#each resourceBuildings as building}
            {@const level = data.buildings[toCamel(building.id)]}
            {@const cost = getBuildingCost(building.id, level)}
            {@const production = getProduction(building.id, level)}
            
            <div class="bg-gray-800/80 border border-gray-700 rounded-lg p-4 flex flex-col shadow-lg backdrop-blur-sm">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-3">
                        <span class="text-3xl">{building.icon}</span>
                        <div>
                            <h3 class="font-bold text-lg text-gray-200">{building.name}</h3>
                            <span class="text-xs text-blue-400 font-mono">Level {level}</span>
                        </div>
                    </div>
                    {#if production > 0}
                        <div class="text-right">
                            <div class="text-xs text-gray-400">Hourly Output</div>
                            <div class="text-sm font-mono text-green-400">+{production.toLocaleString()}</div>
                        </div>
                    {/if}
                </div>
                
                <div class="mt-auto">
                    <div class="text-xs text-gray-400 mb-2 flex flex-wrap gap-2">
                        {#if cost}
                            {#if cost.metal > 0}
                                <span class={data.resources.metal < cost.metal ? 'text-red-400' : 'text-gray-300'}>
                                    Metal: {cost.metal.toLocaleString()}
                                </span>
                            {/if}
                            {#if cost.crystal > 0}
                                <span class={data.resources.crystal < cost.crystal ? 'text-red-400' : 'text-gray-300'}>
                                    Crystal: {cost.crystal.toLocaleString()}
                                </span>
                            {/if}
                            {#if (cost.gas || 0) > 0}
                                <span class={data.resources.gas < (cost.gas || 0) ? 'text-red-400' : 'text-gray-300'}>
                                    Gas: {(cost.gas || 0).toLocaleString()}
                                </span>
                            {/if}
                        {/if}
                    </div>
                    
                    <form method="POST" action="?/upgrade" use:enhance>
                        <input type="hidden" name="type" value={building.id}>
                        <input type="hidden" name="planet_id" value={data.currentPlanet.id}>
                        <button 
                            type="submit"
                            disabled={!cost || data.resources.metal < cost.metal || data.resources.crystal < cost.crystal || ((cost.gas || 0) > 0 && data.resources.gas < (cost.gas || 0))}
                            class="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded text-sm font-bold transition-transform active:scale-95"
                        >
                            Upgrade to Level {level + 1}
                        </button>
                    </form>
                </div>
            </div>
        {/each}
    </div>

    <!-- Facilities Section -->
    <h3 class="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2">Facilities</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each facilityBuildings as building}
            {@const level = data.buildings[toCamel(building.id)]}
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
                    <div class="text-xs text-gray-400 mb-2 flex flex-wrap gap-2">
                        {#if cost}
                            {#if cost.metal > 0}
                                <span class={data.resources.metal < cost.metal ? 'text-red-400' : 'text-gray-300'}>
                                    Metal: {cost.metal.toLocaleString()}
                                </span>
                            {/if}
                            {#if cost.crystal > 0}
                                <span class={data.resources.crystal < cost.crystal ? 'text-red-400' : 'text-gray-300'}>
                                    Crystal: {cost.crystal.toLocaleString()}
                                </span>
                            {/if}
                            {#if (cost.gas || 0) > 0}
                                <span class={data.resources.gas < (cost.gas || 0) ? 'text-red-400' : 'text-gray-300'}>
                                    Gas: {(cost.gas || 0).toLocaleString()}
                                </span>
                            {/if}
                        {/if}
                    </div>
                    
                    <form method="POST" action="?/upgrade" use:enhance>
                        <input type="hidden" name="type" value={building.id}>
                        <input type="hidden" name="planet_id" value={data.currentPlanet.id}>
                        <button 
                            type="submit"
                            disabled={!cost || data.resources.metal < cost.metal || data.resources.crystal < cost.crystal || ((cost.gas || 0) > 0 && data.resources.gas < (cost.gas || 0))}
                            class="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded text-sm font-bold transition-transform active:scale-95"
                        >
                            Upgrade to Level {level + 1}
                        </button>
                    </form>
                </div>
            </div>
        {/each}
    </div>

    <!-- Defenses Section -->
    <h3 class="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2 mt-8">Defenses</h3>
    
    {#if data.buildings.shipyard === 0}
        <div class="bg-red-900/50 border border-red-500 p-4 rounded text-center text-red-200 mb-6">
            You need a Shipyard to build defenses. Build one in the Facilities section above.
        </div>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 {data.buildings.shipyard === 0 ? 'opacity-50 pointer-events-none grayscale' : ''}">
        {#each defenseTypes as type}
            {@const defense = DEFENSES[type as keyof typeof DEFENSES]}
            {@const count = data.defenses ? data.defenses[toCamel(type)] : 0}
            
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col shadow-lg">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-lg text-gray-200">{defense.name}</h3>
                    <span class="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">Owned: {count}</span>
                </div>
                
                <div class="text-xs text-gray-400 mb-4 space-y-1">
                    <div class="flex justify-between"><span>Attack:</span> <span class="text-red-400">{defense.attack}</span></div>
                    <div class="flex justify-between"><span>Defense:</span> <span class="text-green-400">{defense.defense}</span></div>
                    <div class="flex justify-between"><span>Shield:</span> <span class="text-blue-400">{defense.shield}</span></div>
                </div>
                
                <div class="mt-auto">
                    <div class="text-xs text-gray-500 mb-2 space-x-2">
                        {#if defense.cost.metal > 0}<span>M: {defense.cost.metal.toLocaleString()}</span>{/if}
                        {#if defense.cost.crystal > 0}<span>C: {defense.cost.crystal.toLocaleString()}</span>{/if}
                        {#if (defense.cost.gas || 0) > 0}<span>G: {(defense.cost.gas || 0).toLocaleString()}</span>{/if}
                    </div>
                    
                    <form method="POST" action="?/build_defense" use:enhance class="flex space-x-2">
                        <input type="hidden" name="type" value={type}>
                        <input type="hidden" name="planet_id" value={data.currentPlanet.id}>
                        
                        {#if defense.max && count >= defense.max}
                            <button disabled class="w-full bg-gray-600 text-gray-400 rounded text-sm font-bold py-1">Max Reached</button>
                        {:else}
                            <input type="number" name="amount" min="1" value="1" class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center" disabled={data.buildings.shipyard === 0}>
                            <button 
                                type="submit"
                                class="flex-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition disabled:bg-gray-600 disabled:cursor-not-allowed active:scale-95 transform"
                                disabled={data.buildings.shipyard === 0}
                            >
                                Build
                            </button>
                        {/if}
                    </form>
                </div>
            </div>
        {/each}
    </div>
</div>
