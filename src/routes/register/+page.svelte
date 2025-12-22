<script lang="ts">
    import type { ActionData } from './$types';
    import { enhance } from '$app/forms';
    import Spinner from '$lib/components/Spinner.svelte';
    
    let { form }: { form: ActionData } = $props();
    let loading = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-900 text-white">
    <div class="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
        <h1 class="text-3xl font-bold mb-6 text-center text-blue-400">Join the Empire</h1>
        
        <form method="POST" class="space-y-4" use:enhance={() => {
            loading = true;
            return async ({ update }) => {
                loading = false;
                await update();
            };
        }}>
            <div>
                <label for="username" class="block text-sm font-medium text-gray-300">Username</label>
                <input type="text" id="username" name="username" required 
                    class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
                <label for="email" class="block text-sm font-medium text-gray-300">Email</label>
                <input type="email" id="email" name="email" required 
                    class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
                <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
                <input type="password" id="password" name="password" required 
                    class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            {#if form?.missing}
                <p class="text-red-500 text-sm">Please fill in all fields.</p>
            {/if}
            
            {#if form?.userExists}
                <p class="text-red-500 text-sm">Username or email already taken.</p>
            {/if}
            
            {#if form?.error}
                <p class="text-red-500 text-sm">{form.error}</p>
            {/if}

            <button type="submit" disabled={loading}
                class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-bold transition-transform active:scale-95 duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                {#if loading}
                    <Spinner size="sm" class="mr-2" />
                {/if}
                Register
            </button>
        </form>
        
        <p class="mt-4 text-center text-sm text-gray-400">
            Already have an account? <a href="/login" class="text-blue-400 hover:underline transition-transform active:scale-95 inline-block">Login</a>
        </p>
    </div>
</div>
