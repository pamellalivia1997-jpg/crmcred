export const firebaseConfig = {
  apiKey: 'AIzaSyCbmsentbF3Wz9CMXHFbd7t3c0AnUAQx14',
  authDomain: 'liviacred-ead6d.firebaseapp.com',
  projectId: 'liviacred-ead6d',
  storageBucket: 'liviacred-ead6d.firebasestorage.app',
  messagingSenderId: '989478052403',
  appId: '1:989478052403:web:1d6dd84cac6c0718b27946'
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY'
);
