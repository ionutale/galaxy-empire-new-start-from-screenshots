<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import Spinner from '$lib/components/Spinner.svelte';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let missing = $state(false);
	let userExists = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		error = null;
		missing = false;
		userExists = false;

		const formData = new FormData(event.currentTarget as HTMLFormElement);
		const data = Object.fromEntries(formData.entries());

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			const result = await response.json();

			if (response.ok) {
				goto('/game');
			} else {
				if (result.missing) missing = true;
				if (result.userExists) userExists = true;
				if (result.error) error = result.error;
			}
		} catch (err) {
			error = 'An unexpected error occurred.';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-900 text-white">
	<div class="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-8 shadow-lg">
		<h1 class="mb-6 text-center text-3xl font-bold text-blue-400">Join the Empire</h1>

		<form onsubmit={handleSubmit} class="space-y-4">
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
				<label for="email" class="block text-sm font-medium text-gray-300">Email</label>
				<input
					type="email"
					id="email"
					name="email"
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
			</div>

			{#if missing}
				<p class="text-sm text-red-500">Please fill in all fields.</p>
			{/if}

			{#if userExists}
				<p class="text-sm text-red-500">Username or email already taken.</p>
			{/if}

			{#if error}
				<p class="text-sm text-red-500">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 font-bold text-white transition-transform duration-200 hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if loading}
					<Spinner size="sm" class="mr-2" />
				{/if}
				Register
			</button>
		</form>

		<p class="mt-4 text-center text-sm text-gray-400">
			Already have an account? <a
				href={resolve('/login')}
				class="inline-block text-blue-400 transition-transform hover:underline active:scale-95"
				>Login</a
			>
		</p>
	</div>
</div>
