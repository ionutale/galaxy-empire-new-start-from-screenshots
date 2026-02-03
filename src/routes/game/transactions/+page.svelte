<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: transactions = data.transactions;
</script>

<svelte:head>
	<title>Transaction History - Galaxy Empire</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold text-white mb-8">Transaction History</h1>

	<div class="bg-gray-800 rounded-lg p-6">
		{#if transactions.length === 0}
			<p class="text-gray-400 text-center py-8">No transactions found.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-white">
					<thead>
						<tr class="border-b border-gray-600">
							<th class="text-left py-3 px-4">Date</th>
							<th class="text-left py-3 px-4">Type</th>
							<th class="text-left py-3 px-4">Description</th>
							<th class="text-right py-3 px-4">Amount</th>
						</tr>
					</thead>
					<tbody>
						{#each transactions as transaction}
							<tr class="border-b border-gray-700 hover:bg-gray-700">
								<td class="py-3 px-4">
									{new Date(transaction.createdAt).toLocaleDateString()} {new Date(transaction.createdAt).toLocaleTimeString()}
								</td>
								<td class="py-3 px-4 capitalize">
									<span class="px-2 py-1 rounded text-xs font-medium
										{transaction.type === 'purchase' ? 'bg-green-600 text-green-100' :
										 transaction.type === 'refund' ? 'bg-blue-600 text-blue-100' :
										 'bg-gray-600 text-gray-100'}">
										{transaction.type}
									</span>
								</td>
								<td class="py-3 px-4">
									{transaction.description}
									{#if transaction.metadata}
										<div class="text-sm text-gray-400 mt-1">
											{#if transaction.metadata.itemName}
												Item: {transaction.metadata.itemName}
											{/if}
											{#if transaction.metadata.commanderName}
												Commander: {transaction.metadata.commanderName}
											{/if}
											{#if transaction.metadata.durationDays}
												Duration: {transaction.metadata.durationDays} days
											{/if}
										</div>
									{/if}
								</td>
								<td class="py-3 px-4 text-right font-mono">
									<span class="text-red-400">-{transaction.amount} DM</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>