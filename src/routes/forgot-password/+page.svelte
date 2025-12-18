<script lang="ts">
    let { form } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
    <div class="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
        <h1 class="text-3xl font-bold text-center mb-6 text-blue-400">Forgot Password</h1>
        
        {#if form?.success}
            <div class="bg-green-900/50 border border-green-500 text-green-200 p-4 rounded mb-6 text-center">
                {form.message}
            </div>
            <div class="text-center">
                <a href="/login" class="text-blue-400 hover:text-blue-300 underline">Return to Login</a>
            </div>
        {:else}
            <p class="text-gray-400 mb-6 text-center">
                Enter your email address and we'll send you a link to reset your password.
            </p>

            <form method="POST" class="space-y-6">
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        required 
                        class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                </div>

                <button 
                    type="submit" 
                    class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition duration-200"
                >
                    Send Reset Link
                </button>
            </form>

            <div class="mt-6 text-center">
                <a href="/login" class="text-sm text-gray-400 hover:text-white">Back to Login</a>
            </div>
        {/if}
    </div>
</div>
