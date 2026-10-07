import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, onSnapshot, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (process?.env || {});

// Support environment variables from GitHub Actions / Vite with fallback to rawConfig
const activeConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || rawConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || rawConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || rawConfig.firestoreDatabaseId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId,
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(activeConfig);

// Initialize Firestore Database with explicit Database ID
export const db = getFirestore(app, activeConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
