<script lang="ts">
    import { page } from '$app/stores';
    
    let { data } = $props();
    const { galaxy, system, slots } = data;

    function prevSystem() {
        if (system > 1) return `/game/system?galaxy=${galaxy}&system=${system - 1}`;
        return '#';
    }

    function nextSystem() {
        if (system < 499) return `/game/system?galaxy=${galaxy}&system=${system + 1}`;
        return '#';
    }
</script>

<div class="p-4 pb-20">
    <!-- Navigation Header -->
    <div class="flex items-center justify-between bg-gray-800 p-4 rounded-lg mb-4 border border-gray-700">
        <a href={prevSystem()} class="p-2 bg-gray-700 rounded hover:bg-gray-600 transition {system <= 1 ? 'opacity-50 pointer-events-none' : ''}">
            ◀
        </a>
        <div class="text-center">
            <h2 class="text-xl font-bold text-blue-300">Galaxy {galaxy}</h2>
            <div class="text-2xl font-mono font-bold">System {system}</div>
        </div>
        <a href={nextSystem()} class="p-2 bg-gray-700 rounded hover:bg-gray-600 transition {system >= 499 ? 'opacity-50 pointer-events-none' : ''}">
            ▶
        </a>
    </div>

    <!-- System Grid -->
    <div class="space-y-2">
        <div class="grid grid-cols-12 gap-2 text-xs text-gray-400 px-2 uppercase font-bold">
            <div class="col-span-1">Pos</div>
            <div class="col-span-2">Image</div>
            <div class="col-span-4">Planet</div>
            <div class="col-span-3">Player</div>
            <div class="col-span-2">Actions</div>
        </div>

        {#each slots as slot}
            <div class="bg-gray-800/60 border border-gray-700 rounded p-2 flex items-center grid grid-cols-12 gap-2 hover:bg-gray-700/50 transition">
                <div class="col-span-1 font-mono text-gray-500 flex items-center justify-center">
                    {slot.number}
                </div>
                
                <div class="col-span-2 flex items-center justify-center">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 shadow-lg {slot.planet ? '' : 'opacity-20 grayscale'}"></div>
                </div>
                
                <div class="col-span-4 flex flex-col justify-center">
                    {#if slot.planet}
                        <span class="font-bold text-blue-200">{slot.planet.name}</span>
                    {:else}
                        <span class="text-gray-500 italic">Empty Space</span>
                    {/if}
                </div>
                
                <div class="col-span-3 flex items-center">
                    {#if slot.planet && slot.planet.username}
                        <span class="text-yellow-400">{slot.planet.username}</span>
                    {:else}
                        <span class="text-gray-600">-</span>
                    {/if}
                </div>
                
                <div class="col-span-2 flex items-center justify-end space-x-1">
                    {#if slot.planet}
                        {#if slot.planet.user_id !== $page.data.user.id}
                            <button class="p-1 bg-red-900/50 text-red-400 rounded hover:bg-red-800" title="Attack">⚔️</button>
                            <button class="p-1 bg-blue-900/50 text-blue-400 rounded hover:bg-blue-800" title="Espionage">👁️</button>
                        {:else}
                            <span class="text-green-500 text-xs">You</span>
                        {/if}
                    {:else}
                        <button class="p-1 bg-green-900/50 text-green-400 rounded hover:bg-green-800" title="Colonize">🌱</button>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>
