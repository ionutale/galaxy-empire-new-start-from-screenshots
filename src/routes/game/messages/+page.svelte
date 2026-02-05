<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';

	let { data } = $props();

	interface Message {
		id: number;
		type?: string;
		title: string;
		content: string;
		isRead: boolean;
		createdAt: Date | string;
		messageType?: string;
		fromUsername?: string;
		isSent?: boolean;
	}

	let extraMessages = $state<Message[]>([]);
	let loading = $state(false);
	let hasMore = $state(true);
	let showSendForm = $state(false);
	let sending = $state(false);
	let messageType = $state('private');
	let selectedAllianceMember = $state('');

	let allMessages = $derived([...(data.messages as Message[]), ...extraMessages]);

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
			case 'system':
				return '📢';
			case 'private':
				return '💬';
			case 'alliance':
				return '🤝';
			case 'combat':
				return '⚔️';
			case 'expedition':
				return '🚀';
			case 'espionage':
				return '🕵️';
			default:
				return '📧';
		}
	}
</script>

<div class="p-4 pb-20">
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-2xl font-bold text-blue-600 dark:text-blue-300">Communications</h2>
		<button
			class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
			onclick={() => (showSendForm = !showSendForm)}
		>
			{showSendForm ? 'Cancel' : 'Send Message'}
		</button>
	</div>

	{#if showSendForm}
		<div
			class="mb-6 rounded border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
		>
			<h3 class="mb-4 text-lg font-bold text-gray-900 dark:text-gray-200">Send Message</h3>
			<form onsubmit={async (e) => {
				e.preventDefault();
				sending = true;
				const formData = new FormData(e.currentTarget as HTMLFormElement);
				const data = Object.fromEntries(formData.entries());
				data.messageType = messageType;

				try {
					const res = await fetch('/api/messages/send', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(data)
					});
					if (res.ok) {
						showSendForm = false;
						await invalidate('app:unread-messages');
						// Re-fetch messages or add to list? 
						// For now just invalidate and reload if needed, 
						// but in svelte 5 we can just re-fetch for simplicity or use invalidate
						window.location.reload(); 
					} else {
						const err = await res.json();
						alert(err.error || 'Failed to send message');
					}
				} catch (err) {
					console.error(err);
					alert('An unexpected error occurred');
				} finally {
					sending = false;
				}
			}}>
				<div class="mb-4">
					<label
						for="messageType"
						class="block text-sm font-medium text-gray-700 dark:text-gray-300">Message Type</label
					>
					<select
						id="messageType"
						bind:value={messageType}
						class="mt-1 block w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					>
						<option value="private">Private Message</option>
						{#if data.allianceMembers && data.allianceMembers.length > 0}
							<option value="alliance">Alliance Message</option>
						{/if}
					</select>
				</div>
				{#if messageType === 'private'}
					<div class="mb-4">
						<label
							for="toUsername"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300"
							>Recipient Username</label
						>
						<input
							type="text"
							id="toUsername"
							name="toUsername"
							required
							class="mt-1 block w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
							placeholder="Enter username"
						/>
					</div>
				{:else if messageType === 'alliance'}
					<div class="mb-4">
						<label
							for="allianceMember"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300"
							>Alliance Member</label
						>
						<select
							id="allianceMember"
							name="toUsername"
							bind:value={selectedAllianceMember}
							required
							class="mt-1 block w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						>
							<option value="">Select a member</option>
							{#each data.allianceMembers as member (member.id || member.username)}
								<option value={member.username}>{member.username}</option>
							{/each}
						</select>
					</div>
				{/if}
				<div class="mb-4">
					<label for="subject" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>Subject</label
					>
					<input
						type="text"
						id="subject"
						name="subject"
						required
						maxlength="100"
						class="mt-1 block w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
						placeholder="Message subject"
					/>
				</div>
				<div class="mb-4">
					<label for="content" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>Message</label
					>
					<textarea
						id="content"
						name="content"
						required
						rows="4"
						maxlength="10000"
						class="mt-1 block w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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
			{#each allMessages as msg (msg.id)}
				<div
					class="rounded border border-gray-200 bg-white p-4 shadow-sm {msg.isRead
						? 'opacity-75'
						: 'border-l-4 border-l-blue-500'} dark:border-gray-700 dark:bg-gray-800"
				>
					<div class="mb-2 flex items-start justify-between">
						<div class="flex items-center space-x-2">
							<span class="text-lg">{getMessageIcon(msg.messageType || msg.type || 'system')}</span>
							<h3 class="font-bold text-gray-900 dark:text-gray-200">{msg.title}</h3>
							{#if msg.messageType === 'private' || msg.messageType === 'alliance'}
								{#if msg.isSent}
									<span class="text-xs text-green-600 dark:text-green-400">(Sent)</span>
								{:else}
									<span class="text-xs text-blue-600 dark:text-blue-400"
										>(From: {msg.fromUsername})</span
									>
								{/if}
							{/if}
						</div>
						<span class="text-xs text-gray-500"
							>{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span
						>
					</div>
					<p class="text-sm whitespace-pre-wrap text-gray-600 dark:text-gray-400">{msg.content}</p>
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
