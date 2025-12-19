<script lang="ts">
    import { page } from '$app/stores';
    
    let { data } = $props();

    function prevSystem() {
        if (data.system > 1) return `/game/system?galaxy=${data.galaxy}&system=${data.system - 1}`;
        return '#';
    }

    function nextSystem() {
        if (data.system < 499) return `/game/system?galaxy=${data.galaxy}&system=${data.system + 1}`;
        return '#';
    }
</script>

<div class="p-4 pb-20">
    <!-- Navigation Header -->
    <div class="flex items-center justify-between bg-gray-800 p-4 rounded-lg mb-4 border border-gray-700">
        <a href={prevSystem()} class="p-2 bg-gray-700 rounded hover:bg-gray-600 transition {data.system <= 1 ? 'opacity-50 pointer-events-none' : ''}">
            ◀
        </a>
        <div class="text-center">
            <h2 class="text-xl font-bold text-blue-300">Galaxy {data.galaxy}</h2>
            <div class="text-2xl font-mono font-bold">System {data.system}</div>
        </div>
        <a href={nextSystem()} class="p-2 bg-gray-700 rounded hover:bg-gray-600 transition {data.system >= 499 ? 'opacity-50 pointer-events-none' : ''}">
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

        {#each data.slots as slot}
            <div class="bg-gray-800/60 border border-gray-700 rounded p-2 flex items-center grid grid-cols-12 gap-2 hover:bg-gray-700/50 transition">
                <div class="col-span-1 font-mono text-gray-500 flex items-center justify-center">
                    {slot.number}
                </div>
                
                <div class="col-span-2 flex items-center justify-center">
                    {#if slot.isNebula}
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 shadow-lg animate-pulse"></div>
                    {:else}
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 shadow-lg {slot.planet ? '' : 'opacity-20 grayscale'}"></div>
                    {/if}
                </div>
                
                <div class="col-span-4 flex flex-col justify-center">
                    {#if slot.isNebula}
                        <span class="font-bold text-purple-300">Mysterious Nebula</span>
                    {:else if slot.planet}
                        <span class="font-bold text-blue-200">{slot.planet.name}</span>
                    {:else}
                        <span class="text-gray-500 italic">Empty Space</span>
                    {/if}
                </div>
                
                <div class="col-span-3 flex items-center">
                    {#if slot.isNebula}
                        <span class="text-purple-400 italic">Unknown</span>
                    {:else if slot.planet && slot.planet.username}
                        <span class="text-yellow-400">{slot.planet.username}</span>
                    {:else}
                        <span class="text-gray-600">-</span>
                    {/if}
                </div>
                
                <div class="col-span-2 flex items-center justify-end space-x-1">
                    {#if slot.isNebula}
                        <a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet=16&mission=expedition" class="p-1 bg-purple-900/50 text-purple-400 rounded hover:bg-purple-800 flex items-center justify-center transition-transform active:scale-95" title="Expedition">🔭</a>
                    {:else if slot.planet}
                        {#if slot.planet.userId !== $page.data.user.id}
                            <a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=attack" class="p-1 bg-red-900/50 text-red-400 rounded hover:bg-red-800 flex items-center justify-center transition-transform active:scale-95" title="Attack">⚔️</a>
                            <a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=espionage" class="p-1 bg-blue-900/50 text-blue-400 rounded hover:bg-blue-800 flex items-center justify-center transition-transform active:scale-95" title="Espionage">👁️</a>
                        {:else}
                            <span class="text-green-500 text-xs">You</span>
                        {/if}
                    {:else}
                        <a href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=colonize" class="p-1 bg-green-900/50 text-green-400 rounded hover:bg-green-800 flex items-center justify-center transition-transform active:scale-95" title="Colonize">🌱</a>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>
