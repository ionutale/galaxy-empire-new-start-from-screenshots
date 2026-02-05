<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: transactions = data.transactions;
</script>

<svelte:head>
	<title>Transaction History - Galaxy Empire</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<h1 class="mb-8 text-3xl font-bold text-white">Transaction History</h1>

	<div class="rounded-lg bg-gray-800 p-6">
		{#if transactions.length === 0}
			<p class="py-8 text-center text-gray-400">No transactions found.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-white">
					<thead>
						<tr class="border-b border-gray-600">
							<th class="px-4 py-3 text-left">Date</th>
							<th class="px-4 py-3 text-left">Type</th>
							<th class="px-4 py-3 text-left">Description</th>
							<th class="px-4 py-3 text-right">Amount</th>
						</tr>
					</thead>
					<tbody>
						{#each transactions as transaction (transaction.id)}
							<tr class="border-b border-gray-700 hover:bg-gray-700">
								<td class="px-4 py-3">
									{new Date(transaction.createdAt).toLocaleDateString()}
									{new Date(transaction.createdAt).toLocaleTimeString()}
								</td>
								<td class="px-4 py-3 capitalize">
									<span
										class="rounded px-2 py-1 text-xs font-medium
										{transaction.type === 'purchase'
											? 'bg-green-600 text-green-100'
											: transaction.type === 'refund'
												? 'bg-blue-600 text-blue-100'
												: 'bg-gray-600 text-gray-100'}"
									>
										{transaction.type}
									</span>
								</td>
								<td class="px-4 py-3">
									{transaction.description}
									{#if transaction.metadata}
										<div class="mt-1 text-sm text-gray-400">
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
								<td class="px-4 py-3 text-right font-mono">
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
