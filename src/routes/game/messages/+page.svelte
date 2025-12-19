<script lang="ts">
    import { invalidate } from '$app/navigation';
    import { onMount } from 'svelte';

    let { data } = $props();

    onMount(() => {
        invalidate('app:unread-messages');
    });
</script>

<div class="p-4 pb-20">
    <h2 class="text-2xl font-bold text-blue-300 mb-6">Communications</h2>

    <div class="space-y-2">
        {#if data.messages.length === 0}
            <div class="text-gray-500 text-center p-4">No messages.</div>
        {:else}
            {#each data.messages as msg}
                <div class="bg-gray-800 border border-gray-700 rounded p-4 shadow-sm {msg.isRead ? 'opacity-75' : 'border-l-4 border-l-blue-500'}">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-gray-200">{msg.title}</h3>
                        <span class="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <p class="text-gray-400 text-sm">{msg.content}</p>
                </div>
            {/each}
        {/if}
    </div>
</div>
