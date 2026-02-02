<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';

	let { data } = $props();

	let extraMessages = $state<any[]>([]);
	let loading = $state(false);
	let hasMore = $state(true);
	let showSendForm = $state(false);
	let sending = $state(false);

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

	function getMessageIcon(type: string) {
		switch (type) {
			case 'system': return '📢';
			case 'private': return '💬';
			default: return '📧';
		}
	}
</script>

<div class="p-4 pb-20">
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-2xl font-bold text-blue-300">Communications</h2>
		<button
			class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
			onclick={() => showSendForm = !showSendForm}
		>
			{showSendForm ? 'Cancel' : 'Send Message'}
		</button>
	</div>

	{#if showSendForm}
		<div class="mb-6 rounded border border-gray-700 bg-gray-800 p-4">
			<h3 class="mb-4 text-lg font-bold text-gray-200">Send Private Message</h3>
			<form method="POST" action="/api/messages/send" use:enhance={() => {
				sending = true;
				return async ({ update }) => {
					sending = false;
					showSendForm = false;
					await invalidate('app:unread-messages');
					await update();
				};
			}}>
				<div class="mb-4">
					<label for="toUsername" class="block text-sm font-medium text-gray-300">Recipient Username</label>
					<input
						type="text"
						id="toUsername"
						name="toUsername"
						required
						class="mt-1 block w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
						placeholder="Enter username"
					/>
				</div>
				<div class="mb-4">
					<label for="subject" class="block text-sm font-medium text-gray-300">Subject</label>
					<input
						type="text"
						id="subject"
						name="subject"
						required
						maxlength="100"
						class="mt-1 block w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
						placeholder="Message subject"
					/>
				</div>
				<div class="mb-4">
					<label for="content" class="block text-sm font-medium text-gray-300">Message</label>
					<textarea
						id="content"
						name="content"
						required
						rows="4"
						maxlength="10000"
						class="mt-1 block w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
						placeholder="Your message..."
					></textarea>
				</div>
				<button
					type="submit"
					disabled={sending}
					class="flex items-center justify-center rounded bg-green-600 px-4 py-2 text-white hover:bg-green-500 disabled:opacity-50"
				>
					{#if sending}
						Sending...
					{:else}
						Send Message
					{/if}
				</button>
			</form>
		</div>
	{/if}

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
						<div class="flex items-center space-x-2">
							<span class="text-lg">{getMessageIcon(msg.messageType || msg.type)}</span>
							<h3 class="font-bold text-gray-200">{msg.title}</h3>
							{#if msg.messageType === 'private'}
								{#if msg.isSent}
									<span class="text-xs text-green-400">(Sent)</span>
								{:else}
									<span class="text-xs text-blue-400">(From: {msg.fromUsername})</span>
								{/if}
							{/if}
						</div>
						<span class="text-xs text-gray-500"
							>{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span
						>
					</div>
					<p class="text-sm text-gray-400 whitespace-pre-wrap">{msg.content}</p>
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
