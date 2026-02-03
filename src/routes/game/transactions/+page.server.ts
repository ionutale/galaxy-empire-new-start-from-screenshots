import { redirect } from '@sveltejs/kit';

export async function load({ fetch, parent }) {
	const { user } = await parent();
	if (!user) throw redirect(303, '/login');

	try {
		const response = await fetch('/api/transactions');
		if (!response.ok) {
			throw new Error('Failed to fetch transactions');
		}
		const data = await response.json();
		return {
			transactions: data.transactions || []
		};
	} catch (error) {
		console.error('Error loading transactions:', error);
		return {
			transactions: []
		};
	}
}