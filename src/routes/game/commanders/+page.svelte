<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';

    export let data: PageData;

    const { commanders, durationCosts, activeCommanders, darkMatter } = data;
    
    let selectedDuration = 7;

    function formatDate(dateStr: string | Date) {
        return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString();
    }
</script>

<div class="w-full max-w-6xl mx-auto p-4">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-purple-400">Commanders</h1>
        <div class="bg-gray-800 px-4 py-2 rounded-lg border border-purple-500/30">
            <span class="text-gray-400">Dark Matter:</span>
            <span class="text-purple-400 font-bold ml-2">{darkMatter}</span>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {#each Object.values(commanders) as commander}
            <div class="bg-gray-900/80 border border-gray-700 rounded-lg overflow-hidden hover:border-purple-500/50 transition-colors">
                <div class="p-4 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                    <h3 class="text-xl font-bold text-white">{commander.name}</h3>
                    {#if activeCommanders[commander.id]}
                        <span class="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded border border-green-500/30">Active</span>
                    {/if}
                </div>
                
                <div class="p-6 space-y-4">
                    <div class="h-32 bg-black/40 rounded flex items-center justify-center mb-4">
                        <!-- Placeholder for image -->
                        <span class="text-4xl">👨‍✈️</span>
                    </div>
                    
                    <p class="text-gray-300 text-sm h-12">{commander.description}</p>
                    
                    <div class="text-purple-300 text-sm font-mono">
                        Bonus: +{commander.bonusValue}% {commander.bonusType.replace('_', ' ')}
                    </div>

                    {#if activeCommanders[commander.id]}
                        <div class="text-xs text-gray-400 mt-2">
                            Expires: {formatDate(activeCommanders[commander.id])}
                        </div>
                    {/if}

                    <form method="POST" action="?/purchase" use:enhance>
                        <input type="hidden" name="commanderId" value={commander.id} />
                        
                        <div class="space-y-3 mt-4">
                            <select 
                                name="duration" 
                                class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                                bind:value={selectedDuration}
                            >
                                {#each Object.entries(durationCosts) as [days, cost]}
                                    <option value={days}>{days} Days - {cost} DM</option>
                                {/each}
                            </select>

                            <button 
                                type="submit" 
                                class="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transform"
                                disabled={darkMatter < durationCosts[selectedDuration]}
                            >
                                {activeCommanders[commander.id] ? 'Extend' : 'Recruit'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        {/each}
    </div>
</div>
