import { redirect, type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';

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
