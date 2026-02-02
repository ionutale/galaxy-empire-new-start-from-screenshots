<script lang="ts">
	import { SHIPS, DEFENSES } from '$lib/game-config';

	let { data } = $props();

	let report = $derived(data.report);

	function formatFleet(fleet: Record<string, number>) {
		return Object.entries(fleet)
			.filter(([_, count]) => count > 0)
			.map(([type, count]) => `${type}: ${count}`)
			.join(', ');
	}

	function calculateTotalValue(fleet: Record<string, number>, isShips: boolean = true) {
		const config = isShips ? SHIPS : DEFENSES;
		return Object.entries(fleet).reduce((total, [type, count]) => {
			const unit = config[type as keyof typeof config];
			if (unit) {
				return total + (unit.metal + unit.crystal + unit.gas) * count;
			}
			return total;
		}, 0);
	}

	function calculateRemainingFleet(original: Record<string, number>, losses: Record<string, number>) {
		const remaining: Record<string, number> = {};
		for (const [type, count] of Object.entries(original)) {
			remaining[type] = Math.max(0, count - (losses[type] || 0));
		}
		return remaining;
	}
</script>

<div class="p-4 pb-20">
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-2xl font-bold text-blue-300">Combat Report</h2>
		<a
			href="/game/messages"
			class="rounded bg-gray-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-600"
		>
			← Back to Messages
		</a>
	</div>

	<div class="rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
		<!-- Header -->
		<div class="mb-6 text-center">
			<div class="mb-2 text-lg font-bold text-yellow-400">
				{report.mission.toUpperCase()} MISSION
			</div>
			<div class="text-sm text-gray-400">
				[{report.galaxy}:{report.system}:{report.planet}] • {new Date(report.createdAt).toLocaleString()}
			</div>
		</div>

		<!-- Result -->
		<div class="mb-6 text-center">
			<div class="inline-block rounded-full px-6 py-2 text-lg font-bold {
				report.winner === 'attacker'
					? 'bg-green-900 text-green-200'
					: report.winner === 'defender'
					? 'bg-red-900 text-red-200'
					: 'bg-yellow-900 text-yellow-200'
			}">
				{report.winner === 'attacker' ? 'ATTACKER VICTORY' : report.winner === 'defender' ? 'DEFENDER VICTORY' : 'DRAW'}
			</div>
		</div>

		<!-- Combatants -->
		<div class="grid gap-6 md:grid-cols-2">
			<!-- Attacker -->
			<div class="rounded-lg border border-gray-600 bg-gray-900 p-4">
				<div class="mb-3 flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-blue-500"></div>
					<h3 class="font-bold text-blue-300">
						Attacker: {report.attackerName}
						{#if report.isAttacker}
							<span class="ml-2 text-xs text-blue-400">(You)</span>
						{/if}
					</h3>
				</div>

				<div class="space-y-3">
					<div>
						<div class="text-sm font-semibold text-gray-300">Fleet Before Combat:</div>
						<div class="text-sm text-gray-400">{formatFleet(report.attackerFleet) || 'None'}</div>
						<div class="text-xs text-gray-500">
							Value: {calculateTotalValue(report.attackerFleet).toLocaleString()} resources
						</div>
					</div>

					<div>
						<div class="text-sm font-semibold text-red-300">Losses:</div>
						<div class="text-sm text-red-400">
							{Object.keys(report.attackerLosses).length > 0
								? formatFleet(report.attackerLosses)
								: 'None'}
						</div>
						<div class="text-xs text-red-500">
							Value: {calculateTotalValue(report.attackerLosses).toLocaleString()} resources
						</div>
					</div>

					<div>
						<div class="text-sm font-semibold text-green-300">Remaining Fleet:</div>
						<div class="text-sm text-green-400">
							{formatFleet(calculateRemainingFleet(report.attackerFleet, report.attackerLosses)) || 'None'}
						</div>
					</div>
				</div>
			</div>

			<!-- Defender -->
			<div class="rounded-lg border border-gray-600 bg-gray-900 p-4">
				<div class="mb-3 flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-red-500"></div>
					<h3 class="font-bold text-red-300">
						Defender: {report.defenderName}
						{#if !report.isAttacker}
							<span class="ml-2 text-xs text-red-400">(You)</span>
						{/if}
					</h3>
				</div>

				<div class="space-y-3">
					<div>
						<div class="text-sm font-semibold text-gray-300">Fleet Before Combat:</div>
						<div class="text-sm text-gray-400">{formatFleet(report.defenderFleet) || 'None'}</div>
						<div class="text-xs text-gray-500">
							Value: {calculateTotalValue(report.defenderFleet).toLocaleString()} resources
						</div>
					</div>

					<div>
						<div class="text-sm font-semibold text-gray-300">Defenses Before Combat:</div>
						<div class="text-sm text-gray-400">{formatFleet(report.defenderDefenses) || 'None'}</div>
						<div class="text-xs text-gray-500">
							Value: {calculateTotalValue(report.defenderDefenses, false).toLocaleString()} resources
						</div>
					</div>

					<div>
						<div class="text-sm font-semibold text-red-300">Losses:</div>
						<div class="text-sm text-red-400">
							{Object.keys(report.defenderLosses).length > 0
								? formatFleet(report.defenderLosses)
								: 'None'}
						</div>
						<div class="text-xs text-red-500">
							Value: {calculateTotalValue(report.defenderLosses).toLocaleString()} resources
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Loot -->
		{#if report.loot}
			<div class="mt-6 rounded-lg border border-yellow-600 bg-yellow-900/20 p-4">
				<h3 class="mb-2 font-bold text-yellow-300">Loot Captured</h3>
				<div class="text-sm text-yellow-200">
					Metal: {report.loot.metal?.toLocaleString() || 0} •
					Crystal: {report.loot.crystal?.toLocaleString() || 0} •
					Gas: {report.loot.gas?.toLocaleString() || 0}
				</div>
			</div>
		{/if}

		<!-- Debris Field -->
		{#if report.debris}
			<div class="mt-6 rounded-lg border border-purple-600 bg-purple-900/20 p-4">
				<h3 class="mb-2 font-bold text-purple-300">Debris Field Created</h3>
				<div class="text-sm text-purple-200">
					Metal: {report.debris.metal?.toLocaleString() || 0} •
					Crystal: {report.debris.crystal?.toLocaleString() || 0}
				</div>
			</div>
		{/if}
	</div>
</div>