import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, onSnapshot, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
// Credenciais oficiais e definitivas do projeto Firebase da Lívia Cred Saúde (liviacred-ead6d)
export const OFFICIAL_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCbmsentbF3Wz9CMXHFbd7t3c0AnUAQx14',
  authDomain: 'liviacred-ead6d.firebaseapp.com',
  projectId: 'liviacred-ead6d',
  storageBucket: 'liviacred-ead6d.firebasestorage.app',
  messagingSenderId: '989478052403',
  appId: '1:989478052403:web:1d6dd84cac6c0718b27946',
};

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ((typeof process !== 'undefined' && process?.env) || {});

// Leitura prioritária via GitHub Secrets / import.meta.env com fallback direto e oficial para liviacred-ead6d
export const activeConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || OFFICIAL_FIREBASE_CONFIG.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || OFFICIAL_FIREBASE_CONFIG.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || OFFICIAL_FIREBASE_CONFIG.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || OFFICIAL_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || OFFICIAL_FIREBASE_CONFIG.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || OFFICIAL_FIREBASE_CONFIG.appId,
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(activeConfig);

// Initialize Firestore Database (liviacred-ead6d)
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Connection Test
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log('🔥 Conexão com Firebase Firestore estabelecida com sucesso!');
    return true;
  } catch (error: any) {
    if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota exceeded')) {
      console.warn('🔥 Limite diário de cota do Firestore atingido. O CRM continuará operando com armazenamento local seguro.');
    } else {
      console.warn('🔥 Firestore operando offline ou inicializando:', error);
    }
    return false;
  }
}

// Error Handler helper required by Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const err = error as any;
  const errMsg = error instanceof Error ? error.message : String(error);
  if (err?.code === 'resource-exhausted' || errMsg.includes('Quota exceeded')) {
    console.warn(`[Firestore Cota Diária Atingida] Operação em ${path || 'raiz'} operando em modo offline local.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}
