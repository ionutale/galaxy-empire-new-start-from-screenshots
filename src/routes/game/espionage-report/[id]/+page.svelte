<script lang="ts">
	import { SHIPS, DEFENSES } from '$lib/game-config';

	interface EspionageReport {
		targetName: string;
		galaxy: number;
		system: number;
		planet: number;
		createdAt: string | Date;
		resources: { metal: number; crystal: number; gas: number };
		fleet: Record<string, number>;
		defenses: Record<string, number>;
		buildings?: Record<string, number>;
		research?: Record<string, number>;
	}

	let { data } = $props();

	let report = $derived(data.report as EspionageReport);

	function formatFleet(fleet: Record<string, number>) {
		if (!fleet) return 'No data';
		return (
			Object.entries(fleet)
				.filter(([_, count]) => count > 0)
				.map(([type, count]) => `${type}: ${count}`)
				.join(', ') || 'None'
		);
	}

	function formatBuildings(buildings: any) {
		if (!buildings) return 'No data';
		const buildingList = [];
		for (const [key, value] of Object.entries(buildings)) {
			if (typeof value === 'number' && value > 0) {
				buildingList.push(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${value}`);
			}
		}
		return buildingList.join(', ') || 'None';
	}

	function formatResearch(research: any) {
		if (!research) return 'No data';
		const researchList = [];
		for (const [key, value] of Object.entries(research)) {
			if (typeof value === 'number' && value > 0 && key !== 'userId') {
				researchList.push(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${value}`);
			}
		}
		return researchList.join(', ') || 'None';
	}
</script>

<div class="p-4 pb-20">
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-2xl font-bold text-purple-300">Espionage Report</h2>
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
			<div class="mb-2 text-lg font-bold text-purple-400">ESPIONAGE MISSION REPORT</div>
			<div class="text-sm text-gray-400">
				Target: {report.targetName} • [{report.galaxy}:{report.system}:{report.planet}] • {new Date(
					report.createdAt
				).toLocaleString()}
			</div>
		</div>

		<!-- Intelligence Sections -->
		<div class="space-y-6">
			<!-- Resources -->
			<div class="rounded-lg border border-green-600 bg-green-900/20 p-4">
				<h3 class="mb-3 flex items-center gap-2 font-bold text-green-300">
					<div class="h-3 w-3 rounded-full bg-green-500"></div>
					Resources
				</h3>
				{#if report.resources}
					<div class="grid grid-cols-3 gap-4 text-sm">
						<div>
							<div class="font-semibold text-gray-300">Metal</div>
							<div class="text-green-200">{report.resources.metal?.toLocaleString() || 0}</div>
						</div>
						<div>
							<div class="font-semibold text-gray-300">Crystal</div>
							<div class="text-green-200">{report.resources.crystal?.toLocaleString() || 0}</div>
						</div>
						<div>
							<div class="font-semibold text-gray-300">Gas</div>
							<div class="text-green-200">{report.resources.gas?.toLocaleString() || 0}</div>
						</div>
					</div>
				{:else}
					<div class="text-gray-500">No resource data available</div>
				{/if}
			</div>

			<!-- Fleet -->
			<div class="rounded-lg border border-blue-600 bg-blue-900/20 p-4">
				<h3 class="mb-3 flex items-center gap-2 font-bold text-blue-300">
					<div class="h-3 w-3 rounded-full bg-blue-500"></div>
					Fleet
				</h3>
				<div class="text-sm text-blue-200">
					{formatFleet(report.fleet)}
				</div>
			</div>

			<!-- Defenses -->
			<div class="rounded-lg border border-red-600 bg-red-900/20 p-4">
				<h3 class="mb-3 flex items-center gap-2 font-bold text-red-300">
					<div class="h-3 w-3 rounded-full bg-red-500"></div>
					Defenses
				</h3>
				<div class="text-sm text-red-200">
					{formatFleet(report.defenses)}
				</div>
			</div>

			<!-- Buildings -->
			<div class="rounded-lg border border-yellow-600 bg-yellow-900/20 p-4">
				<h3 class="mb-3 flex items-center gap-2 font-bold text-yellow-300">
					<div class="h-3 w-3 rounded-full bg-yellow-500"></div>
					Buildings
				</h3>
				<div class="text-sm text-yellow-200">
					{formatBuildings(report.buildings)}
				</div>
			</div>

			<!-- Research -->
			<div class="rounded-lg border border-purple-600 bg-purple-900/20 p-4">
				<h3 class="mb-3 flex items-center gap-2 font-bold text-purple-300">
					<div class="h-3 w-3 rounded-full bg-purple-500"></div>
					Research
				</h3>
				<div class="text-sm text-purple-200">
					{formatResearch(report.research)}
				</div>
			</div>
		</div>

		<!-- Footer Note -->
		<div class="mt-6 rounded-lg border border-gray-600 bg-gray-900/50 p-4">
			<div class="text-xs text-gray-400">
				<strong>Note:</strong> Espionage data is current as of the time the probe was sent. There is a
				30% chance of detection when conducting espionage missions.
			</div>
		</div>
	</div>
</div>
