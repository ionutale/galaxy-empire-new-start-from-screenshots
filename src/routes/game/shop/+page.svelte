<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';

    export let data: PageData;

    const { shopItems, activeBoosters, darkMatter } = data;

    function formatDate(dateStr: string | Date) {
        return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString();
    }
</script>

<div class="w-full max-w-6xl mx-auto p-4 pb-20">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-yellow-400">Dark Matter Shop</h1>
        <div class="bg-gray-800 px-4 py-2 rounded-lg border border-purple-500/30">
            <span class="text-gray-400">Dark Matter:</span>
            <span class="text-purple-400 font-bold ml-2">{darkMatter}</span>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each Object.values(shopItems) as item}
            <div class="bg-gray-900/80 border border-gray-700 rounded-lg overflow-hidden hover:border-yellow-500/50 transition-colors shadow-lg">
                <div class="p-4 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                    <h3 class="text-xl font-bold text-white">{item.name}</h3>
                    {#if activeBoosters[item.id]}
                        <span class="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded border border-green-500/30">Active</span>
                    {/if}
                </div>
                
                <div class="p-6 space-y-4">
                    <div class="h-24 bg-black/40 rounded flex items-center justify-center mb-4">
                        <!-- Placeholder for image -->
                        <span class="text-4xl">🛒</span>
                    </div>
                    
                    <p class="text-gray-300 text-sm h-12">{item.description}</p>
                    
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-400">Cost:</span>
                        <span class="text-purple-400 font-bold">{item.cost} DM</span>
                    </div>

                    {#if activeBoosters[item.id]}
                        <div class="text-xs text-gray-400 mt-2">
                            Expires: {formatDate(activeBoosters[item.id])}
                        </div>
                    {/if}

                    <form method="POST" action="?/purchase" use:enhance>
                        <input type="hidden" name="itemId" value={item.id} />
                        
                        <button 
                            type="submit" 
                            class="w-full mt-4 py-2 px-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transform"
                            disabled={darkMatter < item.cost}
                        >
                            {activeBoosters[item.id] ? 'Extend' : 'Purchase'}
                        </button>
                    </form>
                </div>
            </div>
        {/each}
    </div>
</div>
