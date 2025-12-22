import { redirect, type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import { processFleets } from '$lib/server/fleet-processor';
import { processAutoExplore } from '$lib/server/auto-explorer';
import { building } from '$app/environment';

// Global interval handling for dev HMR
declare global {
    var __game_tick_interval: NodeJS.Timeout | undefined;
}

function startTickLoop() {
    if (globalThis.__game_tick_interval) {
        clearInterval(globalThis.__game_tick_interval);
    }

    console.log('Starting game tick loop...');
    globalThis.__game_tick_interval = setInterval(async () => {
        try {
            await processFleets();
            await processAutoExplore();
        } catch (e) {
            console.error('Tick error:', e);
        }
    }, 1000);
}

if (!building) {
    startTickLoop();
}

export const handle: Handle = async ({ event, resolve }) => {
    const sessionId = event.cookies.get('session_id');

    if (sessionId) {
        const session = await getSession(sessionId);
        if (session) {
            event.locals.user = {
                id: session.userId,
                username: session.username,
                darkMatter: session.darkMatter
            };
        }
    }

    return resolve(event);
};
