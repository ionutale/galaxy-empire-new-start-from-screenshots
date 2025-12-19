
import webpush from 'web-push';

const publicKey = 'BIocI3X7HR9tTU3yvBvYxtXDvbKUCDSP19AXWYC-6DfN-mRdqcCGZIr54zs9eagRtlvzq8MdPpBP8qNMPlva1G4';
const privateKey = 'seBiMzBJ5tet6GyPfCGm5v2Isgeuda4BIouAAjjwURc';

try {
    webpush.setVapidDetails(
        'mailto:admin@galaxyempire.com',
        publicKey,
        privateKey
    );
    console.log('VAPID keys are valid and match.');
} catch (e) {
    console.error('VAPID keys are invalid or do not match:', e.message);
}
