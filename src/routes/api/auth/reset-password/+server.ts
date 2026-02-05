import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { passwordResets, users } from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { hashPassword } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { token, password, confirmPassword } = await request.json();

    if (!token || !password || !confirmPassword) {
      return json({ success: false, error: 'All fields are required' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return json({ success: false, error: 'Passwords do not match' }, { status: 400 });
    }

    if (password.length < 6) {
      return json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // 1. Verify token again
    const result = await db
      .select({ userId: passwordResets.userId })
      .from(passwordResets)
      .where(and(eq(passwordResets.token, token), gt(passwordResets.expiresAt, new Date())));

    if (result.length === 0) {
      return json({ success: false, error: 'Invalid or expired token' }, { status: 400 });
    }

    const userId = result[0].userId;

    if (!userId) {
      return json({ success: false, error: 'Invalid user associated with token' }, { status: 400 });
    }

    // 2. Update password
    const hashedPassword = await hashPassword(password);
    await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, userId));

    // 3. Delete used token (and any other tokens for this user)
    await db.delete(passwordResets).where(eq(passwordResets.userId, userId));

    return json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return json({ success: false, error: 'An error occurred. Please try again.' }, { status: 500 });
  }
};
