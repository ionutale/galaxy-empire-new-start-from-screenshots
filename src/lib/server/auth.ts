import bcrypt from 'bcryptjs';
import { db } from './db';
import { sessions, users } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const hashPassword = async (password: string) => {
	return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string) => {
	return await bcrypt.compare(password, hash);
};

export const createSession = async (userId: number) => {
	const sessionId = randomUUID();
	// Session expires in 30 days
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

	await db.insert(sessions).values({
		id: sessionId,
		userId,
		expiresAt
	});

	return sessionId;
};

export const getSession = async (sessionId: string) => {
	const result = await db
		.select({
			id: sessions.id,
			userId: sessions.userId,
			expiresAt: sessions.expiresAt,
			username: users.username,
			darkMatter: users.darkMatter,
			allianceId: users.allianceId,
			role: users.role
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())));

	return result[0];
};

export const deleteSession = async (sessionId: string) => {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
};

// Rate limiting for auth endpoints
interface RateLimitEntry {
	attempts: number;
	resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const checkRateLimit = (ip: string): { allowed: boolean; resetTime?: number } => {
	const now = Date.now();
	const entry = rateLimitStore.get(ip);

	if (!entry || now > entry.resetTime) {
		// Reset or create new entry
		rateLimitStore.set(ip, { attempts: 1, resetTime: now + WINDOW_MS });
		return { allowed: true };
	}

	if (entry.attempts >= MAX_ATTEMPTS) {
		return { allowed: false, resetTime: entry.resetTime };
	}

	entry.attempts++;
	return { allowed: true };
};

export const resetRateLimit = (ip: string) => {
	rateLimitStore.delete(ip);
};
