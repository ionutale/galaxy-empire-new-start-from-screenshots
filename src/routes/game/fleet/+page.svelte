<script lang="ts">
    import { enhance } from '$app/forms';
    
    let { data } = $props();
    const { ships, fleets, currentPlanet } = data;

    const shipTypes = [
        { id: 'light_fighter', name: 'Light Fighter' },
        { id: 'heavy_fighter', name: 'Heavy Fighter' },
        { id: 'cruiser', name: 'Cruiser' },
        { id: 'battleship', name: 'Battleship' },
        { id: 'small_cargo', name: 'Small Cargo' },
        { id: 'colony_ship', name: 'Colony Ship' },
    ];
</script>

<div class="p-4 pb-20">
    <h2 class="text-2xl font-bold text-blue-300 mb-4">Fleet Command</h2>

    <!-- Active Fleets -->
    <div class="mb-8">
        <h3 class="text-lg font-bold text-gray-300 mb-2">Fleet Movements</h3>
        {#if fleets.length === 0}
            <div class="p-4 bg-gray-800/50 rounded text-gray-500 text-center">No active fleets.</div>
        {:else}
            <div class="space-y-2">
                {#each fleets as fleet}
                    <div class="bg-gray-800 border border-gray-700 p-3 rounded flex justify-between items-center">
                        <div>
                            <span class="text-yellow-400 font-bold uppercase text-xs">{fleet.mission}</span>
                            <div class="text-sm text-gray-300">
                                Target: [{fleet.target_galaxy}:{fleet.target_system}:{fleet.target_planet}]
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
        
        <form method="POST" action="?/dispatch" use:enhance>
            <input type="hidden" name="planet_id" value={currentPlanet.id}>
            
            <!-- Ship Selection -->
            <div class="space-y-2 mb-6">
                {#each shipTypes as ship}
                    <div class="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                        <span class="text-gray-300">{ship.name}</span>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs text-gray-500">Available: {ships ? ships[ship.id] : 0}</span>
                            <input type="number" name={ship.id} min="0" max={ships ? ships[ship.id] : 0} class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right text-white" placeholder="0">
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Target Coordinates -->
            <div class="grid grid-cols-3 gap-2 mb-4">
                <div>
                    <label class="block text-xs text-gray-500 mb-1">Galaxy</label>
                    <input type="number" name="galaxy" value={currentPlanet.galaxy_id} class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white">
                </div>
                <div>
                    <label class="block text-xs text-gray-500 mb-1">System</label>
                    <input type="number" name="system" value={currentPlanet.system_id} class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white">
                </div>
                <div>
                    <label class="block text-xs text-gray-500 mb-1">Planet</label>
                    <input type="number" name="planet" class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white" placeholder="1-15">
                </div>
            </div>

            <!-- Mission -->
            <div class="mb-6">
                <label class="block text-xs text-gray-500 mb-1">Mission</label>
                <select name="mission" class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white">
                    <option value="attack">Attack</option>
                    <option value="transport">Transport</option>
                    <option value="espionage">Espionage</option>
                    <option value="colonize">Colonize</option>
                </select>
            </div>

            <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded font-bold text-white transition">
                Send Fleet
            </button>
        </form>
    </div>
</div>
