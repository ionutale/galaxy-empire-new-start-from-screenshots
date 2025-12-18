<script lang="ts">
    import { getResearchCost } from '$lib/game-config';
    import { enhance } from '$app/forms';

    let { data } = $props();
    
    // Helper to format numbers
    const f = (n: number) => Math.floor(n).toLocaleString();
</script>

<div class="p-4 pb-20">
    <h2 class="text-2xl font-bold text-blue-300 mb-6">Research Lab</h2>

    {#if data.researchLabLevel === 0}
        <div class="bg-red-900/50 border border-red-500 p-4 rounded text-center text-red-200 mb-6">
            You need a Research Lab to conduct research. <a href="/game/facilities" class="underline font-bold hover:text-white">Build one in the Facilities menu.</a>
        </div>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 {data.researchLabLevel === 0 ? 'opacity-50 pointer-events-none grayscale' : ''}">
        {#each Object.entries(data.techs) as [id, tech]}
            {@const currentLevel = data.userResearch[id] || 0}
            {@const cost = getResearchCost(id, currentLevel)}
            
            <div class="bg-gray-800 border border-gray-700 rounded p-4 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="font-bold text-lg text-green-400">{tech.name}</h3>
                        <span class="bg-gray-700 px-2 py-1 rounded text-xs">Lvl {currentLevel}</span>
                    </div>
                    <p class="text-gray-400 text-sm mb-4 h-10">{tech.description}</p>
                    
                    <div class="space-y-1 text-sm mb-4">
                        {#if cost.metal > 0}
                            <div class="flex justify-between">
                                <span class="text-gray-500">Metal:</span>
                                <span class={data.resources.metal < cost.metal ? 'text-red-500' : 'text-gray-300'}>{f(cost.metal)}</span>
                            </div>
                        {/if}
                        {#if cost.crystal > 0}
                            <div class="flex justify-between">
                                <span class="text-gray-500">Crystal:</span>
                                <span class={data.resources.crystal < cost.crystal ? 'text-red-500' : 'text-gray-300'}>{f(cost.crystal)}</span>
                            </div>
                        {/if}
                        {#if cost.gas > 0}
                            <div class="flex justify-between">
                                <span class="text-gray-500">Gas:</span>
                                <span class={data.resources.gas < cost.gas ? 'text-red-500' : 'text-gray-300'}>{f(cost.gas)}</span>
                            </div>
                        {/if}
                        {#if cost.energy > 0}
                            <div class="flex justify-between">
                                <span class="text-gray-500">Energy:</span>
                                <span class={data.resources.energy < cost.energy ? 'text-red-500' : 'text-gray-300'}>{f(cost.energy)}</span>
                            </div>
                        {/if}
                    </div>
                </div>

                <form method="POST" action="?/research" use:enhance>
                    <input type="hidden" name="techId" value={id}>
                    <input type="hidden" name="planetId" value={data.currentPlanet.id}>
                    <button 
                        type="submit" 
                        class="w-full py-2 rounded font-bold transition-colors
                            {data.resources.metal >= cost.metal && data.resources.crystal >= cost.crystal && data.resources.gas >= cost.gas && data.resources.energy >= (cost.energy || 0) && data.researchLabLevel > 0
                                ? 'bg-green-600 hover:bg-green-500 text-white' 
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'}"
                        disabled={!(data.resources.metal >= cost.metal && data.resources.crystal >= cost.crystal && data.resources.gas >= cost.gas && data.resources.energy >= (cost.energy || 0)) || data.researchLabLevel === 0}
                    >
                        Research
                    </button>
                </form>
            </div>
        {/each}
    </div>
</div>
