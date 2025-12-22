<script lang="ts">
    import { enhance } from '$app/forms';
    import { page } from '$app/stores';
    import { invalidateAll } from '$app/navigation';
    import Spinner from '$lib/components/Spinner.svelte';
    
    let { data } = $props();

    const shipTypes = [
        { id: 'light_fighter', name: 'Light Fighter' },
        { id: 'heavy_fighter', name: 'Heavy Fighter' },
        { id: 'cruiser', name: 'Cruiser' },
        { id: 'battleship', name: 'Battleship' },
        { id: 'battle_cruiser', name: 'Battle Cruiser' },
        { id: 'bomber', name: 'Bomber' },
        { id: 'destroyer', name: 'Destroyer' },
        { id: 'death_star', name: 'Death Star' },
        { id: 'small_cargo', name: 'Small Cargo' },
        { id: 'large_cargo', name: 'Large Cargo' },
        { id: 'colony_ship', name: 'Colony Ship' },
        { id: 'espionage_probe', name: 'Espionage Probe' },
        { id: 'recycler', name: 'Recycler' },
    ];

    // Reactive state for ship inputs
    let shipCounts = $state(
        Object.fromEntries(shipTypes.map(s => [s.id, 0]))
    );
    let ships = $derived(data.ships || {}) as any;

    // Get query params for pre-filling
    let targetGalaxy = $state($page.url.searchParams.get('galaxy') || data.currentPlanet.galaxyId);
    let targetSystem = $state($page.url.searchParams.get('system') || data.currentPlanet.systemId);
    let targetPlanet = $state($page.url.searchParams.get('planet') || '');
    let targetMission = $state($page.url.searchParams.get('mission') || 'attack');
    let newTemplateName = $state('');
    let loading = $state(false);
    let deletingTemplate = $state<Record<string, boolean>>({});
    let savingTemplate = $state(false);

    function toCamel(s: string) {
        return s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    }

    function loadTemplate(template: any) {
        // Reset all counts first
        for (const key in shipCounts) {
            shipCounts[key] = 0;
        }
        // Apply template values
        if (template.ships) {
            for (const [key, value] of Object.entries(template.ships)) {
                if (key in shipCounts) {
                    shipCounts[key] = Number(value);
                }
            }
        }
    }
</script>

<div class="p-4 pb-20">
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-blue-300">Fleet Command</h2>
        <a href="/game/fleet/movements" class="bg-blue-900/50 hover:bg-blue-800 border border-blue-700 text-blue-200 px-3 py-1 rounded text-sm transition flex items-center gap-2 active:scale-95 transition-transform">
            <span>📡</span> View Movements ({data.activeFleetsCount})
        </a>
    </div>

    <!-- Fleet Templates -->
    {#if data.templates && data.templates.length > 0}
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
            <h3 class="text-lg font-bold text-gray-300 mb-4">Fleet Templates</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each data.templates as template}
                    <div class="bg-gray-900/50 p-3 rounded border border-gray-700 flex justify-between items-center gap-2">
                        <div class="min-w-0 flex-1">
                            <div class="font-bold text-blue-300 truncate">{template.name}</div>
                            <div class="text-xs text-gray-500 truncate">
                                {Object.entries(template.ships).map(([k, v]) => `${v} ${shipTypes.find(s => s.id === k)?.name || k}`).join(', ')}
                            </div>
                        </div>
                        <div class="flex gap-2 shrink-0">
                            <button 
                                onclick={() => loadTemplate(template)}
                                class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded active:scale-95 transition-transform"
                            >
                                Load
                            </button>
                            <form method="POST" action="?/deleteTemplate" use:enhance={() => {
                                deletingTemplate[template.id] = true;
                                return async ({ update }) => {
                                    deletingTemplate[template.id] = false;
                                    await update();
                                };
                            }}>
                                <input type="hidden" name="id" value={template.id}>
                                <button type="submit" disabled={deletingTemplate[template.id]} class="px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 text-xs rounded border border-red-800 active:scale-95 transition-transform flex items-center justify-center disabled:opacity-50">
                                    {#if deletingTemplate[template.id]}
                                        <Spinner size="sm" />
                                    {:else}
                                        ✕
                                    {/if}
                                </button>
                            </form>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

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
                    {@const shipKey = toCamel(ship.id)}
                    <div class="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                        <span class="text-gray-300">{ship.name}</span>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs text-gray-500">Available: {ships[shipKey] || 0}</span>
                            <input 
                                type="number" 
                                name={ship.id} 
                                bind:value={shipCounts[ship.id]}
                                min="0" 
                                max={ships[shipKey] || 0} 
                                class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right text-white" 
                                placeholder="0"
                            >
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Save Template Section -->
            <div class="bg-gray-900/30 p-3 rounded mb-6 border border-gray-700/50">
                <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <span class="text-sm text-gray-400 whitespace-nowrap">Save Selection as Template:</span>
                    <div class="flex flex-1 gap-2">
                        <input 
                            type="text" 
                            bind:value={newTemplateName}
                            placeholder="Template Name" 
                            class="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        >
                        <button 
                            type="button"
                            disabled={savingTemplate}
                            onclick={() => {
                                if (!newTemplateName) return;
                                savingTemplate = true;
                                
                                const formData = new FormData();
                                formData.append('name', newTemplateName);
                                for (const [id, count] of Object.entries(shipCounts)) {
                                    if (count > 0) formData.append(id, count.toString());
                                }
                                
                                fetch('?/createTemplate', {
                                    method: 'POST',
                                    body: formData
                                }).then(async () => {
                                    newTemplateName = '';
                                    await invalidateAll();
                                    savingTemplate = false;
                                });
                            }}
                            class="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-sm rounded active:scale-95 transition-transform flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {#if savingTemplate}
                                <Spinner size="sm" class="mr-2" />
                            {/if}
                            Save
                        </button>
                    </div>
                </div>
            </div>

            <!-- Resource Selection -->
            <div class="bg-gray-900/50 p-3 rounded mb-6">
                <h4 class="text-sm font-bold text-gray-400 mb-2">Resources</h4>
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label for="metal" class="block text-xs text-gray-500 mb-1">Metal</label>
                        <input id="metal" type="number" name="metal" min="0" class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-right" placeholder="0">
                    </div>
                    <div>
                        <label for="crystal" class="block text-xs text-gray-500 mb-1">Crystal</label>
                        <input id="crystal" type="number" name="crystal" min="0" class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-right" placeholder="0">
                    </div>
                    <div>
                        <label for="gas" class="block text-xs text-gray-500 mb-1">Gas</label>
                        <input id="gas" type="number" name="gas" min="0" class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-right" placeholder="0">
                    </div>
                </div>
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
                    <option value="deploy">Deploy</option>
                    <option value="espionage">Espionage</option>
                    <option value="colonize">Colonize</option>
                    <option value="expedition">Expedition</option>
                </select>
            </div>

            <button type="submit" disabled={loading} class="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded font-bold text-white transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                {#if loading}
                    <Spinner size="sm" class="mr-2" />
                {/if}
                Send Fleet
            </button>
        </form>
    </div>
</div>
