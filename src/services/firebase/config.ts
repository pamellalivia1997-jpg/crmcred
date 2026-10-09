/**
 * Firebase Configuration for Lívia Cred Saúde CRM (liviacred-ead6d)
 * Reads environment variables if available; falls back to official production Firebase credentials.
 */

export const OFFICIAL_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCbmsentbF3Wz9CMXHFbd7t3c0AnUAQx14',
  authDomain: 'liviacred-ead6d.firebaseapp.com',
  projectId: 'liviacred-ead6d',
  storageBucket: 'liviacred-ead6d.firebasestorage.app',
  messagingSenderId: '989478052403',
  appId: '1:989478052403:web:1d6dd84cac6c0718b27946',
};

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || OFFICIAL_FIREBASE_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || OFFICIAL_FIREBASE_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || OFFICIAL_FIREBASE_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || OFFICIAL_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || OFFICIAL_FIREBASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || OFFICIAL_FIREBASE_CONFIG.appId,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);
