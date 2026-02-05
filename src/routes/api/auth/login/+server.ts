import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { comparePassword, createSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return json({ success: false, missing: true }, { status: 400 });
    }

    const result = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash
      })
      .from(users)
      .where(eq(users.username, username));

    const user = result[0];

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return json({ success: false, invalid: true }, { status: 400 });
    }

    const sessionId = await createSession(user.id);
    cookies.set('session_id', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
};
