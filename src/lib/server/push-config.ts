import webpush from 'web-push';
import { VAPID_PUBLIC_KEY } from '$lib/game-config';
import admin from 'firebase-admin';
import { env } from '$env/dynamic/private';

// Initialize Firebase Admin
// You need to set FIREBASE_SERVICE_ACCOUNT in your .env file
// It should be the JSON content of your service account key
if (!admin.apps.length) {
    try {
        if (env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('Firebase Admin initialized');
        } else {
            console.warn('FIREBASE_SERVICE_ACCOUNT not found in env. Push notifications via Firebase will fail.');
        }
    } catch (e) {
        console.error('Failed to initialize Firebase Admin:', e);
    }
}

const VAPID_PRIVATE_KEY = 'seBiMzBJ5tet6GyPfCGm5v2Isgeuda4BIouAAjjwURc';

webpush.setVapidDetails(
    'mailto:admin@galaxyempire.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

export { webpush, admin };
