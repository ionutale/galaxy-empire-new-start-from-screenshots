<script lang="ts">
    let { data, form } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
    <div class="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
        <h1 class="text-3xl font-bold text-center mb-6 text-blue-400">Reset Password</h1>
        
        {#if form?.error}
            <div class="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6 text-center">
                {form.error}
            </div>
        {/if}

        <form method="POST" class="space-y-6">
            <input type="hidden" name="token" value={data.token}>
            
            <div>
                <label for="password" class="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    required 
                    minlength="6"
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
            </div>

            <div>
                <label for="confirmPassword" class="block text-sm font-medium text-gray-400 mb-1">Confirm Password</label>
                <input 
                    type="password" 
                    id="confirmPassword" 
                    name="confirmPassword" 
                    required 
                    minlength="6"
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
            </div>

            <button 
                type="submit" 
                class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
                Reset Password
            </button>
        </form>
    </div>
</div>
