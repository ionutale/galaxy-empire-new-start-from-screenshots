<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Spinner from '$lib/components/Spinner.svelte';

	let { data } = $props();
	let loading = $state<Record<string, boolean>>({});

	let allianceName = $state('');
	let allianceTag = $state('');
	let selectedWarTarget = $state('');
	let selectedPeaceTarget = $state('');

	async function handleCreate() {
		loading['create'] = true;
		try {
			const response = await fetch('/api/alliance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'create', name: allianceName, tag: allianceTag })
			});
			if (response.ok) {
				await invalidateAll();
			} else {
				console.error('Failed to create alliance');
			}
		} catch (error) {
			console.error('Error creating alliance:', error);
		} finally {
			loading['create'] = false;
		}
	}

	async function handleJoin(allianceId: number) {
		try {
			const response = await fetch('/api/alliance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'join', allianceId })
			});
			if (response.ok) {
				await invalidateAll();
			} else {
				console.error('Failed to join alliance');
			}
		} catch (error) {
			console.error('Error joining alliance:', error);
		}
	}

	async function handleLeave() {
		loading['leave'] = true;
		try {
			const response = await fetch('/api/alliance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'leave' })
			});
			if (response.ok) {
				await invalidateAll();
			} else {
				console.error('Failed to leave alliance');
			}
		} catch (error) {
			console.error('Error leaving alliance:', error);
		} finally {
			loading['leave'] = false;
		}
	}

	async function handleDeclareWar() {
		if (!selectedWarTarget) return;
		try {
			const response = await fetch('/api/alliance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'declareWar', targetAllianceId: Number(selectedWarTarget) })
			});
			if (response.ok) {
				await invalidateAll();
				selectedWarTarget = '';
			} else {
				console.error('Failed to declare war');
			}
		} catch (error) {
			console.error('Error declaring war:', error);
		}
	}

	async function handleDeclarePeace() {
		if (!selectedPeaceTarget) return;
		try {
			const response = await fetch('/api/alliance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'declarePeace', targetAllianceId: Number(selectedPeaceTarget) })
			});
			if (response.ok) {
				await invalidateAll();
				selectedPeaceTarget = '';
			} else {
				console.error('Failed to declare peace');
			}
		} catch (error) {
			console.error('Error declaring peace:', error);
		}
	}
</script>

<div class="p-4 pb-20">
	<h2 class="mb-6 text-2xl font-bold text-blue-300">Alliance</h2>

	{#if data.inAlliance && data.alliance}
		<div class="mb-6 rounded border border-gray-700 bg-gray-800 p-6">
			<div class="mb-6 flex items-start justify-between">
				<div>
					<h1 class="text-3xl font-bold text-white">[{data.alliance.tag}] {data.alliance.name}</h1>
					<p class="text-gray-400">Founder ID: {data.alliance.ownerId}</p>
				</div>
					<button
						onclick={handleLeave}
						disabled={loading['leave']}
						class="flex items-center justify-center rounded bg-red-600 px-4 py-2 text-white transition-transform hover:bg-red-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if loading['leave']}
							<Spinner size="sm" class="mr-2" />
						{/if}
						Leave Alliance
					</button>
			</div>

			<h3 class="mb-4 text-xl font-bold text-gray-300">Members ({data.members?.length || 0})</h3>
			<div class="overflow-x-auto">
				<table class="w-full text-left">
					<thead>
						<tr class="border-b border-gray-700 text-gray-500">
							<th class="py-2">Name</th>
							<th class="py-2">Points</th>
							<th class="py-2">Rank</th>
						</tr>
					</thead>
					<tbody>
						{#each data.members as member, i}
							<tr class="border-b border-gray-800">
								<td class="py-2 text-gray-300">{member.username}</td>
								<td class="py-2 text-gray-400">{member.points}</td>
								<td class="py-2 text-gray-500">#{i + 1}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Diplomacy Management (for alliance leaders) -->
			{#if data.alliance.ownerId === data.user.id}
				<div class="mt-6 rounded border border-gray-700 bg-gray-800 p-6">
					<h3 class="mb-4 text-xl font-bold text-red-400">Diplomacy</h3>
					
					<!-- Declare War/Peace -->
					<div class="mb-4">
						<h4 class="mb-2 text-lg font-semibold text-gray-300">Declare Relations</h4>
						<div class="mb-2 flex gap-2">
							<select bind:value={selectedWarTarget} class="rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white">
								<option value="">Select Alliance</option>
								{#each data.allAlliances || [] as alliance}
									{#if alliance.id !== data.alliance.id}
										<option value={alliance.id}>[{alliance.tag}] {alliance.name}</option>
									{/if}
								{/each}
							</select>
							<button onclick={handleDeclareWar} class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-500">
								Declare War
							</button>
						</div>
						<div class="flex gap-2">
							<select bind:value={selectedPeaceTarget} class="rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white">
								<option value="">Select Alliance</option>
								{#each data.allAlliances || [] as alliance}
									{#if alliance.id !== data.alliance.id}
										<option value={alliance.id}>[{alliance.tag}] {alliance.name}</option>
									{/if}
								{/each}
							</select>
							<button onclick={handleDeclarePeace} class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-500">
								Declare Peace
							</button>
						</div>
					</div>

					<!-- Current Relations -->
					{#if data.diplomacy && data.diplomacy.length > 0}
						<div>
							<h4 class="mb-2 text-lg font-semibold text-gray-300">Current Relations</h4>
							<div class="space-y-2">
								{#each data.diplomacy as relation}
									<div class="flex items-center justify-between rounded bg-gray-900 p-3">
										<div class="flex items-center space-x-3">
											<span class="text-lg">
												{#if relation.type === 'war'}🔥
												{:else if relation.type === 'peace'}🤝
												{:else}🤔
												{/if}
											</span>
											<div>
												<span class="font-medium text-gray-200">
													{relation.type.toUpperCase()} with [{relation.initiatorAllianceId === data.alliance.id ? relation.targetTag : relation.initiatorTag}]
												</span>
												<div class="text-sm text-gray-500">
													Status: {relation.status}
													{#if relation.expiresAt}
														• Expires: {new Date(relation.expiresAt).toLocaleDateString()}
													{/if}
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
			<!-- Create Alliance -->
			<div class="rounded border border-gray-700 bg-gray-800 p-6">
				<h3 class="mb-4 text-xl font-bold text-white">Found Alliance</h3>
				<div class="space-y-4">
					<div>
						<label for="alliance-tag" class="mb-1 block text-gray-400"
							>Alliance Tag (3-8 chars)</label
						>
						<input
							id="alliance-tag"
							type="text"
							bind:value={allianceTag}
							class="w-full rounded border border-gray-600 bg-gray-900 p-2 text-white"
							maxlength="8"
							required
						/>
					</div>
					<div>
						<label for="alliance-name" class="mb-1 block text-gray-400">Alliance Name</label>
						<input
							id="alliance-name"
							type="text"
							bind:value={allianceName}
							class="w-full rounded border border-gray-600 bg-gray-900 p-2 text-white"
							required
						/>
					</div>
					<button
						onclick={handleCreate}
						disabled={loading['create']}
						class="flex w-full items-center justify-center rounded bg-green-600 py-2 font-bold text-white transition-transform hover:bg-green-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if loading['create']}
							<Spinner size="sm" class="mr-2" />
						{/if}
						Found Alliance
					</button>
				</div>
			</div>

			<!-- Join Alliance -->
			<div class="rounded border border-gray-700 bg-gray-800 p-6">
				<h3 class="mb-4 text-xl font-bold text-white">Join Alliance</h3>
				{#if !data.alliances || data.alliances.length === 0}
					<p class="text-gray-400">No alliances found.</p>
				{:else}
					<div class="space-y-2">
						{#each data.alliances as alliance}
							<div class="flex items-center justify-between rounded bg-gray-900 p-3">
								<div>
									<span class="font-bold text-blue-400">[{alliance.tag}]</span>
									<span class="ml-2 text-gray-300">{alliance.name}</span>
									<span class="ml-2 text-sm text-gray-500">({alliance.memberCount} members)</span>
								</div>
								<button
									onclick={() => handleJoin(alliance.id)}
									class="rounded bg-blue-600 px-3 py-1 text-sm text-white transition-transform hover:bg-blue-500 active:scale-95"
									>Join</button
								>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
