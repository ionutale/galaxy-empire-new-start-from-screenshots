<script lang="ts">
	import Spinner from '$lib/components/Spinner.svelte';
	import { invalidateAll, goto } from '$app/navigation';

	let { data } = $props();
	let loading = $state<Record<string, boolean>>({});
	let message = $state<string | null>(null);
	let error = $state<string | null>(null);

	// Form states
	let email = $state.raw(data.profile.email);
	let avatarId = $state.raw(data.profile.avatarId);
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	$effect(() => {
		email = data.profile.email;
		avatarId = data.profile.avatarId;
	});

	const avatars = [
		{ id: 1, icon: '👨‍🚀', name: 'Commander' },
		{ id: 2, icon: '👽', name: 'Alien' },
		{ id: 3, icon: '🤖', name: 'Droid' },
		{ id: 4, icon: '🤴', name: 'Emperor' },
		{ id: 5, icon: '👩‍🚀', name: 'Captain' },
		{ id: 6, icon: '🧛', name: 'Overlord' }
	];

	async function handleUpdateProfile(e: Event) {
		e.preventDefault();
		loading['profile'] = true;
		message = null;
		error = null;

		try {
			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'updateProfile',
					email,
					avatar_id: avatarId
				})
			});
			const result = await response.json();

			if (result.success) {
				message = result.message;
				await invalidateAll();
			} else {
				error = result.error;
			}
		} catch (e: any) {
			error = 'An error occurred';
		} finally {
			loading['profile'] = false;
		}
	}

	async function handleChangePassword(e: Event) {
		e.preventDefault();
		loading['password'] = true;
		message = null;
		error = null;

		try {
			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'changePassword',
					current_password: currentPassword,
					new_password: newPassword,
					confirm_password: confirmPassword
				})
			});
			const result = await response.json();

			if (result.success) {
				message = result.message;
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
			} else {
				error = result.error;
			}
		} catch (e: any) {
			error = 'An error occurred';
		} finally {
			loading['password'] = false;
		}
	}

	async function handleLogout() {
		try {
			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'logout' })
			});
			const result = await response.json();
			if (result.redirect) {
				goto(result.redirect);
			}
		} catch (e) {
			console.error('Logout failed', e);
		}
	}
</script>

<div class="mx-auto max-w-2xl p-4 pb-20">
	<h2 class="mb-6 text-2xl font-bold text-blue-300">Settings</h2>

	{#if message}
		<div class="mb-6 rounded border border-green-500 bg-green-900/50 p-4 text-green-200">
			{message}
		</div>
	{/if}

	{#if error}
		<div class="mb-6 rounded border border-red-500 bg-red-900/50 p-4 text-red-200">
			{error}
		</div>
	{/if}

	<!-- Profile Settings -->
	<div class="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
		<h3 class="mb-4 text-xl font-bold text-gray-200">Profile</h3>

		<form onsubmit={handleUpdateProfile} class="space-y-4">
			<div>
				<label class="mb-2 block text-sm text-gray-400" for="email">Email Address</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<div>
				<span class="mb-2 block text-sm text-gray-400">Avatar</span>
				<div class="grid grid-cols-3 gap-2 sm:grid-cols-6">
					{#each avatars as avatar (avatar.id)}
						<label class="cursor-pointer" for="avatar-{avatar.id}">
							<input
								type="radio"
								name="avatar_id"
								id="avatar-{avatar.id}"
								value={avatar.id}
								class="peer sr-only"
								bind:group={avatarId}
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

		<form onsubmit={handleChangePassword} class="space-y-4">
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
					id="current_password"
					autocomplete="current-password"
					bind:value={currentPassword}
					class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm text-gray-400" for="new_password">New Password</label>
				<input
					type="password"
					id="new_password"
					autocomplete="new-password"
					bind:value={newPassword}
					class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm text-gray-400" for="confirm_password"
					>Confirm New Password</label
				>
				<input
					type="password"
					id="confirm_password"
					autocomplete="new-password"
					bind:value={confirmPassword}
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
		<button onclick={handleLogout} class="text-sm text-red-400 underline hover:text-red-300">
			Log Out
		</button>
	</div>
</div>
