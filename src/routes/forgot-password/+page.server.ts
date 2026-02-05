import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, passwordResets } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';

// Actions have been moved to /api/auth/forgot-password
