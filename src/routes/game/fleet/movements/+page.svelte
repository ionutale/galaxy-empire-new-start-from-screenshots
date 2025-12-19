<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { invalidateAll } from '$app/navigation';
    
    let { data } = $props();

    let now = $state(Date.now());
    let interval: any;
    let reloading = false;

    onMount(() => {
        interval = setInterval(async () => {
            now = Date.now();

            if (!reloading) {
                const shouldReload = data.fleets.some((f: any) => new Date(f.arrival_time).getTime() <= now);
                if (shouldReload) {
                    reloading = true;
                    await invalidateAll();
                    reloading = false;
                }
            }
        }, 1000);
    });

    onDestroy(() => {
        if (interval) clearInterval(interval);
    });

    function getProgress(fleet: any) {
        const start = new Date(fleet.departure_time).getTime();
        const end = new Date(fleet.arrival_time).getTime();
        const total = end - start;
        if (total <= 0) return 100;
        const current = now - start;
        const pct = Math.max(0, Math.min(100, (current / total) * 100));
        return pct;
    }

    function getRemainingTime(fleet: any) {
        const end = new Date(fleet.arrival_time).getTime();
        const diff = Math.max(0, end - now);
        const seconds = Math.floor((diff / 1000) % 60);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const hours = Math.floor((diff / (1000 * 60 * 60)));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
</script>

<div class="p-4 pb-20">
    <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-blue-300">Fleet Movements</h2>
        <a href="/game/fleet" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-bold transition">
            ← Back to Fleet
        </a>
    </div>

    {#if data.fleets.length === 0}
        <div class="p-8 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 text-center">
            <div class="text-4xl mb-2">📡</div>
            No active fleet movements detected.
        </div>
    {:else}
        <div class="space-y-3">
            {#each data.fleets as fleet}
                <div class="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-lg flex flex-col gap-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-yellow-400 font-bold uppercase text-sm tracking-wider">
                                    {fleet.status === 'returning' ? 'Returning' : fleet.mission}
                                </span>
                                {#if fleet.status === 'returning'}
                                    <span class="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full">Return Flight</span>
                                {/if}
                            </div>
                            
                            <div class="text-sm text-gray-300 flex items-center gap-2">
                                <span>From: <span class="font-mono text-white">[{fleet.origin_galaxy}:{fleet.origin_system}:{fleet.origin_planet}]</span></span>
                                <span class="text-gray-500">→</span>
                                <span>To: <span class="font-mono text-white">[{fleet.target_galaxy}:{fleet.target_system}:{fleet.target_planet}]</span></span>
                            </div>
                        </div>
                        
                        <div class="text-right">
                            <div class="text-xs text-gray-400 uppercase tracking-wide mb-1">Arrival</div>
                            <div class="font-mono text-blue-300">
                                {new Date(fleet.arrival_time).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="relative pt-4 pb-2">
                        <div class="relative w-full h-2 bg-gray-700 rounded-full">
                            <div class="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-1000 ease-linear" style="width: {getProgress(fleet)}%"></div>
                            <!-- Icon -->
                            <div class="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear z-10" style="left: {getProgress(fleet)}%">
                                <div class="text-xl transform -translate-x-1/2 {fleet.status === 'returning' ? 'rotate-180' : ''}">
                                    🚀
                                </div>
                            </div>
                        </div>
                        <div class="text-center mt-2 font-mono text-lg font-bold text-blue-200">
                            {getRemainingTime(fleet)}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
