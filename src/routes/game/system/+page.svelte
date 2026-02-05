<script lang="ts">
	import { page } from '$app/stores';

	let { data } = $props();

	function prevSystem() {
		if (data.system > 1) return `/game/system?galaxy=${data.galaxy}&system=${data.system - 1}`;
		return '#';
	}

	function nextSystem() {
		if (data.system < 499) return `/game/system?galaxy=${data.galaxy}&system=${data.system + 1}`;
		return '#';
	}
</script>

<div class="p-4 pb-20">
	<!-- Navigation Header -->
	<div
		class="mb-4 flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-4"
	>
		<a
			href={prevSystem()}
			class="rounded bg-gray-700 p-2 transition hover:bg-gray-600 {data.system <= 1
				? 'pointer-events-none opacity-50'
				: ''}"
		>
			◀
		</a>
		<div class="text-center">
			<h2 class="text-xl font-bold text-blue-300">Galaxy {data.galaxy}</h2>
			<div class="font-mono text-2xl font-bold">System {data.system}</div>
		</div>
		<a
			href={nextSystem()}
			class="rounded bg-gray-700 p-2 transition hover:bg-gray-600 {data.system >= 499
				? 'pointer-events-none opacity-50'
				: ''}"
		>
			▶
		</a>
	</div>

	<!-- System Grid -->
	<div class="space-y-2">
		<div class="grid grid-cols-12 gap-2 px-2 text-xs font-bold text-gray-400 uppercase">
			<div class="col-span-1">Pos</div>
			<div class="col-span-2">Image</div>
			<div class="col-span-4">Planet</div>
			<div class="col-span-3">Player</div>
			<div class="col-span-2">Actions</div>
		</div>

		{#each data.slots as slot}
			<div
				class="flex grid grid-cols-12 items-center gap-2 rounded border border-gray-700 bg-gray-800/60 p-2 transition hover:bg-gray-700/50"
			>
				<div class="col-span-1 flex items-center justify-center font-mono text-gray-500">
					{slot.number}
				</div>

				<div class="col-span-2 flex items-center justify-center">
					{#if slot.isNebula}
						<div
							class="h-8 w-8 animate-pulse rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 shadow-lg"
						></div>
					{:else if slot.broodTarget}
						<div
							class="h-8 w-8 animate-pulse rounded-full bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 shadow-lg"
							title="Brood Target Level {slot.broodTarget.level}"
						></div>
					{:else}
						<div
							class="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 shadow-lg {slot.planet
								? ''
								: 'opacity-20 grayscale'}"
						></div>
					{/if}
				</div>

				<div class="col-span-4 flex flex-col justify-center">
					{#if slot.isNebula}
						<span class="font-bold text-purple-300">Mysterious Nebula</span>
					{:else if slot.broodTarget}
						<span class="font-bold text-red-300">Alien Brood L{slot.broodTarget.level}</span>
					{:else if slot.planet}
						<span class="font-bold text-blue-200">{slot.planet.name}</span>
					{:else}
						<span class="text-gray-500 italic">Empty Space</span>
					{/if}
				</div>

				<div class="col-span-3 flex items-center">
					{#if slot.isNebula}
						<span class="text-purple-400 italic">Unknown</span>
					{:else if slot.broodTarget}
						<span class="text-red-400 italic">Hostile</span>
					{:else if slot.planet && slot.planet.username}
						<span class="text-yellow-400">{slot.planet.username}</span>
					{:else}
						<span class="text-gray-600">-</span>
					{/if}
				</div>

				<div class="col-span-2 flex items-center justify-end space-x-1">
					{#if slot.isNebula}
						<a
							href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet=16&mission=expedition"
							class="flex items-center justify-center rounded bg-purple-900/50 p-1 text-purple-400 transition-transform hover:bg-purple-800 active:scale-95"
							title="Expedition">🔭</a
						>
					{:else if slot.broodTarget}
						<a
							href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=brood_raid"
							class="flex items-center justify-center rounded bg-red-900/50 p-1 text-red-400 transition-transform hover:bg-red-800 active:scale-95"
							title="Raid Brood">👾</a
						>
					{:else if slot.planet}
						{#if slot.planet.userId !== $page.data.user.id}
							<a
								href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=attack"
								class="flex items-center justify-center rounded bg-red-900/50 p-1 text-red-400 transition-transform hover:bg-red-800 active:scale-95"
								title="Attack">⚔️</a
							>
							<a
								href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=espionage"
								class="flex items-center justify-center rounded bg-blue-900/50 p-1 text-blue-400 transition-transform hover:bg-blue-800 active:scale-95"
								title="Espionage">👁️</a
							>
						{:else}
							<span class="text-xs text-green-500">You</span>
						{/if}
					{:else}
						<a
							href="/game/fleet?galaxy={data.galaxy}&system={data.system}&planet={slot.number}&mission=colonize"
							class="flex items-center justify-center rounded bg-green-900/50 p-1 text-green-400 transition-transform hover:bg-green-800 active:scale-95"
							title="Colonize">🌱</a
						>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
