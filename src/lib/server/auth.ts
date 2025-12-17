import bcrypt from 'bcryptjs';
import { pool } from './db';
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
    
    await pool.query(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
        [sessionId, userId, expiresAt]
    );
    
    return sessionId;
};

export const getSession = async (sessionId: string) => {
    const result = await pool.query(
        `SELECT s.*, u.username, u.dark_matter, u.id as user_id 
         FROM sessions s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.id = $1 AND s.expires_at > NOW()`,
        [sessionId]
    );
    
    return result.rows[0];
};

export const deleteSession = async (sessionId: string) => {
    await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
};
