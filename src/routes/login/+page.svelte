<script lang="ts">
    import type { ActionData } from './$types';
    import { page } from '$app/stores';
    
    let { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-900 text-white">
    <div class="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
        <h1 class="text-3xl font-bold mb-6 text-center text-blue-400">Commander Login</h1>
        
        {#if $page.url.searchParams.get('reset') === 'success'}
            <div class="bg-green-900/50 border border-green-500 text-green-200 p-3 rounded mb-4 text-center text-sm">
                Password reset successfully. Please login with your new password.
            </div>
        {/if}

        <form method="POST" class="space-y-4">
            <div>
                <label for="username" class="block text-sm font-medium text-gray-300">Username</label>
                <input type="text" id="username" name="username" required 
                    class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
                <div class="flex justify-between items-center">
                    <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
                    <a href="/forgot-password" class="text-xs text-blue-400 hover:text-blue-300">Forgot Password?</a>
                </div>
                <input type="password" id="password" name="password" required 
                    class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            {#if form?.missing}
                <p class="text-red-500 text-sm">Please enter username and password.</p>
            {/if}
            
            {#if form?.invalid}
                <p class="text-red-500 text-sm">Invalid username or password.</p>
            {/if}
            
            {#if form?.error}
                <p class="text-red-500 text-sm">{form.error}</p>
            {/if}

            <button type="submit" 
                class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-bold transition-transform active:scale-95 duration-200">
                Login
            </button>
        </form>
        
        <p class="mt-4 text-center text-sm text-gray-400">
            New commander? <a href="/register" class="text-blue-400 hover:underline transition-transform active:scale-95 inline-block">Register</a>
        </p>
    </div>
</div>
