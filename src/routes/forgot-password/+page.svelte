<script lang="ts">
	import { resolve } from '$app/paths';
	import Spinner from '$lib/components/Spinner.svelte';

	let loading = $state(false);
	let success = $state(false);
	let message = $state<string | null>(null);
	let error = $state<string | null>(null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		error = null;

		const formData = new FormData(event.currentTarget as HTMLFormElement);
		const data = Object.fromEntries(formData.entries());

		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			const result = await response.json();

			if (response.ok) {
				success = true;
				message = result.message;
			} else {
				error = result.error || 'An error occurred. Please try again later.';
			}
		} catch (err) {
			error = 'An unexpected error occurred.';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-900 p-4 text-white">
	<div class="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-8 shadow-xl">
		<h1 class="mb-6 text-center text-3xl font-bold text-blue-400">Forgot Password</h1>

		{#if success}
			<div
				class="mb-6 rounded border border-green-500 bg-green-900/50 p-4 text-center text-green-200"
			>
				{message}
			</div>
			<div class="text-center">
				<a href={resolve('/login')} class="text-blue-400 underline hover:text-blue-300"
					>Return to Login</a
				>
			</div>
		{:else}
			<p class="mb-6 text-center text-gray-400">
				Enter your email address and we'll send you a link to reset your password.
			</p>

			<form onsubmit={handleSubmit} class="space-y-6">
				<div>
					<label for="email" class="mb-1 block text-sm font-medium text-gray-400"
						>Email Address</label
					>
					<input
						type="email"
						id="email"
						name="email"
						required
						class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
					/>
				</div>

				{#if error}
					<p class="text-sm text-red-500">{error}</p>
				{/if}

				<button
					type="submit"
					disabled={loading}
					class="flex w-full items-center justify-center rounded bg-blue-600 px-4 py-2 font-bold text-white transition-transform duration-200 hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if loading}
						<Spinner size="sm" class="mr-2" />
					{/if}
					Send Reset Link
				</button>
			</form>

			<div class="mt-6 text-center">
				<a href={resolve('/login')} class="text-sm text-gray-400 hover:text-white">Back to Login</a>
			</div>
		{/if}
	</div>
</div>
