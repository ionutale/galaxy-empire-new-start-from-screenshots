// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, type Messaging } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDmKrv3-pOLUMeVKXJkpg6IEN0AOQXQ--s",
  authDomain: "playground-428410.firebaseapp.com",
  projectId: "playground-428410",
  storageBucket: "playground-428410.firebasestorage.app",
  messagingSenderId: "277290577442",
  appId: "1:277290577442:web:829f43da4ba71ac8f9247b",
  measurementId: "G-0B04P6NW6J"
};

// Initialize Firebase
let app: FirebaseApp;
let messaging: Messaging | undefined;

if (typeof window !== 'undefined') {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const analytics = getAnalytics(app);
    try {
        messaging = getMessaging(app);
    } catch (e) {
        console.warn('Firebase Messaging not supported in this environment:', e);
    }
}

export { app, messaging, firebaseConfig };