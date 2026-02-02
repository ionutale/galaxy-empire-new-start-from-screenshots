<script lang="ts">
	import type { ActionData } from './$types';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/Spinner.svelte';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-900 text-white">
	<div class="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-8 shadow-lg">
		<h1 class="mb-6 text-center text-3xl font-bold text-blue-400">Commander Login</h1>

		{#if $page.url.searchParams.get('reset') === 'success'}
			<div
				class="mb-4 rounded border border-green-500 bg-green-900/50 p-3 text-center text-sm text-green-200"
			>
				Password reset successfully. Please login with your new password.
			</div>
		{/if}

		<form
			method="POST"
			class="space-y-4"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			<div>
				<label for="username" class="block text-sm font-medium text-gray-300">Username</label>
				<input
					type="text"
					id="username"
					name="username"
					required
					class="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-gray-300">Password</label>

				<input
					type="password"
					id="password"
					name="password"
					required
					class="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
				<div class="flex items-center justify-between">
					<a href="/forgot-password" class="text-xs text-blue-400 hover:text-blue-300"
						>Forgot Password?</a
					>
				</div>
			</div>

			{#if form?.missing}
				<p class="text-sm text-red-500">Please enter username and password.</p>
			{/if}

			{#if form?.invalid}
				<p class="text-sm text-red-500">Invalid username or password.</p>
			{/if}

			{#if form?.error}
				<p class="text-sm text-red-500">{form.error}</p>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 font-bold text-white transition-transform duration-200 hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if loading}
					<Spinner size="sm" class="mr-2" />
				{/if}
				Login
			</button>
		</form>

		<p class="mt-4 text-center text-sm text-gray-400">
			New commander? <a
				href="/register"
				class="inline-block text-blue-400 transition-transform hover:underline active:scale-95"
				>Register</a
			>
		</p>
	</div>
</div>
