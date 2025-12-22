<script lang="ts">
    import { enhance } from '$app/forms';
    import Spinner from '$lib/components/Spinner.svelte';

    let { data } = $props();
    let loading = $state<Record<string, boolean>>({});
</script>

<div class="p-4 pb-20">
    <h2 class="text-2xl font-bold text-blue-300 mb-6">Alliance</h2>

    {#if data.inAlliance}
        <div class="bg-gray-800 border border-gray-700 rounded p-6 mb-6">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h1 class="text-3xl font-bold text-white">[{data.alliance.tag}] {data.alliance.name}</h1>
                    <p class="text-gray-400">Founder ID: {data.alliance.ownerId}</p>
                </div>
                <form method="POST" action="?/leave" use:enhance={() => {
                    loading['leave'] = true;
                    return async ({ update }) => {
                        loading['leave'] = false;
                        await update();
                    };
                }}>
                    <button disabled={loading['leave']} class="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                        {#if loading['leave']}
                            <Spinner size="sm" class="mr-2" />
                        {/if}
                        Leave Alliance
                    </button>
                </form>
            </div>

            <h3 class="text-xl font-bold text-gray-300 mb-4">Members ({data.members.length})</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="text-gray-500 border-b border-gray-700">
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
        </div>
    {:else}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Create Alliance -->
            <div class="bg-gray-800 border border-gray-700 rounded p-6">
                <h3 class="text-xl font-bold text-white mb-4">Found Alliance</h3>
                <form method="POST" action="?/create" use:enhance={() => {
                    loading['create'] = true;
                    return async ({ update }) => {
                        loading['create'] = false;
                        await update();
                    };
                }} class="space-y-4">
                    <div>
                        <label class="block text-gray-400 mb-1">Alliance Tag (3-8 chars)</label>
                        <input type="text" name="tag" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" maxlength="8" required>
                    </div>
                    <div>
                        <label class="block text-gray-400 mb-1">Alliance Name</label>
                        <input type="text" name="name" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" required>
                    </div>
                    <button disabled={loading['create']} class="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                        {#if loading['create']}
                            <Spinner size="sm" class="mr-2" />
                        {/if}
                        Found Alliance
                    </button>
                </form>
            </div>

            <!-- Join Alliance -->
            <div class="bg-gray-800 border border-gray-700 rounded p-6">
                <h3 class="text-xl font-bold text-white mb-4">Join Alliance</h3>
                {#if data.alliances.length === 0}={() => {
                                    loading[alliance.id] = true;
                                    return async ({ update }) => {
                                        loading[alliance.id] = false;
                                        await update();
                                    };
                                }}>
                                    <input type="hidden" name="allianceId" value={alliance.id}>
                                    <button disabled={loading[alliance.id]} class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                                        {#if loading[alliance.id]}
                                            <Spinner size="sm" class="mr-2" />
                                        {/if}
                                        Join
                                    
                    <div class="space-y-2">
                        {#each data.alliances as alliance}
                            <div class="flex justify-between items-center bg-gray-900 p-3 rounded">
                                <div>
                                    <span class="font-bold text-blue-400">[{alliance.tag}]</span>
                                    <span class="text-gray-300 ml-2">{alliance.name}</span>
                                    <span class="text-gray-500 text-sm ml-2">({alliance.memberCount} members)</span>
                                </div>
                                <form method="POST" action="?/join" use:enhance>
                                    <input type="hidden" name="allianceId" value={alliance.id}>
                                    <button class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition-transform active:scale-95">Join</button>
                                </form>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>
