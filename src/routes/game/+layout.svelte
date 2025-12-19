<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { VAPID_PUBLIC_KEY } from '$lib/game-config';

    let { children, data } = $props();

    // Chat Logic
    let isChatOpen = $state(false);
    let chatMessages = $state<any[]>([]);
    let newMessage = $state('');
    let chatInterval: any;

    async function fetchChat() {
        try {
            const res = await fetch('/api/chat');
            if (res.ok) {
                chatMessages = await res.json();
            }
        } catch (e) {
            console.error('Failed to fetch chat', e);
        }
    }

    async function sendChat() {
        if (!newMessage.trim()) return;
        
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newMessage })
            });
            
            if (res.ok) {
                newMessage = '';
                await fetchChat();
            }
        } catch (e) {
            console.error('Failed to send message', e);
        }
    }

    function urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async function subscribeToPush() {
        if (!('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });

                await fetch('/api/push-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subscription)
                });
                console.log('Push subscription saved');
            }
        } catch (err) {
            console.error('Failed to subscribe to push notifications', err);
        }
    }

    onMount(() => {
        fetchChat();
        chatInterval = setInterval(fetchChat, 5000); // Poll every 5s
        subscribeToPush();
    });

    onDestroy(() => {
        if (chatInterval) clearInterval(chatInterval);
    });
</script>

<div class="flex flex-col h-screen h-[100dvh] bg-gray-900 text-white overflow-hidden font-sans">
    <!-- Top Bar (HUD) -->
    <header class="h-12 shrink-0 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 z-20">
        <div class="flex items-center space-x-2">
            <div class="text-yellow-500 font-bold">Rank 1</div>
            <span class="text-green-500 text-xs">▲</span>
        </div>
        
        <div class="font-bold text-lg tracking-wider text-blue-300">
            {data.user.username}
        </div>
        
        <div class="flex items-center space-x-4">
            <div class="flex space-x-1">
                <!-- Officers Icons (Placeholders) -->
                <div class="w-6 h-6 bg-gray-700 rounded-full border border-gray-600"></div>
                <div class="w-6 h-6 bg-gray-700 rounded-full border border-gray-600"></div>
            </div>
            <a href="/game/messages" class="relative">
                <span class="text-2xl">✉️</span>
                {#if data.unreadMessages > 0}
                    <span class="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {data.unreadMessages}
                    </span>
                {/if}
            </a>
            <a href="/game/settings" class="text-2xl hover:text-gray-300 transition">
                ⚙️
            </a>
        </div>
    </header>

    <!-- Resource Bar -->
    <div class="h-14 shrink-0 bg-gray-800/90 border-b border-gray-700 flex items-center justify-around px-2 text-xs sm:text-sm z-20 shadow-lg">
        {#if data.resources}
            <div class="flex flex-col items-center">
                <span class="text-gray-400 mb-1">Metal</span>
                <span class="font-mono font-bold text-gray-200">{Math.floor(data.resources.metal).toLocaleString()}</span>
            </div>
            <div class="flex flex-col items-center">
                <span class="text-blue-400 mb-1">Crystal</span>
                <span class="font-mono font-bold text-blue-200">{Math.floor(data.resources.crystal).toLocaleString()}</span>
            </div>
            <div class="flex flex-col items-center">
                <span class="text-purple-400 mb-1">Gas</span>
                <span class="font-mono font-bold text-purple-200">{Math.floor(data.resources.gas).toLocaleString()}</span>
            </div>
            <div class="flex flex-col items-center">
                <span class="text-yellow-400 mb-1">Energy</span>
                <span class="font-mono font-bold text-yellow-200">{data.resources.energy}</span>
            </div>
            <div class="flex flex-col items-center">
                <span class="text-purple-600 mb-1">Dark Matter</span>
                <span class="font-mono font-bold text-purple-300">{data.user.darkMatter.toLocaleString()}</span>
            </div>
        {/if}
    </div>

    <!-- Main Viewport -->
    <main class="flex-1 overflow-auto relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black">
        <!-- Background overlay for better text readability if needed -->
        <div class="absolute inset-0 bg-black/30 pointer-events-none"></div>
        
        <div class="relative z-10 h-full">
            {@render children()}
        </div>
    </main>

    <!-- Chat Overlay -->
    {#if isChatOpen}
        <div class="absolute bottom-16 left-0 right-0 h-64 bg-black/90 backdrop-blur-md border-t border-gray-700 z-30 flex flex-col">
            <div class="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
                <span class="font-bold text-blue-300">Global Chat</span>
                <button onclick={() => isChatOpen = false} class="text-gray-400 hover:text-white">▼</button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-2 space-y-1 flex flex-col-reverse">
                {#each chatMessages as msg}
                    <div class="text-sm">
                        <span class="text-gray-500 text-xs">[{new Date(msg.created_at).toLocaleTimeString()}]</span>
                        {#if msg.alliance_tag}
                            <span class="text-blue-400 font-bold">[{msg.alliance_tag}]</span>
                        {/if}
                        <span class="text-yellow-500 font-bold">{msg.username}:</span>
                        <span class="text-gray-300">{msg.content}</span>
                    </div>
                {/each}
            </div>

            <div class="p-2 bg-gray-800 border-t border-gray-700 flex">
                <input 
                    type="text" 
                    bind:value={newMessage} 
                    onkeydown={(e) => e.key === 'Enter' && sendChat()}
                    placeholder="Type a message..." 
                    class="flex-1 bg-gray-700 border border-gray-600 rounded-l px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                >
                <button onclick={sendChat} class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded-r font-bold">Send</button>
            </div>
        </div>
    {:else}
        <button onclick={() => isChatOpen = true} class="w-full text-left shrink-0 bg-black/60 backdrop-blur-sm border-t border-gray-700 p-2 text-sm text-gray-300 truncate cursor-pointer hover:bg-black/80 transition z-30">
            {#if chatMessages.length > 0}
                {@const lastMsg = chatMessages[0]}
                <span class="text-blue-400 font-bold">[Global]</span> 
                <span class="text-yellow-500">{lastMsg.username}:</span> 
                {lastMsg.content}
            {:else}
                <span class="text-gray-500 italic">Click to open chat...</span>
            {/if}
        </button>
    {/if}

    <!-- Bottom Navigation Bar (Dock) -->
    <nav class="shrink-0 bg-gray-800 border-t border-gray-700 flex items-center overflow-x-auto px-2 z-20 no-scrollbar pb-8 md:pb-safe min-h-[4rem]">
        <a href="/game" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">🪐</span>
            <span class="text-[10px] uppercase tracking-wide">Base</span>
        </a>
        <a href="/game/research" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">🔬</span>
            <span class="text-[10px] uppercase tracking-wide">Research</span>
        </a>
        <a href="/game/shipyard" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">🛠️</span>
            <span class="text-[10px] uppercase tracking-wide">Shipyard</span>
        </a>
        <a href="/game/fleet" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">🚀</span>
            <span class="text-[10px] uppercase tracking-wide">Fleet</span>
        </a>
        <a href="/game/system" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">☀️</span>
            <span class="text-[10px] uppercase tracking-wide">Galaxy</span>
        </a>
        <a href="/game/alliance" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">🤝</span>
            <span class="text-[10px] uppercase tracking-wide">Alliance</span>
        </a>
        <a href="/game/highscore" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">🏆</span>
            <span class="text-[10px] uppercase tracking-wide">Rank</span>
        </a>
    </nav>
</div>
