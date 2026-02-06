<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import '$lib/styles/theme.css';

	let { children, data } = $props();

	interface ChatMessage {
		id?: string;
		createdAt: string;
		allianceTag?: string;
		username: string;
		content: string;
	}

	// Chat Logic
	let isChatOpen = $state(false);
	let chatMessages = $state<ChatMessage[]>([]);
	let newMessage = $state('');
	let chatChannel = $state('global');
	let chatInterval: ReturnType<typeof setInterval> | undefined;
	let gameTickInterval: ReturnType<typeof setInterval> | undefined;

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
		// Force dark mode
		document.documentElement.classList.add('dark');
		
		fetchChat();
		chatInterval = setInterval(fetchChat, 5000);

		if (!import.meta.env.DEV) {
			gameTickInterval = setInterval(runGameTick, 5000);
		}
	});

	onDestroy(() => {
		if (chatInterval) clearInterval(chatInterval);
		if (gameTickInterval) clearInterval(gameTickInterval);
	});

	// Grouping navigation for better UX
	const navGroups = [
		{
			title: 'Base',
			items: [
				{ href: '/game', icon: '🪐', label: 'Overview' },
				{ href: '/game/planet', icon: '🌍', label: 'Planets' },
				{ href: '/game/research', icon: '🔬', label: 'Research' }
			]
		},
		{
			title: 'Military',
			items: [
				{ href: '/game/shipyard', icon: '🛠️', label: 'Shipyard' },
				{ href: '/game/fleet', icon: '🚀', label: 'Fleet' },
				{ href: '/game/fleet/movements', icon: '📡', label: 'Radar' }
			]
		},
		{
			title: 'Universe',
			items: [
				{ href: '/game/galaxy', icon: '🌌', label: 'Galaxy' },
				{ href: '/game/system', icon: '☀️', label: 'System' }
			]
		},
		{
			title: 'Empire',
			items: [
				{ href: '/game/alliance', icon: '🤝', label: 'Alliance' },
				{ href: '/game/highscore', icon: '🏆', label: 'Rank' },
				{ href: '/game/shop', icon: '🛒', label: 'Premium' }
			]
		}
	];
</script>

<div class="space-background">
	<div class="stars"></div>
</div>

<div class="flex h-[100dvh] h-screen flex-col overflow-hidden font-sans text-white">
	<!-- Top Bar (HUD) -->
	<header class="hud-bar z-30 flex h-14 shrink-0 items-center justify-between px-6 backdrop-blur-md">
		<div class="flex items-center space-x-6">
			<div class="flex flex-col">
				<div class="text-xs font-bold tracking-widest text-blue-400 uppercase">Commander</div>
				<div class="text-lg font-bold tracking-tight glow-blue">{data.user.username}</div>
			</div>

			<div class="h-8 w-px bg-white/10"></div>

			<!-- Planet Selector -->
			<div class="relative flex flex-col">
				<span class="text-[10px] tracking-widest text-gray-500 uppercase">Sector</span>
				<select
					class="cursor-pointer border-none bg-transparent p-0 text-sm font-bold text-gray-200 focus:ring-0"
					value={data.currentPlanet?.id}
					onchange={(e) => {
						const newId = e.currentTarget.value;
						const url = new URL($page.url);
						url.searchParams.set('planet', newId);
						goto(url.toString());
					}}
				>
					{#each data.planets as planet (planet.id)}
						<option value={planet.id} class="bg-gray-900">
							{planet.name} [{planet.galaxyId}:{planet.systemId}:{planet.planetNumber}]
						</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="flex items-center space-x-6">
			<div class="hidden flex-col items-end sm:flex text-right">
				<div class="text-xs font-bold tracking-widest text-emerald-400 uppercase">Rank 1</div>
				<div class="text-[10px] text-emerald-500/80">Imperial Vanguard</div>
			</div>
			
			<div class="flex space-x-3">
				<a
					href="/game/messages"
					class="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:border-blue-500/50 active:scale-95"
				>
					<span class="text-xl">✉️</span>
					{#if data.unreadMessages > 0}
						<span
							class="absolute -top-1 -right-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-600 text-[10px] font-bold shadow-[0_0_10px_rgba(220,38,38,0.5)]"
						>
							{data.unreadMessages}
						</span>
					{/if}
				</a>
				<a
					href="/game/settings"
					class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:border-blue-500/50 active:scale-95"
				>
					<span class="text-xl">⚙️</span>
				</a>
			</div>
		</div>
	</header>

	<!-- Resource HUD -->
	<div
		class="z-20 flex h-16 shrink-0 items-center justify-center border-b border-white/5 bg-black/40 backdrop-blur-sm px-4"
	>
		<div class="flex w-full max-w-5xl items-center justify-around gap-2 px-2">
			{#if data.resources}
				<div class="resource-pill" data-tooltip="Metal Production">
					<span class="text-lg">⚙️</span>
					<div class="flex flex-col">
						<span class="text-[9px] font-bold text-gray-400 uppercase">Metal</span>
						<span class="font-mono text-sm font-bold text-gray-100"
							>{Math.floor(data.resources.metal || 0).toLocaleString()}</span
						>
					</div>
				</div>

				<div class="resource-pill" data-tooltip="Crystal Production">
					<span class="text-lg">💎</span>
					<div class="flex flex-col">
						<span class="text-[9px] font-bold text-blue-400 uppercase">Crystal</span>
						<span class="font-mono text-sm font-bold text-blue-100"
							>{Math.floor(data.resources.crystal || 0).toLocaleString()}</span
						>
					</div>
				</div>

				<div class="resource-pill" data-tooltip="Deuterium Extraction">
					<span class="text-lg">🧪</span>
					<div class="flex flex-col">
						<span class="text-[9px] font-bold text-purple-400 uppercase">Gas</span>
						<span class="font-mono text-sm font-bold text-purple-100"
							>{Math.floor(data.resources.gas || 0).toLocaleString()}</span
						>
					</div>
				</div>

				<div class="resource-pill {data.resources.energy < 0 ? 'border-red-500/50 bg-red-500/5' : ''}" data-tooltip="Energy Balance">
					<span class="text-lg {data.resources.energy < 0 ? 'animate-pulse' : ''}">{data.resources.energy < 0 ? '⚠️' : '⚡'}</span>
					<div class="flex flex-col">
						<span class="text-[9px] font-bold {data.resources.energy < 0 ? 'text-red-400' : 'text-yellow-400'} uppercase">Energy</span>
						<span class="font-mono text-sm font-bold {data.resources.energy < 0 ? 'text-red-400 glow-red' : 'text-yellow-100'}"
							>{data.resources.energy || 0}</span
						>
					</div>
				</div>

				<div class="resource-pill" data-tooltip="Premium Currency">
					<span class="text-lg">🌌</span>
					<div class="flex flex-col">
						<span class="text-[9px] font-bold text-fuchsia-400 uppercase">Dark Matter</span>
						<span class="font-mono text-sm font-bold text-fuchsia-100"
							>{data.user.darkMatter.toLocaleString()}</span
						>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Viewport -->
	<main class="relative flex-1 overflow-y-auto">
		<div class="mx-auto h-full w-full max-w-7xl relative z-10 transition-all duration-500">
			{@render children()}
		</div>
	</main>

	<!-- Chat Overlay -->
	{#if isChatOpen}
		<div
			class="absolute right-6 bottom-24 left-6 z-40 flex h-80 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/95 shadow-2xl backdrop-blur-2xl transition-all sm:right-6 sm:bottom-24 sm:left-auto sm:w-96"
		>
			<div class="flex items-center justify-between border-b border-white/10 bg-white/5 p-4">
				<div class="flex items-center space-x-2">
					<span class="text-xl">💬</span>
					<h3 class="font-bold tracking-tight">Hyperspace Comms</h3>
				</div>
				<div class="flex space-x-2">
					<button
						onclick={() => switchChannel('global')}
						class="rounded-full px-3 py-1 text-xs font-bold transition {chatChannel === 'global'
							? 'bg-blue-600 text-white shadow-lg'
							: 'text-gray-400 hover:text-white'}"
					>
						Global
					</button>
					{#if data.user.allianceId}
						<button
							onclick={() => switchChannel('alliance')}
							class="rounded-full px-3 py-1 text-xs font-bold transition {chatChannel === 'alliance'
								? 'bg-emerald-600 text-white shadow-lg'
								: 'text-gray-400 hover:text-white'}"
						>
							Alliance
						</button>
					{/if}
					<button
						onclick={() => (isChatOpen = false)}
						class="ml-2 text-gray-500 hover:text-white transition-colors">✕</button
					>
				</div>
			</div>

			<div class="flex flex-1 flex-col-reverse space-y-3 overflow-y-auto p-4 custom-scrollbar">
				{#each chatMessages as msg (msg.id || msg.createdAt)}
					<div class="group flex flex-col space-y-1">
						<div class="flex items-baseline space-x-2">
							{#if msg.allianceTag}
								<span class="text-[10px] font-black text-blue-400 tracking-tighter">[{msg.allianceTag}]</span>
							{/if}
							<span class="text-xs font-bold text-yellow-500">{msg.username}</span>
							<span class="text-[9px] text-gray-600">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
						</div>
						<div class="rounded-lg rounded-tl-none bg-white/5 p-2 text-sm text-gray-300">
							{msg.content}
						</div>
					</div>
				{/each}
			</div>

			<div class="border-t border-white/10 bg-white/5 p-4">
				<div class="flex items-center space-x-2 rounded-full border border-white/10 bg-black/50 px-4 py-1 focus-within:border-blue-500/50">
					<input
						type="text"
						bind:value={newMessage}
						onkeydown={(e) => e.key === 'Enter' && sendChat()}
						placeholder="Transmit message..."
						class="flex-1 bg-transparent py-2 text-sm text-white focus:outline-none"
					/>
					<button
						onclick={sendChat}
						class="text-blue-500 transition-transform hover:scale-110 active:scale-95"
					>
						▶
					</button>
				</div>
			</div>
		</div>
	{:else}
		<button
			onclick={() => (isChatOpen = true)}
			class="fixed bottom-24 right-6 z-40 flex items-center space-x-3 rounded-full border border-white/10 bg-black/80 px-4 py-2 text-sm text-gray-300 shadow-xl backdrop-blur-md transition-all hover:bg-black hover:border-blue-500/50 active:scale-95"
		>
			<span class="relative flex h-3 w-3">
				<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
				<span class="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
			</span>
			<span class="font-bold tracking-tight">Open Comms</span>
			{#if chatMessages.length > 0}
				<div class="h-4 w-px bg-white/20"></div>
				<span class="truncate max-w-[150px] italic text-gray-500 text-xs">
					{chatMessages[0].username}: {chatMessages[0].content}
				</span>
			{/if}
		</button>
	{/if}

	<!-- Bottom Navigation Bar (Dock) -->
	<nav class="dock z-30 flex h-20 shrink-0 items-center justify-center px-4 pb-safe border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
		<div class="flex items-center justify-center gap-1 sm:gap-4 lg:gap-8">
			{#each navGroups as group}
				<div class="flex items-center">
					<div class="flex flex-col items-center">
						<div class="flex gap-1">
							{#each group.items as item}
								<a
									href={item.href}
									class="nav-item flex min-w-[3.5rem] flex-col items-center rounded-xl p-2 transition-all {$page.url.pathname === item.href ? 'active bg-white/5' : ''}"
									title={item.label}
								>
									<span class="text-2xl transition-transform group-hover:scale-110">{item.icon}</span>
									<span class="text-[9px] font-black tracking-tighter text-gray-500 uppercase">{item.label}</span>
								</a>
							{/each}
						</div>
					</div>
					{#if group.title !== 'Empire'}
						<div class="mx-2 h-10 w-px bg-white/5 hidden sm:block"></div>
					{/if}
				</div>
			{/each}
		</div>
	</nav>
</div>

<style>
	:global(.no-scrollbar::-webkit-scrollbar) {
		display: none;
	}
	:global(.no-scrollbar) {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 10px;
	}
</style>
