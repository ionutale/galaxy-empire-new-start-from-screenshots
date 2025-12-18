import { redirect, type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import { initDb } from '$lib/server/init-db';

// Initialize database on startup
initDb().catch(console.error);

export const handle: Handle = async ({ event, resolve }) => {
    const sessionId = event.cookies.get('session_id');

    if (sessionId) {
        const session = await getSession(sessionId);
        if (session) {
            event.locals.user = {
                id: session.user_id,
                username: session.username,
                darkMatter: session.dark_matter
            };
        }
    }

    return resolve(event);
};
