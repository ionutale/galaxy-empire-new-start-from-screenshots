<script lang="ts">
    let { children, data } = $props();
</script>

<div class="flex flex-col h-screen bg-gray-900 text-white overflow-hidden font-sans">
    <!-- Top Bar (HUD) -->
    <header class="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 z-20">
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
    <div class="h-14 bg-gray-800/90 border-b border-gray-700 flex items-center justify-around px-2 text-xs sm:text-sm z-20 shadow-lg">
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

    <!-- Chat Overlay (Collapsed) -->
    <div class="bg-black/60 backdrop-blur-sm border-t border-gray-700 p-2 text-sm text-gray-300 truncate cursor-pointer hover:bg-black/80 transition">
        <span class="text-blue-400 font-bold">[Global]</span> <span class="text-yellow-500">EmperorX:</span> Anyone want to trade metal for crystal?
    </div>

    <!-- Bottom Navigation Bar (Dock) -->
    <nav class="h-16 bg-gray-800 border-t border-gray-700 flex items-center overflow-x-auto px-2 z-20 no-scrollbar">
        <a href="/game" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">🪐</span>
            <span class="text-[10px] uppercase tracking-wide">Base</span>
        </a>
        <a href="/game/facilities" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">🏭</span>
            <span class="text-[10px] uppercase tracking-wide">Facilities</span>
        </a>
        <a href="/game/research" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">🔬</span>
            <span class="text-[10px] uppercase tracking-wide">Research</span>
        </a>
        <a href="/game/shipyard" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">🛠️</span>
            <span class="text-[10px] uppercase tracking-wide">Shipyard</span>
        </a>
        <a href="/game/defenses" class="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition min-w-[4rem]">
            <span class="text-xl mb-1">🛡️</span>
            <span class="text-[10px] uppercase tracking-wide">Defense</span>
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
