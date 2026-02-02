<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();

	let extraMessages = $state<any[]>([]);
	let loading = $state(false);
	let hasMore = $state(true);

	let allMessages = $derived([...data.messages, ...extraMessages]);

	onMount(() => {
		invalidate('app:unread-messages');
	});

	async function loadMore() {
		if (loading) return;
		loading = true;
		try {
			const currentCount = allMessages.length;
			const res = await fetch(`/api/messages?offset=${currentCount}&limit=25`);
			if (res.ok) {
				const result = await res.json();
				if (result.messages.length < 25) {
					hasMore = false;
				}
				if (result.messages.length > 0) {
					extraMessages.push(...result.messages);
				}
			}
		} catch (e) {
			console.error('Failed to load messages', e);
		} finally {
			loading = false;
		}
	}
</script>

<div class="p-4 pb-20">
	<h2 class="mb-6 text-2xl font-bold text-blue-300">Communications</h2>

	<div class="space-y-2">
		{#if allMessages.length === 0}
			<div class="p-4 text-center text-gray-500">No messages.</div>
		{:else}
			{#each allMessages as msg}
				<div
					class="rounded border border-gray-700 bg-gray-800 p-4 shadow-sm {msg.isRead
						? 'opacity-75'
						: 'border-l-4 border-l-blue-500'}"
				>
					<div class="mb-2 flex items-start justify-between">
						<h3 class="font-bold text-gray-200">{msg.title}</h3>
						<span class="text-xs text-gray-500"
							>{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span
						>
					</div>
					<p class="text-sm text-gray-400">{msg.content}</p>
				</div>
			{/each}
		{/if}
	</div>

	{#if hasMore && allMessages.length >= 25}
		<div class="mt-6 text-center">
			<button
				class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
				onclick={loadMore}
				disabled={loading}
			>
				{loading ? 'Loading...' : 'Load More'}
			</button>
		</div>
	{/if}
</div>
