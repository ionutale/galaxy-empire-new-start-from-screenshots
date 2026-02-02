<script lang="ts">
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/Spinner.svelte';

	let { data, form } = $props();
	let loading = $state(false);
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-900 p-4 text-white">
	<div class="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-8 shadow-xl">
		<h1 class="mb-6 text-center text-3xl font-bold text-blue-400">Reset Password</h1>

		{#if form?.error}
			<div class="mb-6 rounded border border-red-500 bg-red-900/50 p-4 text-center text-red-200">
				{form.error}
			</div>
		{/if}

		<form
			method="POST"
			class="space-y-6"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			<input type="hidden" name="token" value={data.token} />

			<div>
				<label for="password" class="mb-1 block text-sm font-medium text-gray-400"
					>New Password</label
				>
				<input
					type="password"
					id="password"
					name="password"
					required
					minlength="6"
					class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<div>
				<label for="confirmPassword" class="mb-1 block text-sm font-medium text-gray-400"
					>Confirm Password</label
				>
				<input
					type="password"
					id="confirmPassword"
					name="confirmPassword"
					required
					minlength="6"
					class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="flex w-full items-center justify-center rounded bg-blue-600 px-4 py-2 font-bold text-white transition-transform duration-200 hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if loading}
					<Spinner size="sm" class="mr-2" />
				{/if}
				Reset Password
			</button>
		</form>
	</div>
</div>
