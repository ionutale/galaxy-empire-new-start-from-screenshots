<script lang="ts">
    import { enhance } from '$app/forms';
    import { getBuildingCost, getProduction, DEFENSES } from '$lib/game-config';
    import Spinner from '$lib/components/Spinner.svelte';
    
    let { data } = $props();
    let loading = $state<Record<string, boolean>>({});

    let resources = $derived({
        metal: data.resources?.metal || 0,
        crystal: data.resources?.crystal || 0,
        gas: data.resources?.gas || 0,
        energy: data.resources?.energy || 0
    });

    let buildings = $derived(data.buildings || {}) as any;
    let defenses = $derived(data.defenses || {}) as any;

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

    let isRenaming = $state(false);
</script>

<div class="p-4 pb-20">
    {#if !data.currentPlanet}
        <div class="flex flex-col items-center justify-center h-full text-center p-8">
            <h2 class="text-2xl font-bold text-red-400 mb-4">No Planet Found</h2>
            <p class="text-gray-400">You don't seem to have any planets. Please contact support or try re-registering.</p>
        </div>
    {:else}
    <div class="mb-6 text-center relative group">
        {#if isRenaming}
            <form method="POST" action="?/renamePlanet" use:enhance={() => {
                loading['rename'] = true;
                return async ({ update }) => {
                    loading['rename'] = false;
                    await update();
                    isRenaming = false;
                };
            }} class="flex justify-center items-center gap-2">
                <input type="hidden" name="planet_id" value={data.currentPlanet.id}>
                <input 
                    type="text" 
                    name="name" 
                    value={data.currentPlanet.name} 
                    class="bg-gray-700 text-white px-2 py-1 rounded border border-blue-500 focus:outline-none"
                    maxlength="20"
                    autofocus
                >
                <button type="submit" disabled={loading['rename']} class="text-green-400 hover:text-green-300 disabled:opacity-50">
                    {#if loading['rename']}
                        <Spinner size="sm" />
                    {:else}
                        ✓
                    {/if}
                </button>
                <button type="button" onclick={() => isRenaming = false} class="text-red-400 hover:text-red-300">✕</button>
            </form>
        {:else}
            <h2 class="text-2xl font-bold text-blue-300 flex justify-center items-center gap-2">
                {data.currentPlanet.name}
                <button onclick={() => isRenaming = true} class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white text-sm">✎</button>
            </h2>
        {/if}
        <p class="text-gray-400 text-sm">[{data.currentPlanet.galaxyId}:{data.currentPlanet.systemId}:{data.currentPlanet.planetNumber}]</p>
    </div>

    <!-- Resources Section -->
    <h3 class="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2">Resources</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {#each resourceBuildings as building}
            {@const level = buildings?.[toCamel(building.id)] ?? 0}
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
                                <span class={resources.metal < cost.metal ? 'text-red-400' : 'text-gray-300'}>
                                    Metal: {cost.metal.toLocaleString()}
                                </span>
                            {/if}
                            {#if cost.crystal > 0}
                                <span class={resources.crystal < cost.crystal ? 'text-red-400' : 'text-gray-300'}>
                                    Crystal: {cost.crystal.toLocaleString()}
                                </span>
                            {/if}
                            {#if (cost.gas || 0) > 0}
                                <span class={resources.gas < (cost.gas || 0) ? 'text-red-400' : 'text-gray-300'}>
                                    Gas: {(cost.gas || 0).toLocaleString()}
                                </span>
                            {/if}
                        {/if}
                    </div>
                    
                    <form method="POST" action="?/upgrade" use:enhance={() => {
                        loading[building.id] = true;
                        return async ({ update }) => {
                            loading[building.id] = false;
                            await update();
                        };
                    }}>
                        <input type="hidden" name="type" value={building.id}>
                        <input type="hidden" name="planet_id" value={data.currentPlanet.id}>
                        <button 
                            type="submit"
                            disabled={!cost || resources.metal < cost.metal || resources.crystal < cost.crystal || ((cost.gas || 0) > 0 && resources.gas < (cost.gas || 0)) || loading[building.id]}
                            class="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded text-sm font-bold transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50"
                        >
                            {#if loading[building.id]}
                                <Spinner size="sm" class="mr-2" />
                            {/if}
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
            {@const level = buildings[toCamel(building.id)]}
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
                                <span class={resources.metal < cost.metal ? 'text-red-400' : 'text-gray-300'}>
                                    Metal: {cost.metal.toLocaleString()}
                                </span>
                            {/if}
                            {#if cost.crystal > 0}
                                <span class={resources.crystal < cost.crystal ? 'text-red-400' : 'text-gray-300'}>
                                    Crystal: {cost.crystal.toLocaleString()}
                                </span>
                            {/if}
                            {#if (cost.gas || 0) > 0}
                                <span class={resources.gas < (cost.gas || 0) ? 'text-red-400' : 'text-gray-300'}>
                                    Gas: {(cost.gas || 0).toLocaleString()}
                                </span>
                            {/if}
                        {/if}
                    </div>
                    
                    <form method="POST" action="?/upgrade" use:enhance={() => {
                        loading[building.id] = true;
                        return async ({ update }) => {
                            loading[building.id] = false;
                            await update();
                        };
                    }}>
                        <input type="hidden" name="type" value={building.id}>
                        <input type="hidden" name="planet_id" value={data.currentPlanet.id}>
                        <button 
                            type="submit"
                            disabled={!cost || resources.metal < cost.metal || resources.crystal < cost.crystal || ((cost.gas || 0) > 0 && resources.gas < (cost.gas || 0)) || loading[building.id]}
                            class="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded text-sm font-bold transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50"
                        >
                            {#if loading[building.id]}
                                <Spinner size="sm" class="mr-2" />
                            {/if}
                            Upgrade to Level {level + 1}
                        </button>
                    </form>
                </div>
            </div>
        {/each}
    </div>

    <!-- Defenses Section -->
    <h3 class="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2 mt-8">Defenses</h3>
    
    {#if buildings.shipyard === 0}
        <div class="bg-red-900/50 border border-red-500 p-4 rounded text-center text-red-200 mb-6">
            You need a Shipyard to build defenses. Build one in the Facilities section above.
        </div>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 {buildings.shipyard === 0 ? 'opacity-50 pointer-events-none grayscale' : ''}">
        {#each defenseTypes as type}
            {@const defense = DEFENSES[type as keyof typeof DEFENSES]}
            {@const count = defenses[toCamel(type)] || 0}
            
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
                    
                    <form method="POST" action="?/build_defense" use:enhance={() => {
                        loading[type] = true;
                        return async ({ update }) => {
                            loading[type] = false;
                            await update();
                        };
                    }} class="flex space-x-2">
                        <input type="hidden" name="type" value={type}>
                        <input type="hidden" name="planet_id" value={data.currentPlanet.id}>
                        
                        {#if defense.max && count >= defense.max}
                            <button disabled class="w-full bg-gray-600 text-gray-400 rounded text-sm font-bold py-1">Max Reached</button>
                        {:else}
                            <input type="number" name="amount" min="1" value="1" class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center" disabled={buildings.shipyard === 0}>
                            <button 
                                type="submit"
                                class="flex-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition disabled:bg-gray-600 disabled:cursor-not-allowed active:scale-95 transform flex items-center justify-center disabled:opacity-50"
                                disabled={buildings.shipyard === 0 || loading[type]}
                            >
                                {#if loading[type]}
                                    <Spinner size="sm" class="mr-2" />
                                {/if}
                                Build
                            </button>
                        {/if}
                    </form>
                </div>
            </div>
        {/each}
    </div>
    {/if}
</div>
