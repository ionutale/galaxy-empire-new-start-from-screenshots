<script lang="ts">
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/Spinner.svelte';

	let { data, form } = $props();
	let loading = $state<Record<string, boolean>>({});

	const avatars = [
		{ id: 1, icon: '👨‍🚀', name: 'Commander' },
		{ id: 2, icon: '👽', name: 'Alien' },
		{ id: 3, icon: '🤖', name: 'Droid' },
		{ id: 4, icon: '🤴', name: 'Emperor' },
		{ id: 5, icon: '👩‍🚀', name: 'Captain' },
		{ id: 6, icon: '🧛', name: 'Overlord' }
	];
</script>

<div class="mx-auto max-w-2xl p-4 pb-20">
	<h2 class="mb-6 text-2xl font-bold text-blue-300">Settings</h2>

	{#if form?.message}
		<div class="mb-6 rounded border border-green-500 bg-green-900/50 p-4 text-green-200">
			{form.message}
		</div>
	{/if}

	{#if form?.error}
		<div class="mb-6 rounded border border-red-500 bg-red-900/50 p-4 text-red-200">
			{form.error}
		</div>
	{/if}

	<!-- Profile Settings -->
	<div class="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
		<h3 class="mb-4 text-xl font-bold text-gray-200">Profile</h3>

		<form
			method="POST"
			action="?/updateProfile"
			use:enhance={() => {
				loading['profile'] = true;
				return async ({ update }) => {
					loading['profile'] = false;
					await update();
				};
			}}
			class="space-y-4"
		>
			<div>
				<label class="mb-2 block text-sm text-gray-400" for="email">Email Address</label>
				<input
					type="email"
					name="email"
					id="email"
					value={data.profile.email}
					class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<div>
				<span class="mb-2 block text-sm text-gray-400">Avatar</span>
				<div class="grid grid-cols-3 gap-2 sm:grid-cols-6">
					{#each avatars as avatar}
						<label class="cursor-pointer" for="avatar-{avatar.id}">
							<input
								type="radio"
								name="avatar_id"
								id="avatar-{avatar.id}"
								value={avatar.id}
								class="peer sr-only"
								checked={data.profile.avatarId === avatar.id}
							/>
							<div
								class="flex flex-col items-center rounded border border-gray-700 bg-gray-700/50 p-2 transition peer-checked:border-blue-400 peer-checked:bg-blue-600 hover:bg-gray-600"
							>
								<span class="mb-1 text-2xl">{avatar.icon}</span>
								<span class="text-10px text-gray-300">{avatar.name}</span>
							</div>
						</label>
					{/each}
				</div>
			</div>

			<button
				type="submit"
				disabled={loading['profile']}
				class="flex w-full transform items-center justify-center rounded bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
			>
				{#if loading['profile']}
					<Spinner size="sm" class="mr-2" />
				{/if}
				Save Profile
			</button>
		</form>
	</div>

	<!-- Change Password -->
	<div class="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
		<h3 class="mb-4 text-xl font-bold text-gray-300">Change Password</h3>

		<form
			method="POST"
			action="?/changePassword"
			use:enhance={() => {
				loading['password'] = true;
				return async ({ update }) => {
					loading['password'] = false;
					await update();
				};
			}}
			class="space-y-4"
		>
			<!-- Hidden username field for accessibility/password managers -->
			<input
				type="text"
				name="username"
				autocomplete="username"
				class="hidden"
				aria-hidden="true"
				value={data.profile.email}
			/>

			<div>
				<label class="mb-2 block text-sm text-gray-400" for="current_password"
					>Current Password</label
				>
				<input
					type="password"
					name="current_password"
					id="current_password"
					autocomplete="current-password"
					class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm text-gray-400" for="new_password">New Password</label>
				<input
					type="password"
					name="new_password"
					id="new_password"
					autocomplete="new-password"
					class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm text-gray-400" for="confirm_password"
					>Confirm New Password</label
				>
				<input
					type="password"
					name="confirm_password"
					id="confirm_password"
					autocomplete="new-password"
					class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<button
				type="submit"
				disabled={loading['password']}
				class="flex w-full transform items-center justify-center rounded bg-yellow-600 px-4 py-2 font-bold text-white transition hover:bg-yellow-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
			>
				{#if loading['password']}
					<Spinner size="sm" class="mr-2" />
				{/if}
				Change Password
			</button>
		</form>
	</div>

	<!-- Logout -->
	<div class="text-center">
		<form method="POST" action="?/logout" use:enhance>
			<button class="text-sm text-red-400 underline hover:text-red-300"> Log Out </button>
		</form>
	</div>
</div>
