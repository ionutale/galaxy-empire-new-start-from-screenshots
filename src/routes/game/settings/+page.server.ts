import { pool } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import { hashPassword, comparePassword, deleteSession } from '$lib/server/auth';
import { webpush, admin } from '$lib/server/push-config';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');

    const userRes = await pool.query(
        'SELECT email, avatar_id FROM users WHERE id = $1',
        [locals.user.id]
    );

    return {
        profile: userRes.rows[0]
    };
};

export const actions = {
    updateProfile: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const data = await request.formData();
        const email = data.get('email') as string;
        const avatarId = Number(data.get('avatar_id'));

        if (!email) return fail(400, { error: 'Email is required' });

        try {
            await pool.query(
                'UPDATE users SET email = $1, avatar_id = $2 WHERE id = $3',
                [email, avatarId, locals.user.id]
            );
        } catch (e) {
            return fail(500, { error: 'Database error' });
        }

        return { success: true, message: 'Profile updated' };
    },

    changePassword: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const data = await request.formData();
        const currentPassword = data.get('current_password') as string;
        const newPassword = data.get('new_password') as string;
        const confirmPassword = data.get('confirm_password') as string;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return fail(400, { error: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return fail(400, { error: 'New passwords do not match' });
        }

        // Verify current password
        const userRes = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [locals.user.id]
        );
        const user = userRes.rows[0];

        const valid = await comparePassword(currentPassword, user.password_hash);
        if (!valid) {
            return fail(400, { error: 'Incorrect current password' });
        }

        // Hash new password
        const newHash = await hashPassword(newPassword);

        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newHash, locals.user.id]
        );

        return { success: true, message: 'Password changed successfully' };
    },

    testPush: async ({ locals }) => {
        if (!locals.user) return fail(401);

        try {
            const subs = await pool.query(
                'SELECT * FROM push_subscriptions WHERE user_id = $1',
                [locals.user.id]
            );

            if (subs.rows.length === 0) {
                return fail(400, { error: 'No push subscriptions found. Please enable notifications in your browser.' });
            }

            let successCount = 0;
            for (const sub of subs.rows) {
                // Check if it's a Firebase token (simple string) or Web Push subscription (URL)
                const isFirebase = !sub.endpoint.startsWith('http');

                try {
                    if (isFirebase) {
                        if (admin.apps.length > 0) {
                            await admin.messaging().send({
                                token: sub.endpoint,
                                notification: {
                                    title: 'Test Notification',
                                    body: 'This is a test notification from Galaxy Empire!',
                                },
                                webpush: {
                                    notification: {
                                        icon: '/icons/icon_web_PWA192_192x192.png'
                                    }
                                }
                            });
                        } else {
                            console.warn('Firebase Admin not initialized. Skipping Firebase notification.');
                            continue;
                        }
                    } else {
                        const pushSubscription = {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth
                            }
                        };
                        await webpush.sendNotification(pushSubscription, JSON.stringify({
                            title: 'Test Notification',
                            body: 'This is a test notification from Galaxy Empire!',
                            icon: '/icons/icon_web_PWA192_192x192.png'
                        }));
                    }
                    successCount++;
                } catch (err: any) {
                    if (err.code === 'messaging/registration-token-not-registered' || err.statusCode === 410) {
                        console.log(`Push subscription expired for endpoint ${sub.endpoint.slice(0, 20)}... Removing.`);
                        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
                    } else {
                        console.error('Error sending test push:', err);
                    }
                }
            }

            if (successCount === 0) {
                 return fail(500, { error: 'Failed to send notifications. Check server logs.' });
            }

            return { success: true, message: `Sent test notification to ${successCount} device(s).` };

        } catch (e) {
            console.error('Error in testPush:', e);
            return fail(500, { error: 'Database error' });
        }
    },

    logout: async ({ cookies, locals }) => {
        const sessionId = cookies.get('session_id');
        if (sessionId) {
            await deleteSession(sessionId);
            cookies.delete('session_id', { path: '/' });
        }
        throw redirect(302, '/login');
    }
} satisfies Actions;
