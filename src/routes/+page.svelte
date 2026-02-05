<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
	<h1 class="mb-4 text-5xl font-bold text-blue-500">Galaxy Empire</h1>
	<p class="mb-8 text-xl text-gray-400">Conquer the universe, one planet at a time.</p>

	<div class="space-x-4">
		<a
			href={resolve('/login')}
			class="rounded-md bg-blue-600 px-6 py-3 font-bold transition hover:bg-blue-700">Login</a
		>
		<a
			href={resolve('/register')}
			class="rounded-md bg-gray-700 px-6 py-3 font-bold transition hover:bg-gray-600">Register</a
		>
	</div>
</div>
