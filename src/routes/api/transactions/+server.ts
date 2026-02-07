import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { transactions } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = locals.user.id;

	try {
		const userTransactions = await db
			.select({
				id: transactions.id,
				type: transactions.type,
				amount: transactions.amount,
				description: transactions.description,
				metadata: transactions.metadata,
				createdAt: transactions.createdAt
			})
			.from(transactions)
			.where(eq(transactions.userId, userId))
			.orderBy(desc(transactions.createdAt))
			.limit(50); // Limit to last 50 transactions

		return json({
			transactions: userTransactions
		});
	} catch (error) {
		console.error('Error fetching transactions:', error);
		return json({ error: 'Failed to fetch transactions' }, { status: 500 });
	}
}
