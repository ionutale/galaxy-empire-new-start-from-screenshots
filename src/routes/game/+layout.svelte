<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';

	let { children, data } = $props();

	// Chat Logic
	let isChatOpen = $state(false);
	let chatMessages = $state<any[]>([]);
	let newMessage = $state('');
	let chatChannel = $state('global');
	let chatInterval: any;
	let gameTickInterval: any;

	async function fetchChat() {
		try {
			const res = await fetch(`/api/chat?channel=${chatChannel}`);
			if (res.ok) {
				chatMessages = await res.json();
			}
		} catch (e) {
			console.error('Failed to fetch chat', e);
		}
	}

	async function runGameTick() {
		try {
			const res = await fetch('/api/game-tick');
			if (res.ok) {
				// Invalidate game data to refresh UI (resources, fleets, etc.)
				invalidate('app:game-data');
			}
		} catch (e) {
			console.error('Game tick failed', e);
		}
	}

	async function sendChat() {
		if (!newMessage.trim()) return;

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: newMessage, channel: chatChannel })
			});

			if (res.ok) {
				newMessage = '';
				await fetchChat();
			}
		} catch (e) {
			console.error('Failed to send message', e);
		}
	}

	function switchChannel(channel: string) {
		chatChannel = channel;
		fetchChat();
	}

	onMount(() => {
		fetchChat();
		chatInterval = setInterval(fetchChat, 5000); // Poll every 5s

		// Poll game tick every 10 seconds to process fleets and auto-explore
		gameTickInterval = setInterval(runGameTick, 10000);
	});

	onDestroy(() => {
		if (chatInterval) clearInterval(chatInterval);
		if (gameTickInterval) clearInterval(gameTickInterval);
	});
</script>

<div class="flex h-[100dvh] h-screen flex-col overflow-hidden bg-gray-900 font-sans text-white">
	<!-- Top Bar (HUD) -->
	<header
		class="z-20 flex h-12 shrink-0 items-center justify-between border-b border-gray-700 bg-gray-800 px-4"
	>
		<div class="flex items-center space-x-4">
			<div class="hidden items-center space-x-2 sm:flex">
				<div class="font-bold text-yellow-500">Rank 1</div>
				<span class="text-xs text-green-500">▲</span>
			</div>

			<!-- Planet Selector -->
			<select
				class="max-w-[150px] rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none sm:max-w-[200px] sm:text-sm"
				value={data.currentPlanet?.id}
				onchange={(e) => {
					const newId = e.currentTarget.value;
					const url = new URL($page.url);
					url.searchParams.set('planet', newId);
					goto(url.toString());
				}}
			>
				{#each data.planets as planet}
					<option value={planet.id}>
						{planet.name} [{planet.galaxyId}:{planet.systemId}:{planet.planetNumber}]
					</option>
				{/each}
			</select>
		</div>

		<div class="hidden text-lg font-bold tracking-wider text-blue-300 md:block">
			{data.user.username}
		</div>

		<div class="flex items-center space-x-4">
			<div class="flex space-x-1">
				<!-- Officers Icons (Placeholders) -->
				<div class="h-6 w-6 rounded-full border border-gray-600 bg-gray-700"></div>
				<div class="h-6 w-6 rounded-full border border-gray-600 bg-gray-700"></div>
			</div>
			<a href="/game/messages" class="relative transition-transform active:scale-95">
				<span class="text-2xl">✉️</span>
				{#if data.unreadMessages > 0}
					<span
						class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs"
					>
						{data.unreadMessages}
					</span>
				{/if}
			</a>
			<a
				href="/game/settings"
				class="text-2xl transition transition-transform hover:text-gray-300 active:scale-95"
			>
				⚙️
			</a>
		</div>
	</header>

	<!-- Resource Bar -->
	<div
		class="z-20 flex h-14 shrink-0 items-center justify-around border-b border-gray-700 bg-gray-800/90 px-2 text-xs shadow-lg sm:text-sm"
	>
		{#if data.resources}
			<div class="flex flex-col items-center">
				<span class="mb-1 text-gray-400">Metal</span>
				<span class="font-mono font-bold text-gray-200"
					>{Math.floor(data.resources.metal || 0).toLocaleString()}</span
				>
			</div>
			<div class="flex flex-col items-center">
				<span class="mb-1 text-blue-400">Crystal</span>
				<span class="font-mono font-bold text-blue-200"
					>{Math.floor(data.resources.crystal || 0).toLocaleString()}</span
				>
			</div>
			<div class="flex flex-col items-center">
				<span class="mb-1 text-purple-400">Gas</span>
				<span class="font-mono font-bold text-purple-200"
					>{Math.floor(data.resources.gas || 0).toLocaleString()}</span
				>
			</div>
			<div class="flex flex-col items-center">
				<span class="mb-1 text-yellow-400">Energy</span>
				<span class="font-mono font-bold text-yellow-200">{data.resources.energy || 0}</span>
			</div>
			<div class="flex flex-col items-center">
				<span class="mb-1 text-purple-600">Dark Matter</span>
				<span class="font-mono font-bold text-purple-300"
					>{data.user.darkMatter.toLocaleString()}</span
				>
			</div>
		{/if}
	</div>

	<!-- Main Viewport -->
	<main
		class="relative flex-1 overflow-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black"
	>
		<!-- Background overlay for better text readability if needed -->
		<div class="pointer-events-none absolute inset-0 bg-black/30"></div>

		<div class="relative z-10 h-full">
			{@render children()}
		</div>
	</main>

	<!-- Chat Overlay -->
	{#if isChatOpen}
		<div
			class="absolute right-0 bottom-16 left-0 z-30 flex h-64 flex-col border-t border-gray-700 bg-black/90 backdrop-blur-md"
		>
			<div class="flex items-center justify-between border-b border-gray-700 bg-gray-800 p-2">
				<div class="flex space-x-2">
					<button
						onclick={() => switchChannel('global')}
						class="rounded px-2 py-1 text-sm transition {chatChannel === 'global' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}"
					>
						Global
					</button>
					{#if data.user.allianceId}
						<button
							onclick={() => switchChannel('alliance')}
							class="rounded px-2 py-1 text-sm transition {chatChannel === 'alliance' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}"
						>
							Alliance
						</button>
					{/if}
				</div>
				<button
					onclick={() => (isChatOpen = false)}
					class="text-gray-400 transition-transform hover:text-white active:scale-95">▼</button
				>
			</div>

			<div class="flex flex-1 flex-col-reverse space-y-1 overflow-y-auto p-2">
				{#each chatMessages as msg}
					<div class="text-sm">
						<span class="text-xs text-gray-500"
							>[{new Date(msg.createdAt).toLocaleTimeString()}]</span
						>
						{#if msg.allianceTag}
							<span class="font-bold text-blue-400">[{msg.allianceTag}]</span>
						{/if}
						<span class="font-bold text-yellow-500">{msg.username}:</span>
						<span class="text-gray-300">{msg.content}</span>
					</div>
				{/each}
			</div>

			<div class="flex border-t border-gray-700 bg-gray-800 p-2">
				<input
					type="text"
					bind:value={newMessage}
					onkeydown={(e) => e.key === 'Enter' && sendChat()}
					placeholder="Type a message..."
					class="flex-1 rounded-l border border-gray-600 bg-gray-700 px-2 py-1 text-white focus:border-blue-500 focus:outline-none"
				/>
				<button
					onclick={sendChat}
					class="rounded-r bg-blue-600 px-4 py-1 font-bold text-white transition-transform hover:bg-blue-500 active:scale-95"
					>Send</button
				>
			</div>
		</div>
	{:else}
		<button
			onclick={() => (isChatOpen = true)}
			class="z-30 w-full shrink-0 cursor-pointer truncate border-t border-gray-700 bg-black/60 p-2 text-left text-sm text-gray-300 backdrop-blur-sm transition hover:bg-black/80 active:bg-black/90"
		>
			{#if chatMessages.length > 0}
				{@const lastMsg = chatMessages[0]}
				<span class="font-bold text-blue-400">[{chatChannel === 'alliance' ? 'Alliance' : 'Global'}]</span>
				<span class="text-yellow-500">{lastMsg.username}:</span>
				{lastMsg.content}
			{:else}
				<span class="text-gray-500 italic">Click to open chat...</span>
			{/if}
		</button>
	{/if}

	<!-- Bottom Navigation Bar (Dock) -->
	<nav
		class="no-scrollbar z-20 flex min-h-[4rem] shrink-0 items-center overflow-x-auto border-t border-gray-700 bg-gray-800 px-2 pb-8 md:pb-safe"
	>
		<a
			href="/game"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">🪐</span>
			<span class="text-[10px] tracking-wide uppercase">Base</span>
		</a>
		<a
			href="/game/planet"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">🌍</span>
			<span class="text-[10px] tracking-wide uppercase">Planets</span>
		</a>
		<a
			href="/game/research"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">🔬</span>
			<span class="text-[10px] tracking-wide uppercase">Research</span>
		</a>
		<a
			href="/game/shipyard"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">🛠️</span>
			<span class="text-[10px] tracking-wide uppercase">Shipyard</span>
		</a>
		<a
			href="/game/fleet"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">🚀</span>
			<span class="text-[10px] tracking-wide uppercase">Fleet</span>
		</a>
		<a
			href="/game/fleet/movements"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">📡</span>
			<span class="text-[10px] tracking-wide uppercase">Movements</span>
		</a>
		<a
			href="/game/galaxy"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">🌌</span>
			<span class="text-[10px] tracking-wide uppercase">Galaxy</span>
		</a>
		<a
			href="/game/system"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">☀️</span>
			<span class="text-[10px] tracking-wide uppercase">System</span>
		</a>
		<a
			href="/game/alliance"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">🤝</span>
			<span class="text-[10px] tracking-wide uppercase">Alliance</span>
		</a>
		<a
			href="/game/commanders"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">👨‍✈️</span>
			<span class="text-[10px] tracking-wide uppercase">Officers</span>
		</a>
		<a
			href="/game/shop"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">🛒</span>
			<span class="text-[10px] tracking-wide uppercase">Shop</span>
		</a>
		<a
			href="/game/highscore"
			class="flex min-w-[4rem] transform flex-col items-center rounded-lg p-2 transition hover:bg-gray-700 active:scale-95"
		>
			<span class="mb-1 text-xl">🏆</span>
			<span class="text-[10px] tracking-wide uppercase">Rank</span>
		</a>
	</nav>
</div>
