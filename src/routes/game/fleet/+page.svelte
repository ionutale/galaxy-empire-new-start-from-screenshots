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
		{ id: 'recycler', name: 'Recycler' }
	];

	// Reactive state for ship inputs
	let shipCounts = $state(Object.fromEntries(shipTypes.map((s) => [s.id, 0])));
	let ships = $derived(data.ships || {}) as any;

	// Get query params for pre-filling
	const currentGalaxy = data.currentPlanet?.galaxyId || '';
	const currentSystem = data.currentPlanet?.systemId || '';
	let targetGalaxy = $state($page.url.searchParams.get('galaxy') || currentGalaxy);
	let targetSystem = $state($page.url.searchParams.get('system') || currentSystem);
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
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-2xl font-bold text-blue-300">Fleet Command</h2>
		<a
			href="/game/fleet/movements"
			class="flex items-center gap-2 rounded border border-blue-700 bg-blue-900/50 px-3 py-1 text-sm text-blue-200 transition transition-transform hover:bg-blue-800 active:scale-95"
		>
			<span>📡</span> View Movements ({data.activeFleetsCount})
		</a>
	</div>

	<!-- Fleet Templates -->
	{#if data.templates && data.templates.length > 0}
		<div class="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-4">
			<h3 class="mb-4 text-lg font-bold text-gray-300">Fleet Templates</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each data.templates as template}
					<div
						class="flex items-center justify-between gap-2 rounded border border-gray-700 bg-gray-900/50 p-3"
					>
						<div class="min-w-0 flex-1">
							<div class="truncate font-bold text-blue-300">{template.name}</div>
							<div class="truncate text-xs text-gray-500">
								{Object.entries(template.ships)
									.map(([k, v]) => `${v} ${shipTypes.find((s) => s.id === k)?.name || k}`)
									.join(', ')}
							</div>
						</div>
						<div class="flex shrink-0 gap-2">
							<button
								onclick={() => loadTemplate(template)}
								class="rounded bg-blue-600 px-2 py-1 text-xs text-white transition-transform hover:bg-blue-500 active:scale-95"
							>
								Load
							</button>
							<form
								method="POST"
								action="?/deleteTemplate"
								use:enhance={() => {
									deletingTemplate[template.id] = true;
									return async ({ update }) => {
										deletingTemplate[template.id] = false;
										await update();
									};
								}}
							>
								<input type="hidden" name="id" value={template.id} />
								<button
									type="submit"
									disabled={deletingTemplate[template.id]}
									class="flex items-center justify-center rounded border border-red-800 bg-red-900/50 px-2 py-1 text-xs text-red-200 transition-transform hover:bg-red-800 active:scale-95 disabled:opacity-50"
								>
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
	<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
		<h3 class="mb-4 text-lg font-bold text-gray-300">Dispatch Fleet</h3>

		<form
			method="POST"
			action="?/dispatch"
			use:enhance={() => {
				return async ({ update }) => {
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="planet_id" value={data.currentPlanet.id} />

			<!-- Ship Selection -->
			<div class="mb-6 space-y-2">
				{#each shipTypes as ship}
					{@const shipKey = toCamel(ship.id)}
					<div class="flex items-center justify-between rounded bg-gray-900/50 p-2">
						<span class="text-gray-300">{ship.name}</span>
						<div class="flex items-center space-x-2">
							<span class="text-xs text-gray-500">Available: {ships[shipKey] || 0}</span>
							<input
								type="number"
								name={ship.id}
								bind:value={shipCounts[ship.id]}
								min="0"
								max={ships[shipKey] || 0}
								class="w-16 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-right text-white"
								placeholder="0"
							/>
						</div>
					</div>
				{/each}
			</div>

			<!-- Save Template Section -->
			<div class="mb-6 rounded border border-gray-700/50 bg-gray-900/30 p-3">
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
					<span class="text-sm whitespace-nowrap text-gray-400">Save Selection as Template:</span>
					<div class="flex flex-1 gap-2">
						<input
							type="text"
							bind:value={newTemplateName}
							placeholder="Template Name"
							class="flex-1 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white"
						/>
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
							class="flex items-center justify-center rounded bg-green-700 px-3 py-1 text-sm text-white transition-transform hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
			<div class="mb-6 rounded bg-gray-900/50 p-3">
				<h4 class="mb-2 text-sm font-bold text-gray-400">Resources</h4>
				<div class="grid grid-cols-3 gap-2">
					<div>
						<label for="metal" class="mb-1 block text-xs text-gray-500">Metal</label>
						<input
							id="metal"
							type="number"
							name="metal"
							min="0"
							class="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-right text-white"
							placeholder="0"
						/>
					</div>
					<div>
						<label for="crystal" class="mb-1 block text-xs text-gray-500">Crystal</label>
						<input
							id="crystal"
							type="number"
							name="crystal"
							min="0"
							class="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-right text-white"
							placeholder="0"
						/>
					</div>
					<div>
						<label for="gas" class="mb-1 block text-xs text-gray-500">Gas</label>
						<input
							id="gas"
							type="number"
							name="gas"
							min="0"
							class="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-right text-white"
							placeholder="0"
						/>
					</div>
				</div>
			</div>

			<!-- Target Coordinates -->
			<div class="mb-4 grid grid-cols-3 gap-2">
				<div>
					<label for="galaxy" class="mb-1 block text-xs text-gray-500">Galaxy</label>
					<input
						id="galaxy"
						type="number"
						name="galaxy"
						value={targetGalaxy}
						class="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-white"
					/>
				</div>
				<div>
					<label for="system" class="mb-1 block text-xs text-gray-500">System</label>
					<input
						id="system"
						type="number"
						name="system"
						value={targetSystem}
						class="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-white"
					/>
				</div>
				<div>
					<label for="planet" class="mb-1 block text-xs text-gray-500">Planet</label>
					<input
						id="planet"
						type="number"
						name="planet"
						value={targetPlanet}
						class="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-white"
						placeholder="1-15"
					/>
				</div>
			</div>

			<!-- Mission -->
			<div class="mb-6">
				<label for="mission" class="mb-1 block text-xs text-gray-500">Mission</label>
				<select
					id="mission"
					name="mission"
					value={targetMission}
					class="w-full rounded border border-gray-600 bg-gray-700 px-2 py-2 text-white"
				>
					<option value="attack">Attack</option>
					<option value="transport">Transport</option>
					<option value="deploy">Deploy</option>
					<option value="espionage">Espionage</option>
					<option value="colonize">Colonize</option>
					<option value="expedition">Expedition</option>
				</select>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="flex w-full items-center justify-center rounded bg-blue-600 py-3 font-bold text-white transition-transform hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if loading}
					<Spinner size="sm" class="mr-2" />
				{/if}
				Send Fleet
			</button>
		</form>
	</div>
</div>
