<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import Spinner from '$lib/components/Spinner.svelte';

	let { data }: { data: PageData } = $props();

	let shopItems = $derived(data.shopItems);
	let activeBoosters = $derived(data.activeBoosters);
	let darkMatter = $derived(data.darkMatter);

	let loading = $state<Record<string, boolean>>({});

	function formatDate(dateStr: string | Date) {
		return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString();
	}
</script>

<div class="mx-auto w-full max-w-6xl p-4 pb-20">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-yellow-400">Dark Matter Shop</h1>
		<div class="rounded-lg border border-purple-500/30 bg-gray-800 px-4 py-2">
			<span class="text-gray-400">Dark Matter:</span>
			<span class="ml-2 font-bold text-purple-400">{darkMatter}</span>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each Object.values(shopItems) as item}
			<div
				class="overflow-hidden rounded-lg border border-gray-700 bg-gray-900/80 shadow-lg transition-colors hover:border-yellow-500/50"
			>
				<div class="flex items-center justify-between border-b border-gray-700 bg-gray-800/50 p-4">
					<h3 class="text-xl font-bold text-white">{item.name}</h3>
					{#if activeBoosters[item.id]}
						<span
							class="rounded border border-green-500/30 bg-green-900/50 px-2 py-1 text-xs text-green-400"
							>Active</span
						>
					{/if}
				</div>

				<div class="space-y-4 p-6">
					<div class="mb-4 flex h-24 items-center justify-center rounded bg-black/40">
						<!-- Placeholder for image -->
						<span class="text-4xl">🛒</span>
					</div>

					<p class="h-12 text-sm text-gray-300">{item.description}</p>

					<div class="flex items-center justify-between text-sm">
						<span class="text-gray-400">Cost:</span>
						<span class="font-bold text-purple-400">{item.cost} DM</span>
					</div>

					{#if activeBoosters[item.id]}
						<div class="mt-2 text-xs text-gray-400">
							Expires: {formatDate(activeBoosters[item.id])}
						</div>
					{/if}

					<form
						method="POST"
						action="?/purchase"
						use:enhance={() => {
							loading[item.id] = true;
							return async ({ update }) => {
								loading[item.id] = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="itemId" value={item.id} />

						<button
							type="submit"
							class="mt-4 flex w-full transform items-center justify-center rounded bg-yellow-600 px-4 py-2 font-bold text-white transition-colors hover:bg-yellow-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={darkMatter < item.cost || loading[item.id]}
						>
							{#if loading[item.id]}
								<Spinner size="sm" class="mr-2" />
							{/if}
							{activeBoosters[item.id] ? 'Extend' : 'Purchase'}
						</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
</div>
