<script lang="ts">
	let { data } = $props();

	let selectedItems: number[] = $state([]);

	function toggleItem(itemId: number) {
		if (selectedItems.includes(itemId)) {
			selectedItems = selectedItems.filter((id) => id !== itemId);
		} else if (selectedItems.length < 3) {
			selectedItems = [...selectedItems, itemId];
		}
	}

	async function fuse() {
		if (selectedItems.length === 0) return;

		try {
			const response = await fetch('/api/fusion', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ itemIds: selectedItems, recipeId: 1 }) // TODO: dynamic recipe
			});

			const result = await response.json();
			if (result.success) {
				alert('Fusion successful!');
				location.reload();
			} else {
				alert(result.error);
			}
		} catch {
			alert('Fusion failed');
		}
	}
</script>

<div class="p-4 pb-20">
	<h1 class="mb-4 text-2xl font-bold">Galactonite Fusion</h1>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Items Inventory -->
		<div class="rounded bg-gray-800 p-4">
			<h2 class="mb-4 text-xl font-bold">Your Items</h2>
			<div class="grid grid-cols-3 gap-2">
				{#each data.items as item (item.id)}
					<button
						class="rounded border p-2 {selectedItems.includes(item.id)
							? 'border-blue-500 bg-blue-900'
							: 'border-gray-600'}"
						onclick={() => toggleItem(item.id)}
						aria-label="Select {item.type} ({item.rarity}) item"
					>
						<div class="text-sm font-bold">{item.type} ({item.rarity})</div>
						<div class="text-xs text-gray-400">ID: {item.id}</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Fusion Panel -->
		<div class="rounded bg-gray-800 p-4">
			<h2 class="mb-4 text-xl font-bold">Fusion</h2>
			<div class="mb-4">
				Selected: {selectedItems.length}/3 items
			</div>
			<button
				class="rounded bg-blue-600 px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
				disabled={selectedItems.length === 0}
				onclick={fuse}
			>
				Fuse Items
			</button>
		</div>
	</div>

	<!-- Active Boosts -->
	<div class="mt-6 rounded bg-gray-800 p-4">
		<h2 class="mb-4 text-xl font-bold">Active Boosts</h2>
		{#each data.boosts as boost (boost.id)}
			<div class="flex justify-between">
				<span>{boost.boostType}: +{boost.value}%</span>
				<span>Expires: {new Date(boost.expiresAt).toLocaleString()}</span>
			</div>
		{/each}
	</div>
</div>
