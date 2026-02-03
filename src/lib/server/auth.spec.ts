import { describe, it, expect, beforeAll, vi } from 'vitest';
import { hashPassword, comparePassword, createSession, getSession, deleteSession } from './auth';
import { db } from './db';
import { sessions, users } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';

// Mock bcrypt
vi.mock('bcryptjs', () => ({
	default: {
		hash: vi.fn(),
		compare: vi.fn()
	}
}));

// Get the mocked bcrypt
const bcrypt = (await import('bcryptjs')).default;

// Mock crypto
vi.mock('crypto', () => ({
	randomUUID: vi.fn().mockReturnValue('session-uuid-123')
}));

// Mock the database with proper chaining support
vi.mock('./db', () => {
	const mockDb = {
		select: vi.fn(() => mockDb),
		from: vi.fn(() => mockDb),
		innerJoin: vi.fn(() => mockDb),
		where: vi.fn(() => mockDb),
		insert: vi.fn(() => mockDb),
		values: vi.fn(() => Promise.resolve()),
		delete: vi.fn(() => mockDb),
		update: vi.fn(() => mockDb),
		set: vi.fn(() => mockDb),
		execute: vi.fn(() => mockDb),
		transaction: vi.fn()
	};

	return {
		db: mockDb
	};
});

describe('Auth Service', () => {
	beforeAll(() => {
		vi.clearAllMocks();
	});

	describe('hashPassword', () => {
		it('should hash password with bcrypt', async () => {
			const mockHash = vi.fn().mockResolvedValue('hashed_password');
			bcrypt.hash = mockHash;

			const result = await hashPassword('password123');

			expect(mockHash).toHaveBeenCalledWith('password123', 10);
			expect(result).toBe('hashed_password');
		});
	});

	describe('comparePassword', () => {
		it('should compare password with hash using bcrypt', async () => {
			const mockCompare = vi.fn().mockResolvedValue(true);
			bcrypt.compare = mockCompare;

			const result = await comparePassword('password123', 'hashed_password');

			expect(mockCompare).toHaveBeenCalledWith('password123', 'hashed_password');
			expect(result).toBe(true);
		});

		it('should return false for incorrect password', async () => {
			const mockCompare = vi.fn().mockResolvedValue(false);
			bcrypt.compare = mockCompare;

			const result = await comparePassword('wrong_password', 'hashed_password');

			expect(result).toBe(false);
		});
	});

	describe('createSession', () => {
		it('should create a new session with 30-day expiration', async () => {
			// Mock the insert chain
			(db as any).insert.mockReturnValue(db);
			(db as any).values.mockResolvedValue({});

			const sessionId = await createSession(1);

			expect(sessionId).toBe('session-uuid-123');
			expect((db as any).insert).toHaveBeenCalledWith(sessions);

			expect((db as any).values).toHaveBeenCalledWith({
				id: 'session-uuid-123',
				userId: 1,
				expiresAt: expect.any(Date)
			});

			// Check expiration is approximately 30 days from now
			const valuesCall = (db as any).values.mock.calls[0];
			const expiresAt = valuesCall[0].expiresAt;
			const expectedExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
			const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
			expect(timeDiff).toBeLessThan(1000); // Within 1 second
		});
	});

	describe('getSession', () => {
		it('should return session data for valid session', async () => {
			const mockSessionData = {
				id: 'session-uuid-123',
				userId: 1,
				expiresAt: new Date(Date.now() + 1000 * 60 * 60), // Future date
				username: 'testuser',
				darkMatter: 1000,
				allianceId: null
			};

			(db as any).select.mockReturnValue(db);
			(db as any).from.mockReturnValue(db);
			(db as any).innerJoin.mockReturnValue(db);
			(db as any).where.mockResolvedValue([mockSessionData]);

			const result = await getSession('session-uuid-123');

			expect(result).toEqual(mockSessionData);
			expect((db as any).select).toHaveBeenCalledWith({
				id: sessions.id,
				userId: sessions.userId,
				expiresAt: sessions.expiresAt,
				username: users.username,
				darkMatter: users.darkMatter,
				allianceId: users.allianceId
			});
		});

		it('should return undefined for expired session', async () => {
			(db as any).select.mockReturnValue(db);
			(db as any).from.mockReturnValue(db);
			(db as any).innerJoin.mockReturnValue(db);
			(db as any).where.mockResolvedValue([]);

			const result = await getSession('expired-session-id');

			expect(result).toBeUndefined();
		});

		it('should return undefined for non-existent session', async () => {
			(db as any).select.mockReturnValue(db);
			(db as any).from.mockReturnValue(db);
			(db as any).innerJoin.mockReturnValue(db);
			(db as any).where.mockResolvedValue([]);

			const result = await getSession('non-existent-session');

			expect(result).toBeUndefined();
		});
	});

	describe('deleteSession', () => {
		it('should delete session from database', async () => {
			(db as any).delete.mockReturnValue(db);
			(db as any).where.mockResolvedValue({});

			await deleteSession('session-uuid-123');

			expect((db as any).delete).toHaveBeenCalledWith(sessions);
			expect((db as any).where).toHaveBeenCalledWith(eq(sessions.id, 'session-uuid-123'));
		});
	});

	describe('Error handling', () => {
		it('should handle database errors in createSession', async () => {
			const error = new Error('Database connection failed');
			(db as any).insert.mockReturnValue(db);
			(db as any).values.mockRejectedValue(error);

			await expect(createSession(1)).rejects.toThrow('Database connection failed');
		});

		it('should handle database errors in getSession', async () => {
			const error = new Error('Database connection failed');
			(db as any).select.mockReturnValue(db);
			(db as any).from.mockReturnValue(db);
			(db as any).innerJoin.mockReturnValue(db);
			(db as any).where.mockRejectedValue(error);

			await expect(getSession('session-id')).rejects.toThrow('Database connection failed');
		});

		it('should handle database errors in deleteSession', async () => {
			const error = new Error('Database connection failed');
			(db as any).delete.mockReturnValue(db);
			(db as any).where.mockRejectedValue(error);

			await expect(deleteSession('session-id')).rejects.toThrow('Database connection failed');
		});

		it('should handle bcrypt errors in hashPassword', async () => {
			const mockHash = vi.fn().mockRejectedValue(new Error('Hashing failed'));
			bcrypt.hash = mockHash;

			await expect(hashPassword('password')).rejects.toThrow('Hashing failed');
		});

		it('should handle bcrypt errors in comparePassword', async () => {
			const mockCompare = vi.fn().mockRejectedValue(new Error('Comparison failed'));
			bcrypt.compare = mockCompare;

			await expect(comparePassword('password', 'hash')).rejects.toThrow('Comparison failed');
		});
	});
});