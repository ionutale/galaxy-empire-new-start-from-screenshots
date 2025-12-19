import webpush from 'web-push';
import { VAPID_PUBLIC_KEY } from '$lib/game-config';

const VAPID_PRIVATE_KEY = 'seBiMzBJ5tet6GyPfCGm5v2Isgeuda4BIouAAjjwURc';

webpush.setVapidDetails(
    'mailto:admin@galaxyempire.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

export { webpush };
