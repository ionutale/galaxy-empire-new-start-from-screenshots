<script lang="ts">
    import { enhance } from '$app/forms';
    
    let { data, form } = $props();

    const avatars = [
        { id: 1, icon: '👨‍🚀', name: 'Commander' },
        { id: 2, icon: '👽', name: 'Alien' },
        { id: 3, icon: '🤖', name: 'Droid' },
        { id: 4, icon: '🤴', name: 'Emperor' },
        { id: 5, icon: '👩‍🚀', name: 'Captain' },
        { id: 6, icon: '🧛', name: 'Overlord' },
    ];
</script>

<div class="p-4 pb-20 max-w-2xl mx-auto">
    <h2 class="text-2xl font-bold text-blue-300 mb-6">Settings</h2>

    {#if form?.message}
        <div class="bg-green-900/50 border border-green-500 text-green-200 p-4 rounded mb-6">
            {form.message}
        </div>
    {/if}

    {#if form?.error}
        <div class="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6">
            {form.error}
        </div>
    {/if}

    <!-- Profile Settings -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6 shadow-lg">
        <h3 class="text-xl font-bold text-gray-200 mb-4">Profile</h3>
        
        <form method="POST" action="?/updateProfile" use:enhance class="space-y-4">
            <div>
                <label class="block text-gray-400 text-sm mb-2" for="email">Email Address</label>
                <input 
                    type="email" 
                    name="email" 
                    id="email" 
                    value={data.profile.email}
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
            </div>

            <div>
                <span class="block text-gray-400 text-sm mb-2">Avatar</span>
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {#each avatars as avatar}
                        <label class="cursor-pointer" for="avatar-{avatar.id}">
                            <input 
                                type="radio" 
                                name="avatar_id" 
                                id="avatar-{avatar.id}" 
                                value={avatar.id} 
                                class="peer sr-only" 
                                checked={data.profile.avatar_id === avatar.id}
                            >
                            <div class="flex flex-col items-center p-2 rounded border border-gray-700 bg-gray-700/50 peer-checked:bg-blue-600 peer-checked:border-blue-400 hover:bg-gray-600 transition">
                                <span class="text-2xl mb-1">{avatar.icon}</span>
                                <span class="text-[10px] text-gray-300">{avatar.name}</span>
                            </div>
                        </label>
                    {/each}
                </div>
            </div>

            <button type="submit" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition w-full sm:w-auto">
                Save Profile
            </button>
        </form>
    </div>

    <!-- Password Settings -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6 shadow-lg">
        <h3 class="text-xl font-bold text-gray-200 mb-4">Change Password</h3>
        
        <form method="POST" action="?/changePassword" use:enhance class="space-y-4">
            <div>
                <label class="block text-gray-400 text-sm mb-2" for="current_password">Current Password</label>
                <input 
                    type="password" 
                    name="current_password" 
                    id="current_password" 
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
            </div>

            <div>
                <label class="block text-gray-400 text-sm mb-2" for="new_password">New Password</label>
                <input 
                    type="password" 
                    name="new_password" 
                    id="new_password" 
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
            </div>

            <div>
                <label class="block text-gray-400 text-sm mb-2" for="confirm_password">Confirm New Password</label>
                <input 
                    type="password" 
                    name="confirm_password" 
                    id="confirm_password" 
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
            </div>

            <button type="submit" class="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded transition w-full sm:w-auto">
                Change Password
            </button>
        </form>
    </div>

    <!-- Push Notifications -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6 shadow-lg">
        <h3 class="text-xl font-bold text-gray-200 mb-4">Push Notifications</h3>
        <p class="text-gray-400 text-sm mb-4">
            Test if push notifications are working correctly on this device.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4">
            <form method="POST" action="?/testPush" use:enhance class="flex-1">
                <button type="submit" class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded transition w-full">
                    Test Push Notification
                </button>
            </form>

            <button 
                type="button" 
                onclick={async () => {
                    if (!confirm('This will reset your push notification registration. Continue?')) return;
                    try {
                        const registration = await navigator.serviceWorker.ready;
                        const subscription = await registration.pushManager.getSubscription();
                        if (subscription) {
                            await subscription.unsubscribe();
                        }
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (let reg of registrations) {
                            await reg.unregister();
                        }
                        alert('Push notifications reset. The page will now reload.');
                        window.location.reload();
                    } catch (e) {
                        console.error('Failed to reset push:', e);
                        alert('Failed to reset push notifications. See console for details.');
                    }
                }}
                class="bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-2 px-4 rounded transition flex-1"
            >
                Reset Notifications
            </button>
        </div>
    </div>

    <!-- Logout -->
    <div class="text-center">
        <form method="POST" action="?/logout" use:enhance>
            <button class="text-red-400 hover:text-red-300 text-sm underline">
                Log Out
            </button>
        </form>
    </div>
</div>
