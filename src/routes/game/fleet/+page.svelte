<script lang="ts">
    import { enhance } from '$app/forms';
    import { page } from '$app/stores';
    
    let { data } = $props();

    const shipTypes = [
        { id: 'light_fighter', name: 'Light Fighter' },
        { id: 'heavy_fighter', name: 'Heavy Fighter' },
        { id: 'cruiser', name: 'Cruiser' },
        { id: 'battleship', name: 'Battleship' },
        { id: 'small_cargo', name: 'Small Cargo' },
        { id: 'colony_ship', name: 'Colony Ship' },
    ];

    // Get query params for pre-filling
    let targetGalaxy = $page.url.searchParams.get('galaxy') || data.currentPlanet.galaxy_id;
    let targetSystem = $page.url.searchParams.get('system') || data.currentPlanet.system_id;
    let targetPlanet = $page.url.searchParams.get('planet') || '';
    let targetMission = $page.url.searchParams.get('mission') || 'attack';
</script>

<div class="p-4 pb-20">
    <h2 class="text-2xl font-bold text-blue-300 mb-4">Fleet Command</h2>

    <!-- Active Fleets -->
    <div class="mb-8">
        <h3 class="text-lg font-bold text-gray-300 mb-2">Fleet Movements</h3>
        {#if data.fleets.length === 0}
            <div class="p-4 bg-gray-800/50 rounded text-gray-500 text-center">No active fleets.</div>
        {:else}
            <div class="space-y-2">
                {#each data.fleets as fleet}
                    <div class="bg-gray-800 border border-gray-700 p-3 rounded flex justify-between items-center">
                        <div>
                            <span class="text-yellow-400 font-bold uppercase text-xs">
                                {fleet.status === 'returning' ? `Returning (${fleet.mission})` : fleet.mission}
                            </span>
                            <div class="text-sm text-gray-300">
                                {#if fleet.status === 'returning'}
                                    Target: [{fleet.origin_galaxy}:{fleet.origin_system}:{fleet.origin_planet}]
                                {:else}
                                    Target: [{fleet.target_galaxy}:{fleet.target_system}:{fleet.target_planet}]
                                {/if}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs text-gray-400">Arrival</div>
                            <div class="font-mono text-blue-300">
                                {new Date(fleet.arrival_time).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Dispatch Fleet -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 class="text-lg font-bold text-gray-300 mb-4">Dispatch Fleet</h3>
        
        <form method="POST" action="?/dispatch" use:enhance={() => {
            return async ({ update }) => {
                await update({ reset: false });
            };
        }}>
            <input type="hidden" name="planet_id" value={data.currentPlanet.id}>
            
            <!-- Ship Selection -->
            <div class="space-y-2 mb-6">
                {#each shipTypes as ship}
                    <div class="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                        <span class="text-gray-300">{ship.name}</span>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs text-gray-500">Available: {data.ships ? data.ships[ship.id] : 0}</span>
                            <input type="number" name={ship.id} min="0" max={data.ships ? data.ships[ship.id] : 0} class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right text-white" placeholder="0">
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Target Coordinates -->
            <div class="grid grid-cols-3 gap-2 mb-4">
                <div>
                    <label for="galaxy" class="block text-xs text-gray-500 mb-1">Galaxy</label>
                    <input id="galaxy" type="number" name="galaxy" value={targetGalaxy} class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white">
                </div>
                <div>
                    <label for="system" class="block text-xs text-gray-500 mb-1">System</label>
                    <input id="system" type="number" name="system" value={targetSystem} class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white">
                </div>
                <div>
                    <label for="planet" class="block text-xs text-gray-500 mb-1">Planet</label>
                    <input id="planet" type="number" name="planet" value={targetPlanet} class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white" placeholder="1-15">
                </div>
            </div>

            <!-- Mission -->
            <div class="mb-6">
                <label for="mission" class="block text-xs text-gray-500 mb-1">Mission</label>
                <select id="mission" name="mission" value={targetMission} class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white">
                    <option value="attack">Attack</option>
                    <option value="transport">Transport</option>
                    <option value="espionage">Espionage</option>
                    <option value="colonize">Colonize</option>
                    <option value="expedition">Expedition</option>
                </select>
            </div>

            <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded font-bold text-white transition">
                Send Fleet
            </button>
        </form>
    </div>
</div>
