import { json } from '@sveltejs/kit';
import { processFleets } from '$lib/server/fleet-processor';
import { processAutoExplore } from '$lib/server/auto-explorer';

export async function GET() {
    try {
        await processFleets();
        await processAutoExplore();
        return json({ success: true });
    } catch (e) {
        console.error('Game tick error:', e);
        return json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}
