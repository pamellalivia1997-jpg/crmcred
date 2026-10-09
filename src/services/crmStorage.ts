import {
  Cliente,
  Proposta,
  ComissaoPromotora,
  ContaPagar,
  MetaVendedora,
  Feedback,
  AlertaOportunidade,
  AuditLog,
  User,
  StatusProposta,
  Convenio,
  Operacao,
  Banco,
  Promotora
} from '../types';
import { generateSeedData, INITIAL_USERS } from '../data/mockSeed';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection, getDocs, writeBatch } from 'firebase/firestore';
import { normalizeSellerName, getLocalDateString } from '../utils/formatters';
import { firebaseUsageTracker } from './firebaseUsageTracker';

const STORAGE_KEY = 'livia_credsaude_crm_data_v1';

export interface CRMDataStore {
  users: User[];
  clientes: Cliente[];
  propostas: Proposta[];
  comissoesPromotoras: ComissaoPromotora[];
  contasPagar: ContaPagar[];
  metas: MetaVendedora[];
  feedbacks: Feedback[];
  alertas: AlertaOportunidade[];
  auditLogs: AuditLog[];
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn());
}

export function subscribeToData(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Sanitize store to ensure brand naming compliance and preserve all official team members
function sanitizeStore(store: CRMDataStore): { sanitized: CRMDataStore; modified: boolean } {
  let modified = false;

  if (!Array.isArray(store.users) || store.users.length === 0) {
    store.users = INITIAL_USERS;
    modified = true;
  } else {
    // 1. Remove test users (e.g. user-carlos)
    const beforeCount = store.users.length;
    store.users = store.users.filter(u => 
      u.id !== 'user-carlos' &&
      !u.name.toLowerCase().includes('carlos eduardo') &&
      u.email.toLowerCase() !== 'financeiro@liviacredsaude.com.br'
    );
    if (store.users.length !== beforeCount) {
      modified = true;
    }

    // 2. Remove legacy duplicate mock IDs if real Firebase Auth accounts exist
    const hasRealGeovanne = store.users.some(u => u.id === 'Vq7wUkG7ltcanJjJmnEqYZOiiym1' || u.email.toLowerCase() === 'geovanne.arcelino@gmail.com');
    const hasRealPamella = store.users.some(u => u.id === 'eRkG9KNI8AZMCtQGkrPAPc7g8PC3' || u.email.toLowerCase() === 'pamellalivia1997@gmail.com');

    if (hasRealGeovanne) {
      const filtered = store.users.filter(u => u.id !== 'user-geovanne');
      if (filtered.length !== store.users.length) {
        store.users = filtered;
        modified = true;
      }
    } else {
      // Migrate user-geovanne to official Geovanne
      const gIndex = store.users.findIndex(u => u.id === 'user-geovanne');
      if (gIndex >= 0) {
        store.users[gIndex] = {
          ...store.users[gIndex],
          id: 'Vq7wUkG7ltcanJjJmnEqYZOiiym1',
          name: 'Geovanne Ferreira',
          email: 'geovanne.arcelino@gmail.com',
          password: '123123',
          role: 'financeiro'
        };
        modified = true;
      }
    }

    if (hasRealPamella) {
      const filtered = store.users.filter(u => u.id !== 'user-pamella');
      if (filtered.length !== store.users.length) {
        store.users = filtered;
        modified = true;
      }
    } else {
      // Migrate user-pamella to official Pamella
      const pIndex = store.users.findIndex(u => u.id === 'user-pamella');
      if (pIndex >= 0) {
        store.users[pIndex] = {
          ...store.users[pIndex],
          id: 'eRkG9KNI8AZMCtQGkrPAPc7g8PC3',
          name: 'Pamella',
          email: 'pamellalivia1997@gmail.com',
          password: '123',
          role: 'adm'
        };
        modified = true;
      }
    }

    // Deduplicate users by email or ID
    const seenEmails = new Set<string>();
    const seenIds = new Set<string>();
    const deduped: User[] = [];

    store.users.forEach(u => {
      const normEmail = (u.email || '').trim().toLowerCase();
      const normId = (u.id || '').trim();
      if (!normEmail || seenEmails.has(normEmail) || seenIds.has(normId)) {
        modified = true;
        return;
      }
      seenEmails.add(normEmail);
      seenIds.add(normId);

      // Clean legacy baseSalaryCost
      if ('baseSalaryCost' in (u as any)) {
        delete (u as any).baseSalaryCost;
        modified = true;
      }
      deduped.push(u);
    });

    store.users = deduped;
  }

  store.users = store.users.map(u => {
    const original = u.name;
    let name = original;
    if (/L[íi]via\s+Cristina/i.test(name) || /L[íi]via\s*\(propriet[áa]ria\)/i.test(name)) {
      name = 'Lívia';
    }
    if (/Pamella\s+L[íi]via/i.test(name)) {
      name = 'Pamella';
    }
    if (name !== original) {
      modified = true;
    }
    if (u.id === 'user-bianca' && (!u.salesName || u.salesName === 'Bianca')) {
      u.salesName = 'Loja Igarassu';
      modified = true;
    }
    return { ...u, name };
  });

  if (Array.isArray(store.propostas)) {
    // 2. Propostas validation: preserva rigorosamente todos os registros válidos sem perdas por contrato
    const seenIds = new Set<string>();
    const dedupedPropostas: Proposta[] = [];

    store.propostas.forEach(p => {
      if (!p || !p.id) return;
      if (seenIds.has(p.id)) {
        modified = true;
        return;
      }
      seenIds.add(p.id);

      if (p.dataDigitacao) {
        p.dataDigitacao = p.dataDigitacao.substring(0, 10);
      }
      if (p.vendedora && /Pamella\s+L[íi]via/i.test(p.vendedora)) {
        p.vendedora = 'Pamella';
        modified = true;
      }
      if (p.digitador && /Pamella\s+L[íi]via/i.test(p.digitador)) {
        p.digitador = 'Pamella';
        modified = true;
      }

      dedupedPropostas.push(p);
    });

    store.propostas = dedupedPropostas;
  }

  // Ensure feedbacks list starts empty per business rules (clean pre-seeded/mock feedbacks) and one-time clear of saved ones
  const hasWipedFeedbacks = typeof localStorage !== 'undefined' && localStorage.getItem('lviacred_feedbacks_wiped_v2');
  if (!Array.isArray(store.feedbacks) || !hasWipedFeedbacks) {
    store.feedbacks = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lviacred_feedbacks_wiped_v2', 'true');
    }
    modified = true;
  }

  // Ensure comissoesPromotoras is initialized as an array without clearing existing data
  if (!Array.isArray(store.comissoesPromotoras)) {
    store.comissoesPromotoras = [];
    modified = true;
  }

  // Purge legacy mock/ghost clients and proposals if present in user local storage
  const hasWipedGhostDemo = typeof localStorage !== 'undefined' && localStorage.getItem('lviacred_ghost_demo_wiped_v1');
  if (!hasWipedGhostDemo) {
    if (Array.isArray(store.clientes)) {
      store.clientes.forEach(c => {
        if (c.dataNascimento === '1975-01-01' || c.dataNascimento === '01/01/1975') {
          c.dataNascimento = '';
          modified = true;
        }
        if (c.observacoes && c.observacoes.includes('Cliente importado via planilha')) {
          c.observacoes = '';
          modified = true;
        }
      });
    }
    if (Array.isArray(store.propostas)) {
      store.propostas = store.propostas.filter(p => 
        !p.observacoes?.includes('Proposta gerada no sistema. Convênio')
      );
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lviacred_ghost_demo_wiped_v1', 'true');
    }
    modified = true;
  }

  return { sanitized: store, modified };
}

// Load store from LocalStorage fallback safely without ever clearing database
function loadStore(): CRMDataStore {
  // Clean up legacy wipe keys to ensure persistent data is never wiped
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('lviacred_funil_cleared_v1');
    localStorage.removeItem('lviacred_tudo_zerado_v1');
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { sanitized } = sanitizeStore(parsed);
      saveLocalStore(sanitized);
      return sanitized;
    }
  } catch (e) {
    console.error('Erro ao ler LocalStorage:', e);
  }

  const seed = generateSeedData();
  saveLocalStore(seed);
  return seed;
}

function saveLocalStore(data: CRMDataStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    notify();
  } catch (e) {
    console.error('Erro ao salvar no LocalStorage:', e);
  }
}

// Global store singleton in memory
let currentStore: CRMDataStore = loadStore();

// Firestore Sync Helpers with payload cleaning to save cloud bandwidth and quota
function cleanPayloadForFirestore(data: any): any {
  if (data === null || data === undefined) return null;
  const json = JSON.parse(JSON.stringify(data));
  const clean = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(clean);
    if (obj !== null && typeof obj === 'object') {
      return Object.entries(obj).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          acc[k] = clean(v);
        } else if (v === 0 || v === false) {
          acc[k] = v;
        }
        return acc;
      }, {} as any);
    }
    return obj;
  };
  return clean(json);
}

let quotaExceededState = false;
let activeUnsubscribes: Array<() => void> = [];

export function isFirestoreQuotaExceeded(): boolean {
  return (
    quotaExceededState ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('crm_firestore_quota_exceeded') === 'true')
  );
}

export function setFirestoreQuotaExceeded() {
  if (quotaExceededState) return;
  quotaExceededState = true;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('crm_firestore_quota_exceeded', 'true');
  }
  // Immediately unsubscribe all active listeners to stop retry storms and backend backoff delays
  activeUnsubscribes.forEach(unsub => {
    try {
      unsub();
    } catch (_) {}
  });
  activeUnsubscribes = [];
  console.warn('⚡ [Firestore] Cota diária do plano gratuito atingida. Sincronização remota pausada para evitar sobrecarga. Os dados continuam operando normalmente via armazenamento local.');
}

async function syncItemToFirestore(collectionName: string, id: string, data: any) {
  if (isFirestoreQuotaExceeded()) return;
  try {
    const docRef = doc(db, collectionName, id);
    const cleaned = cleanPayloadForFirestore(data);
    await setDoc(docRef, cleaned, { merge: true });
    firebaseUsageTracker.trackWrite(1);
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded')) {
      setFirestoreQuotaExceeded();
    } else {
      console.warn(`Firestore sync warning on ${collectionName}/${id}:`, err);
    }
  }
}

async function syncBatchToFirestore(collectionName: string, items: any[]) {
  if (!items || items.length === 0 || isFirestoreQuotaExceeded()) return;
  try {
    const batch = writeBatch(db);
    // Limit to 400 operations per batch for Firestore safety
    const chunk = items.slice(0, 400);
    chunk.forEach(item => {
      if (item && item.id) {
        const ref = doc(db, collectionName, item.id);
        batch.set(ref, cleanPayloadForFirestore(item), { merge: true });
      }
    });
    await batch.commit();
    firebaseUsageTracker.trackWrite(chunk.length);
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded')) {
      setFirestoreQuotaExceeded();
    } else {
      console.warn(`Firestore batch sync warning on ${collectionName}:`, err);
    }
  }
}

async function deleteItemFromFirestore(collectionName: string, id: string) {
  if (isFirestoreQuotaExceeded()) return;
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    firebaseUsageTracker.trackDelete(1);
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded')) {
      setFirestoreQuotaExceeded();
    } else {
      console.warn(`Firestore delete warning on ${collectionName}/${id}:`, err);
    }
  }
}

const suppressSnapshotCollections = new Set<string>();

// Listen to Firestore real-time snapshots with smart cache reconciliation
export function initFirestoreRealtimeSync() {
  console.log('🔄 Iniciando sincronização Firestore...');
  const quotaExceeded = isFirestoreQuotaExceeded();
  console.log('Quota exceeded check:', quotaExceeded);
  if (quotaExceeded) {
    console.info('ℹ️ Modo Offline Local ativo: cota diária do Firestore atingida anteriormente. O CRM permanece 100% funcional localmente.');
    return;
  }

  // Force reset if accidentally marked in session storage (for development/demo purposes)
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('crm_firestore_quota_exceeded');
  }
  
  const collectionsToSync: Array<keyof CRMDataStore> = [
    'users',
    'clientes',
    'propostas',
    'comissoesPromotoras',
    'contasPagar',
    'metas',
    'feedbacks',
    'alertas',
    'auditLogs'
  ];

  collectionsToSync.forEach((coll) => {
    try {
      const collRef = collection(db, coll);
      const unsub = onSnapshot(
        collRef,
        (snapshot) => {
          firebaseUsageTracker.trackRead(snapshot.docs.length || 1);
          if (suppressSnapshotCollections.has(coll)) {
            return;
          }

          if (snapshot.empty) {
            // NEVER clear local store data if remote snapshot is empty
            const currentList = (currentStore as any)[coll];
            if (!Array.isArray(currentList) || currentList.length === 0) {
              (currentStore as any)[coll] = [];
              saveLocalStore(currentStore);
              notify();
            }
          } else {
            const incomingMap = new Map<string, any>();
            snapshot.forEach((docSnap) => {
              incomingMap.set(docSnap.id, { ...docSnap.data(), id: docSnap.id });
            });

            // Incremental Smart Merge: preserve local store cache and update matching docs
            const currentList: any[] = Array.isArray((currentStore as any)[coll]) ? (currentStore as any)[coll] : [];
            const mergedMap = new Map<string, any>();
            currentList.forEach(item => {
              if (item && item.id) mergedMap.set(item.id, item);
            });
            incomingMap.forEach((val, id) => {
              mergedMap.set(id, { ...(mergedMap.get(id) || {}), ...val });
            });

            (currentStore as any)[coll] = Array.from(mergedMap.values());
            
            // Always sanitize store on any realtime snapshot update (proposals, users, etc.)
            const { sanitized } = sanitizeStore(currentStore);
            currentStore = sanitized;

            saveLocalStore(currentStore);
            notify();
          }
        },
        (error: any) => {
          if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota exceeded')) {
            setFirestoreQuotaExceeded();
          } else {
            handleFirestoreError(error, OperationType.GET, coll);
          }
        }
      );
      activeUnsubscribes.push(unsub);
    } catch (e: any) {
      if (e?.code === 'resource-exhausted' || e?.message?.includes('Quota exceeded')) {
        setFirestoreQuotaExceeded();
      } else {
        console.warn(`Erro ao registrar listener onSnapshot para ${coll}:`, e);
      }
    }
  });
}

// Start listeners lazily after initial render to avoid blocking first paint
setTimeout(() => {
  initFirestoreRealtimeSync();
}, 600);

// Helper: Standardize and auto-correct CPF (padding leading zeros if missing, cleaning extra characters)
export function standardizeCPF(rawCpf: string): { cleanCpf: string; formattedCpf: string; wasCorrected: boolean } {
  if (!rawCpf) return { cleanCpf: '00000000000', formattedCpf: '000.000.000-00', wasCorrected: false };
  let digits = String(rawCpf).replace(/\D/g, '');
  let wasCorrected = false;

  // Pad missing leading zeros if shorter than 11 digits (e.g. 74127859 -> 00074127859)
  if (digits.length > 0 && digits.length < 11) {
    digits = digits.padStart(11, '0');
    wasCorrected = true;
  } else if (digits.length > 11) {
    digits = digits.slice(0, 11);
    wasCorrected = true;
  } else if (digits.length === 0) {
    digits = '00000000000';
  }

  const formattedCpf = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  return { cleanCpf: digits, formattedCpf, wasCorrected };
}

// Helper: Parse Brazilian currency formats (e.g., "2.957,02" -> 2957.02, "2.000" -> 2000, "289,5" -> 289.5)
export function parseBrazilianCurrency(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let s = String(val).trim().replace('R$', '').replace(/\s/g, '').trim();
  if (!s || s === '-' || s === '0') return 0;

  // Case 1: Both dots and comma (e.g., "1.349,50" or "10.000,00")
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  // Case 2: Only comma (e.g., "289,5" or "1349,50" or "0,00")
  else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  // Case 3: Only dot (e.g., "2.000", "1.000", "3.850", "10.500" - Brazilian thousand dot without comma)
  else if (s.includes('.')) {
    const parts = s.split('.');
    // If it's like 2.000 or 10.500 (3 digits after dot, or multiple dots like 1.000.000)
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/\./g, '');
    }
  }

  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

// Helper: Parse Brazilian date formats (e.g., "12/03/2026 18:04:11" -> "2026-03-12", or Excel serial)
export function parseBrazilianDate(dateStr: any): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (!str || str === '0' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return '';

  // Check if it's an Excel numeric serial date (e.g., 45378 for 2024-03-24)
  if (/^\d{5}$/.test(str)) {
    const excelDate = new Date((Number(str) - 25569) * 86400 * 1000);
    if (!isNaN(excelDate.getTime())) {
      return excelDate.toISOString().split('T')[0];
    }
  }

  const s = str.split(' ')[0].replace(/\./g, '/').replace(/-/g, '/');
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else {
        // DD/MM/YYYY
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = `20${year}`;
        return `${year}-${month}-${day}`;
      }
    }
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  return '';
}

export interface SpreadsheetRowInput {
  carimboDataHora?: string;
  cpf: string;
  nomeCliente: string;
  telefone?: string;
  dataDigitacao?: string;
  dataPagamentoCliente?: string;
  convenio?: string;
  operacao?: string;
  banco?: string;
  promotora?: string;
  valorEmprestimo?: number | string;
  valorTaxa?: number | string;
  clientePagou?: boolean | string;
  percentualTaxa?: number | string;
  vendedora?: string;
  digitador?: string;
  numeroContrato?: string;
  status?: string;
  comissaoJ2?: number | string;
  comissaoSempre?: number | string;
  comissaoDG?: number | string;
  comissaoGFT?: number | string;
  faturado?: number | string;
  linkDocumento?: string;
}

export const crmStorage = {
  getStore(): CRMDataStore {
    return { ...currentStore };
  },

  reset(): void {
    this.clearAllTestData();
  },

  // Zerar somente dados operacionais; usuários, autorizações e metas são preservados.
  async clearAllTestData(): Promise<void> {
    const collectionsToClear = ['clientes', 'propostas', 'comissoesPromotoras', 'contasPagar', 'alertas', 'feedbacks', 'auditLogs'] as const;
    collectionsToClear.forEach(c => suppressSnapshotCollections.add(c));

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lviacred_funil_cleared_v1', 'true');
      localStorage.setItem('lviacred_controladoria_cleared_v1', 'true');
      localStorage.setItem('lviacred_tudo_zerado_v1', 'true');
    }

    currentStore = {
      ...currentStore,
      clientes: [],
      propostas: [],
      comissoesPromotoras: [],
      contasPagar: [],
      alertas: [],
      feedbacks: [],
      auditLogs: []
    };
    saveLocalStore(currentStore);
    notify();

    if (!isFirestoreQuotaExceeded()) {
      try {
        for (const collName of collectionsToClear) {
          for (;;) {
            const querySnap = await getDocs(collection(db, collName));
            if (querySnap.empty) break;
            for (let i = 0; i < querySnap.docs.length; i += 400) {
              const batch = writeBatch(db);
              querySnap.docs.slice(i, i + 400).forEach(docSnap => batch.delete(docSnap.ref));
              await batch.commit();
            }
          }
        }
      } catch (e: any) {
        if (e?.code === 'resource-exhausted' || e?.message?.includes('Quota exceeded')) {
          setFirestoreQuotaExceeded();
        } else {
          console.warn('Erro ao limpar coleções remotas do Firestore:', e);
        }
      } finally {
        setTimeout(() => {
          collectionsToClear.forEach(c => suppressSnapshotCollections.delete(c));
        }, 3000);
      }
    } else {
      setTimeout(() => {
        collectionsToClear.forEach(c => suppressSnapshotCollections.delete(c));
      }, 1000);
    }
    notify();
  },

  async clearFunilData(): Promise<void> {
    suppressSnapshotCollections.add('propostas');
    suppressSnapshotCollections.add('clientes');

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lviacred_funil_cleared_v1', 'true');
    }
    currentStore = {
      ...currentStore,
      propostas: [],
      clientes: []
    };
    saveLocalStore(currentStore);
    notify();

    if (!isFirestoreQuotaExceeded()) {
      try {
        for (const collName of ['propostas', 'clientes'] as const) {
          for (;;) {
            const snap = await getDocs(collection(db, collName));
            if (snap.empty) break;
            for (let i = 0; i < snap.docs.length; i += 400) {
              const batch = writeBatch(db);
              snap.docs.slice(i, i + 400).forEach(docSnap => batch.delete(docSnap.ref));
              await batch.commit();
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao limpar propostas e clientes do Firestore:', e);
      } finally {
        setTimeout(() => {
          suppressSnapshotCollections.delete('propostas');
          suppressSnapshotCollections.delete('clientes');
        }, 3000);
      }
    } else {
      setTimeout(() => {
        suppressSnapshotCollections.delete('propostas');
        suppressSnapshotCollections.delete('clientes');
      }, 1000);
    }
    notify();
  },

  async clearControladoriaData(): Promise<void> {
    suppressSnapshotCollections.add('comissoesPromotoras');

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lviacred_controladoria_cleared_v1', 'true');
    }
    currentStore = {
      ...currentStore,
      comissoesPromotoras: []
    };
    saveLocalStore(currentStore);
    notify();

    if (!isFirestoreQuotaExceeded()) {
      try {
        for (;;) {
          const snap = await getDocs(collection(db, 'comissoesPromotoras'));
          if (snap.empty) break;
          for (let i = 0; i < snap.docs.length; i += 400) {
            const batch = writeBatch(db);
            snap.docs.slice(i, i + 400).forEach(docSnap => batch.delete(docSnap.ref));
            await batch.commit();
          }
        }
      } catch (e) {
        console.warn('Erro ao limpar comissoesPromotoras do Firestore:', e);
      } finally {
        setTimeout(() => {
          suppressSnapshotCollections.delete('comissoesPromotoras');
        }, 3000);
      }
    } else {
      setTimeout(() => {
        suppressSnapshotCollections.delete('comissoesPromotoras');
      }, 1000);
    }
    notify();
  },

  async purgeMockData(): Promise<string[]> {
    const deletedIds: string[] = [];
    currentStore.propostas = currentStore.propostas.filter(p => {
      if (p.id && (p.id.startsWith('prop-sep26-') || p.id.startsWith('mock-') || p.id.startsWith('seed-'))) {
        deletedIds.push(p.id);
        return false;
      }
      return true;
    });
    saveLocalStore(currentStore);

    for (const id of deletedIds) {
      try {
        await deleteDoc(doc(db, 'propostas', id));
      } catch (e) {
        // ignore
      }
    }
    return deletedIds;
  },

  // Restaurar store completo a partir de arquivo de backup JSON
  restoreStore(data: Partial<CRMDataStore>): void {
    if (!data) return;
    const merged: CRMDataStore = {
      ...currentStore,
      ...data,
      users: data.users && data.users.length > 0 ? data.users : currentStore.users
    };
    const { sanitized } = sanitizeStore(merged);
    currentStore = sanitized;
    saveLocalStore(currentStore);
  },

  // Importar Carteira de Clientes em Lote
  importClientPortfolio(clientesList: Cliente[], actor: { id: string; name: string }): { importedCount: number; updatedCount: number } {
    let importedCount = 0;
    let updatedCount = 0;

    clientesList.forEach((cli) => {
      const cleanCpf = cli.cpf.replace(/\D/g, '');
      if (cleanCpf.length !== 11) return;

      const formattedClient: Cliente = {
        ...cli,
        id: cleanCpf,
        cpf: cleanCpf,
        nome: cli.nome.trim(),
        dataNascimento: (cli.dataNascimento && cli.dataNascimento !== '1975-01-01') ? cli.dataNascimento : '',
        telefone: cli.telefone || '(81) 98000-0000',
        email: cli.email || `${cleanCpf}@cliente.com`,
        cidade: cli.cidade || 'Igarassu',
        convenioPrincipal: cli.convenioPrincipal || 'INSS',
        observacoes: cli.observacoes || 'Importado para a carteira de clientes.',
        vendedoraResponsavel: cli.vendedoraResponsavel || actor.name || 'Hellen Vasconcelos',
        dataCriacao: cli.dataCriacao || getLocalDateString()
      };

      const existingIndex = currentStore.clientes.findIndex(c => c.cpf.replace(/\D/g, '') === cleanCpf);
      if (existingIndex < 0) {
        currentStore.clientes.unshift(formattedClient);
        importedCount++;
      } else {
        currentStore.clientes[existingIndex] = formattedClient;
        updatedCount++;
      }
    });

    // Batch sync all imported clients to Firestore cloud in chunks of 400
    syncBatchToFirestore('clientes', currentStore.clientes);

    this.logAudit({
      usuarioId: actor.id,
      usuarioNome: actor.name,
      acao: 'criou',
      tipoRecurso: 'cliente',
      idRecurso: 'batch-import',
      detalhes: `Importou carteira de clientes em lote: ${importedCount} novos cadastros, ${updatedCount} atualizados.`
    });

    saveLocalStore(currentStore);
    return { importedCount, updatedCount };
  },

  // Importar Planilha Completa de Vendas/Propostas com Múltiplas Linhas por Cliente
  importFullSpreadsheetRows(
    rows: SpreadsheetRowInput[],
    actor: { id: string; name: string }
  ): {
    totalRows: number;
    clientsCreated: number;
    clientsUpdated: number;
    proposalsCreated: number;
    commissionsCreated: number;
    cpfsCorrectedCount: number;
  } {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('lviacred_funil_cleared_v1');
      localStorage.removeItem('lviacred_controladoria_cleared_v1');
    }

    let clientsCreated = 0;
    let clientsUpdated = 0;
    let proposalsCreated = 0;
    let commissionsCreated = 0;
    let cpfsCorrectedCount = 0;

    // Buffer write operations for chunked Firestore batching (prevents 500 writes limit per batch for 2k+ rows)
    const writeOperations: { ref: any; data: any }[] = [];

    rows.forEach((row, index) => {
      let rawNome = row.nomeCliente ? String(row.nomeCliente).replace(/^[\"\'\t\r\n\s]+|[\"\'\t\r\n\s]+$/g, '').trim() : '';
      const rawContract = row.numeroContrato ? String(row.numeroContrato).trim() : '';
      const cleanContract = rawContract || '0';

      // 1. CPF Auto-Correction & Standardization
      const { cleanCpf, formattedCpf, wasCorrected } = standardizeCPF(row.cpf);
      if (wasCorrected) cpfsCorrectedCount++;

      // Fallback for name if empty or generic:
      if (!rawNome) {
        if (cleanContract && cleanContract !== '0' && cleanContract !== '-') {
          rawNome = `Contrato #${cleanContract}`;
        } else if (cleanCpf && cleanCpf !== '00000000000') {
          rawNome = `Cliente (${cleanCpf})`;
        } else {
          rawNome = `Cliente Sem Nome (Linha ${index + 1})`;
        }
      }

      // 2. Parsed values
      const parsedEmp = parseBrazilianCurrency(row.valorEmprestimo);
      const parsedTaxa = parseBrazilianCurrency(row.valorTaxa);
      const parsedPercentTaxa = parseBrazilianCurrency(row.percentualTaxa);
      const dateDigitacao = parseBrazilianDate(row.dataDigitacao) || getLocalDateString();
      // Preserva a célula vazia da planilha: data de pagamento não é inferida.
      const datePagamento = parseBrazilianDate(row.dataPagamentoCliente);

      // Skip row if it has no financial value, no date, and no contract (completely blank line)
      if (parsedEmp <= 0 && parsedTaxa <= 0 && (!cleanContract || cleanContract === '0') && !row.cpf) {
        return;
      }

      const rawSeller = row.vendedora && row.vendedora.trim() && row.vendedora !== '0' ? row.vendedora.trim() : actor.name || 'Hellen Vasconcelos';
      const sellerName = normalizeSellerName(rawSeller);
      const rawDigitador = row.digitador && row.digitador.trim() && row.digitador !== '0' ? row.digitador.trim() : sellerName;
      const digitadorName = normalizeSellerName(rawDigitador);

      // 3. Find or Create/Update Client (robust against empty or zero CPFs)
      const isValidCpf = cleanCpf && cleanCpf.length === 11 && cleanCpf !== '00000000000' && !cleanCpf.startsWith('000000');
      let existingClientIdx = -1;
      if (isValidCpf) {
        existingClientIdx = currentStore.clientes.findIndex(c => c.cpf.replace(/\D/g, '') === cleanCpf);
      } else if (rawNome && !rawNome.toLowerCase().includes('sem nome') && !rawNome.toLowerCase().includes('linha ')) {
        existingClientIdx = currentStore.clientes.findIndex(c => c.nome.trim().toLowerCase() === rawNome.toLowerCase());
      }
      let clientRecord: Cliente;

      const rawPhone = row.telefone && row.telefone.trim() && row.telefone.trim() !== '0' ? row.telefone.trim() : '(81) 98000-0000';
      const clientId = isValidCpf
        ? cleanCpf
        : (cleanContract && cleanContract !== '0' && cleanContract !== '-' ? `CLI-CTR-${cleanContract.replace(/\W/g, '')}` : `CLI-OP-${index + 1}`);

      if (existingClientIdx < 0) {
        clientRecord = {
          id: clientId,
          cpf: isValidCpf ? cleanCpf : (row.cpf || cleanCpf),
          nome: rawNome,
          dataNascimento: '',
          telefone: rawPhone,
          email: `${cleanCpf}@cliente.com`,
          cidade: 'Igarassu',
          convenioPrincipal: (row.convenio as Convenio) || 'INSS',
          observacoes: '',
          vendedoraResponsavel: sellerName,
          dataCriacao: dateDigitacao
        };
        currentStore.clientes.unshift(clientRecord);
        clientsCreated++;
      } else {
        clientRecord = {
          ...currentStore.clientes[existingClientIdx],
          nome: rawNome || currentStore.clientes[existingClientIdx].nome,
          telefone: rawPhone !== '(81) 98000-0000' ? rawPhone : currentStore.clientes[existingClientIdx].telefone,
          vendedoraResponsavel: sellerName
        };
        currentStore.clientes[existingClientIdx] = clientRecord;
        clientsUpdated++;
      }

      // Buffer Client write
      const clientDocRef = doc(db, 'clientes', clientRecord.id);
      writeOperations.push({ ref: clientDocRef, data: cleanPayloadForFirestore(clientRecord) });

      // 4. Map Status
      let statusProp: StatusProposta = 'Paga';
      const statusRaw = (row.status || '').toUpperCase();
      if (statusRaw.includes('SIMUL') || statusRaw.includes('MOCK')) statusProp = 'Simuladas';
      else if (statusRaw.includes('ANAL') || statusRaw.includes('ANÁL') || statusRaw.includes('PEND') || statusRaw.includes('APROV')) statusProp = 'Em análise';
      else if (statusRaw.includes('CANCEL') || statusRaw.includes('REPROV')) statusProp = 'Cancelada';

      // 4.1 Mapeamento explícito de Taxa Paga (Sim/Não) da planilha
      let isTaxaRealmentePaga = false;
      if (row.clientePagou !== undefined && row.clientePagou !== null && String(row.clientePagou).trim() !== '') {
        const cpStr = String(row.clientePagou).trim().toUpperCase();
        isTaxaRealmentePaga = cpStr === 'SIM' || cpStr === 'S' || cpStr === 'TRUE' || cpStr === 'PAGA' || cpStr === 'PAGO';
      }

      // 5. Create or Update Proposta for this specific row using deterministic keys
      const cleanContractKey = (cleanContract && cleanContract !== '0' && cleanContract !== '-') 
        ? cleanContract.toLowerCase().replace(/[^a-z0-9]/g, '')
        : '';
      const proposalId = cleanContractKey
        ? `prop-ctr-${cleanContractKey}`
        : `prop-cpf-${cleanCpf}-${Math.round(parsedEmp * 100)}-${dateDigitacao.replace(/\W/g, '')}-${index + 1}`;

      const hasLink = row.linkDocumento && row.linkDocumento.trim() && row.linkDocumento.trim() !== '0' ? row.linkDocumento.trim() : undefined;
      const newProposta: Proposta = {
        id: proposalId,
        carimboDataHora: row.carimboDataHora || new Date().toISOString(),
        cpf: cleanCpf,
        nomeCliente: rawNome,
        dataDigitacao: dateDigitacao,
        dataPagamentoCliente: datePagamento,
        convenio: (row.convenio as Convenio) || 'INSS',
        operacao: (row.operacao as Operacao) || 'Margem',
        banco: (row.banco as Banco) || 'Daycoval',
        promotora: (row.promotora as Promotora) || 'J2 Promotora',
        valorEmprestimo: parsedEmp,
        valorTaxa: parsedTaxa,
        percentualTaxa: parsedPercentTaxa ? Number(parsedPercentTaxa.toFixed(2)) : (parsedEmp > 0 ? Number(((parsedTaxa / parsedEmp) * 100).toFixed(2)) : 0),
        taxaPaga: isTaxaRealmentePaga,
        clientePagouTaxa: isTaxaRealmentePaga,
        vendedora: sellerName,
        digitador: digitadorName,
        numeroContrato: cleanContract,
        status: statusProp,
        linkDocumento: hasLink,
        anexos: hasLink ? [hasLink] : [],
        historicoStatus: [
          {
            status: statusProp,
            data: dateDigitacao,
            usuario: actor.name
          }
        ]
      };

      const existingPropIdx = currentStore.propostas.findIndex(p => 
        p.id === proposalId || (cleanContractKey && p.numeroContrato.trim().toLowerCase() === cleanContract.trim().toLowerCase())
      );

      if (existingPropIdx >= 0) {
        currentStore.propostas[existingPropIdx] = {
          ...currentStore.propostas[existingPropIdx],
          ...newProposta,
          id: currentStore.propostas[existingPropIdx].id // preserve ID
        };
      } else {
        currentStore.propostas.unshift(newProposta);
        proposalsCreated++;
      }

      // Buffer Proposal write
      const proposalDocRef = doc(db, 'propostas', existingPropIdx >= 0 ? currentStore.propostas[existingPropIdx].id : newProposta.id);
      writeOperations.push({ ref: proposalDocRef, data: cleanPayloadForFirestore(newProposta) });

      // 6. Handle Promoter Commission
      const comVal =
        parseBrazilianCurrency(row.faturado) ||
        parseBrazilianCurrency(row.comissaoJ2) ||
        parseBrazilianCurrency(row.comissaoSempre) ||
        parseBrazilianCurrency(row.comissaoDG) ||
        parseBrazilianCurrency(row.comissaoGFT);

      if (comVal > 0) {
        const comRecord: ComissaoPromotora = {
          id: `com-${newProposta.id}`,
          propostaId: newProposta.id,
          numeroContrato: cleanContract,
          clienteNome: rawNome,
          promotora: (row.promotora as Promotora) || 'J2 Promotora',
          valorRecebido: comVal,
          dataRecebimento: datePagamento,
          tipo: 'fixo',
          status: 'confirmada',
          observacao: 'Comissão importada da planilha oficial de produção.'
        };

        currentStore.comissoesPromotoras.unshift(comRecord);
        commissionsCreated++;

        // Buffer Commission write
        const commissionDocRef = doc(db, 'comissoesPromotoras', comRecord.id);
        writeOperations.push({ ref: commissionDocRef, data: cleanPayloadForFirestore(comRecord) });
      }
    });

    // Commit Firestore writes in batches of 400 items
    const chunkSize = 400;
    for (let i = 0; i < writeOperations.length; i += chunkSize) {
      const currentBatch = writeBatch(db);
      const chunk = writeOperations.slice(i, i + chunkSize);
      chunk.forEach(op => {
        currentBatch.set(op.ref, op.data, { merge: true });
      });
      currentBatch.commit().then(() => {
        firebaseUsageTracker.trackWrite(chunk.length);
        console.log(`✅ [Firestore] Lote de ${chunk.length} operações salvo na nuvem com sucesso!`);
      }).catch(err => {
        console.error('Erro ao salvar lote no Firestore:', err);
      });
    }

    this.logAudit({
      usuarioId: actor.id,
      usuarioNome: actor.name,
      acao: 'criou',
      tipoRecurso: 'proposta',
      idRecurso: 'spreadsheet-import',
      detalhes: `Importou planilha completa de contratos: ${rows.length} linhas, ${clientsCreated} novos clientes, ${proposalsCreated} propostas e ${commissionsCreated} comissões enviadas para a nuvem Firebase.`
    });

    saveLocalStore(currentStore);
    return {
      totalRows: rows.length,
      clientsCreated,
      clientsUpdated,
      proposalsCreated,
      commissionsCreated,
      cpfsCorrectedCount
    };
  },

  // USERS
  getUsers(): User[] {
    return currentStore.users;
  },

  saveUser(user: User): void {
    const index = currentStore.users.findIndex(u => u.id === user.id);
    const updatedUsers = [...currentStore.users];
    
    if (index >= 0) {
      const oldName = currentStore.users[index].name;
      const newName = user.name;
      updatedUsers[index] = user;
      
      if (oldName !== newName) {
        // Propagate to propostas
        currentStore.propostas = currentStore.propostas.map(p => {
          let modified = false;
          let v = p.vendedora;
          let d = p.digitador;
          if (normalizeSellerName(v) === normalizeSellerName(oldName)) {
            v = newName;
            modified = true;
          }
          if (normalizeSellerName(d) === normalizeSellerName(oldName)) {
            d = newName;
            modified = true;
          }
          return modified ? { ...p, vendedora: v, digitador: d } : p;
        });
        
        // Propagate to metas
        currentStore.metas = currentStore.metas.map(m => {
          if (normalizeSellerName(m.vendedoraNome) === normalizeSellerName(oldName)) {
            return { ...m, vendedoraNome: newName };
          }
          return m;
        });

        // Propagate to alerts
        currentStore.alertas = currentStore.alertas.map(a => {
           if (normalizeSellerName(a.vendedoraResponsavel) === normalizeSellerName(oldName)) {
             return { ...a, vendedoraResponsavel: newName };
           }
           return a;
        });

        // Propagate to clients
        currentStore.clientes = currentStore.clientes.map(c => {
           if (normalizeSellerName(c.vendedoraResponsavel) === normalizeSellerName(oldName)) {
             return { ...c, vendedoraResponsavel: newName };
           }
           return c;
        });

        // Propagate to feedbacks
        currentStore.feedbacks = currentStore.feedbacks.map(f => {
           let modified = false;
           let v = f.vendedoraNome;
           let a = f.autorNome;
           if (normalizeSellerName(v) === normalizeSellerName(oldName)) {
             v = newName;
             modified = true;
           }
           if (normalizeSellerName(a) === normalizeSellerName(oldName)) {
             a = newName;
             modified = true;
           }
           return modified ? { ...f, vendedoraNome: v, autorNome: a } : f;
        });
      }
    } else {
      updatedUsers.push(user);
    }
    
    currentStore.users = updatedUsers;
    saveLocalStore(currentStore);
    syncItemToFirestore('users', user.id, user);
    
    // If name changed, we need to sync all modified collections to Firestore too
    // In a real app we'd use a cloud function or batch, but here we'll just commit locally.
  },

  deleteUser(userId: string): void {
    currentStore.users = currentStore.users.filter(u => u.id !== userId);
    saveLocalStore(currentStore);
    deleteItemFromFirestore('users', userId);
  },

  // CLIENTES
  getClientes(): Cliente[] {
    return currentStore.clientes;
  },

  getClienteByCpf(cpf: string): Cliente | undefined {
    const clean = cpf.replace(/\D/g, '');
    return currentStore.clientes.find(c => c.cpf.replace(/\D/g, '') === clean);
  },

  saveCliente(cliente: Cliente, currentUser: { id: string; name: string }): void {
    const cleanCpf = cliente.cpf.replace(/\D/g, '');
    const index = currentStore.clientes.findIndex(c => c.cpf.replace(/\D/g, '') === cleanCpf);
    const isNew = index < 0;

    const formattedClient = {
      ...cliente,
      id: cleanCpf,
      cpf: cleanCpf
    };

    const updatedClientes = [...currentStore.clientes];
    if (isNew) {
      updatedClientes.unshift(formattedClient);
    } else {
      updatedClientes[index] = formattedClient;
    }
    currentStore.clientes = updatedClientes;

    if (isNew) {
      this.logAudit({
        usuarioId: currentUser.id,
        usuarioNome: currentUser.name,
        acao: 'criou',
        tipoRecurso: 'cliente',
        idRecurso: formattedClient.id,
        cpfCliente: formattedClient.cpf,
        detalhes: `Cadastrou novo cliente ${formattedClient.nome} (${formattedClient.convenioPrincipal}).`
      });
    } else {
      this.logAudit({
        usuarioId: currentUser.id,
        usuarioNome: currentUser.name,
        acao: 'editou',
        tipoRecurso: 'cliente',
        idRecurso: formattedClient.id,
        cpfCliente: formattedClient.cpf,
        detalhes: `Atualizou dados cadastrais de ${formattedClient.nome}.`
      });
    }
    saveLocalStore(currentStore);
    syncItemToFirestore('clientes', formattedClient.id, formattedClient);
  },

  // PROPOSTAS
  getPropostas(): Proposta[] {
    return currentStore.propostas;
  },

  getPropostasByCpf(cpf: string): Proposta[] {
    const clean = cpf.replace(/\D/g, '');
    return currentStore.propostas
      .filter(p => p.cpf.replace(/\D/g, '') === clean)
      .sort((a, b) => new Date(b.dataDigitacao).getTime() - new Date(a.dataDigitacao).getTime());
  },

  saveProposta(proposta: Proposta, currentUser: { id: string; name: string }): void {
    const index = currentStore.propostas.findIndex(p => p.id === proposta.id);
    const isNew = index < 0;

    const updatedPropostas = [...currentStore.propostas];
    if (isNew) {
      updatedPropostas.unshift(proposta);
    } else {
      updatedPropostas[index] = proposta;
    }
    currentStore.propostas = updatedPropostas;

    if (isNew) {
      this.logAudit({
        usuarioId: currentUser.id,
        usuarioNome: currentUser.name,
        acao: 'criou',
        tipoRecurso: 'proposta',
        idRecurso: proposta.id,
        cpfCliente: proposta.cpf,
        detalhes: `Criou proposta de ${proposta.operacao} no ${proposta.banco} - R$ ${proposta.valorEmprestimo.toFixed(2)}.`
      });
    } else {
      this.logAudit({
        usuarioId: currentUser.id,
        usuarioNome: currentUser.name,
        acao: 'editou',
        tipoRecurso: 'proposta',
        idRecurso: proposta.id,
        cpfCliente: proposta.cpf,
        detalhes: `Modificou dados da proposta ${proposta.numeroContrato}.`
      });
    }
    saveLocalStore(currentStore);
    syncItemToFirestore('propostas', proposta.id, proposta);
  },

  deleteProposta(id: string, currentUser: { id: string; name: string }): void {
    const index = currentStore.propostas.findIndex(p => String(p.id).trim() === String(id).trim());
    if (index === -1) {
      console.warn('Proposta não encontrada para exclusão com id:', id);
      return;
    }
    const prop = currentStore.propostas[index];
    currentStore.propostas = currentStore.propostas.filter(p => String(p.id).trim() !== String(id).trim());

    this.logAudit({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      acao: 'deletou',
      tipoRecurso: 'proposta',
      idRecurso: id,
      cpfCliente: prop.cpf,
      detalhes: `Excluiu proposta ${prop.numeroContrato} do cliente ${prop.nomeCliente}.`
    });

    saveLocalStore(currentStore);
    deleteItemFromFirestore('propostas', id);
  },

  updateStatusProposta(
    propostaId: string,
    novoStatus: StatusProposta,
    currentUser: { id: string; name: string },
    motivo?: string
  ): void {
    const propIndex = currentStore.propostas.findIndex(p => p.id === propostaId);
    if (propIndex === -1) return;

    const updatedPropostas = [...currentStore.propostas];
    const prop = { ...updatedPropostas[propIndex] };
    
    const statusAntigo = prop.status;
    if (statusAntigo === 'Simuladas' && novoStatus !== 'Simuladas') {
      prop.origemSimulacao = true;
      prop.isSimulacao = false;
    }
    prop.status = novoStatus;
    if (novoStatus === 'Cancelada') {
      if (motivo) prop.motivoCancelamento = motivo;
    } else {
      prop.motivoCancelamento = undefined;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    if (novoStatus === 'Paga' && !prop.dataPagamentoCliente) {
      prop.dataPagamentoCliente = getLocalDateString();
      prop.taxaPaga = true;
      prop.clientePagouTaxa = true;
    }

    prop.historicoStatus = [
      ...(prop.historicoStatus || []),
      {
        status: novoStatus,
        data: now,
        usuario: currentUser.name,
        motivo
      }
    ];

    updatedPropostas[propIndex] = prop;
    currentStore.propostas = updatedPropostas;

    this.logAudit({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      acao: 'alterou_status',
      tipoRecurso: 'proposta',
      idRecurso: prop.id,
      cpfCliente: prop.cpf,
      detalhes: `Status alterado de "${statusAntigo}" para "${novoStatus}". ${motivo ? 'Motivo: ' + motivo : ''}`
    });

    saveLocalStore(currentStore);
    syncItemToFirestore('propostas', prop.id, prop);
  },

  // COMISSOES PROMOTORAS
  getComissoesPromotoras(): ComissaoPromotora[] {
    return currentStore.comissoesPromotoras;
  },

  saveComissaoPromotora(comissao: ComissaoPromotora, currentUser: { id: string; name: string }): void {
    const index = currentStore.comissoesPromotoras.findIndex(c => c.id === comissao.id);
    const updatedComissoes = [...currentStore.comissoesPromotoras];
    
    if (index >= 0) {
      updatedComissoes[index] = comissao;
    } else {
      updatedComissoes.unshift(comissao);
    }
    currentStore.comissoesPromotoras = updatedComissoes;

    // Single-Source of Truth: Update the proposal document directly
    const propIndex = currentStore.propostas.findIndex(
      p => p.id === comissao.propostaId ||
           (p.numeroContrato && comissao.numeroContrato && p.numeroContrato.trim().toLowerCase() === comissao.numeroContrato.trim().toLowerCase())
    );
    if (propIndex >= 0) {
      const prop = {
        ...currentStore.propostas[propIndex],
        valorRepasse: Number(comissao.valorRecebido || 0),
        dataRecebimentoRepasse: comissao.dataRecebimento,
        statusRepasse: comissao.status || 'confirmada',
        promotoraRepasse: comissao.promotora,
        tipoRepasse: comissao.tipo,
        percentualRepasse: comissao.percentualAplicado,
        observacaoRepasse: comissao.observacao,
        updatedAt: new Date().toISOString()
      };
      currentStore.propostas[propIndex] = prop;
      syncItemToFirestore('propostas', prop.id, prop);
    }

    this.logAudit({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      acao: index >= 0 ? 'editou' : 'criou',
      tipoRecurso: 'comissao',
      idRecurso: comissao.id,
      detalhes: `Lançamento de comissão ${comissao.promotora} para contrato ${comissao.numeroContrato}: R$ ${comissao.valorRecebido.toFixed(2)}.`
    });

    saveLocalStore(currentStore);
    syncItemToFirestore('comissoesPromotoras', comissao.id, comissao);
  },

  saveComissaoPromotoraBatch(comissoes: ComissaoPromotora[], currentUser: { id: string; name: string }): void {
    if (!comissoes) return;

    currentStore.comissoesPromotoras = comissoes;

    // Single-Source of Truth: Directly bind and update proposals in memory and Firestore
    const now = new Date().toISOString();
    const updatedPropostas: Proposta[] = [];

    comissoes.forEach(c => {
      const propIndex = currentStore.propostas.findIndex(
        p => p.id === c.propostaId ||
             (p.numeroContrato && c.numeroContrato && p.numeroContrato.trim().toLowerCase() === c.numeroContrato.trim().toLowerCase())
      );
      if (propIndex >= 0) {
        const prop = {
          ...currentStore.propostas[propIndex],
          valorRepasse: Number(c.valorRecebido || 0),
          dataRecebimentoRepasse: c.dataRecebimento,
          statusRepasse: c.status || 'confirmada',
          promotoraRepasse: c.promotora,
          tipoRepasse: c.tipo,
          percentualRepasse: c.percentualAplicado,
          observacaoRepasse: c.observacao,
          updatedAt: now
        };
        currentStore.propostas[propIndex] = prop;
        updatedPropostas.push(prop);
      }
    });

    saveLocalStore(currentStore);

    if (updatedPropostas.length > 0) {
      syncBatchToFirestore('propostas', updatedPropostas);
    }

    const chunkSize = 400;
    for (let i = 0; i < comissoes.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = comissoes.slice(i, i + chunkSize);
      chunk.forEach(comissao => {
        const commissionDocRef = doc(db, 'comissoesPromotoras', comissao.id);
        batch.set(commissionDocRef, cleanPayloadForFirestore(comissao), { merge: true });
      });
      batch.commit().catch(err => {
        console.error('Erro ao salvar lote de comissões no Firestore:', err);
      });
    }

    this.logAudit({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      acao: 'criou',
      tipoRecurso: 'comissao',
      idRecurso: 'batch-reconciliation',
      detalhes: `Importação em lote de ${comissoes.length} repasses de promotoras conciliados.`
    });
  },

  deleteComissaoPromotora(id: string, currentUser?: { id: string; name: string }): void {
    currentStore.comissoesPromotoras = currentStore.comissoesPromotoras.filter(c => c.id !== id);
    saveLocalStore(currentStore);
    deleteItemFromFirestore('comissoesPromotoras', id);
    if (currentUser) {
      this.logAudit({
        usuarioId: currentUser.id,
        usuarioNome: currentUser.name,
        acao: 'excluiu',
        tipoRecurso: 'comissao',
        idRecurso: id,
        detalhes: `Excluiu lançamento de repasse da Controladoria.`
      });
    }
  },

  // CONTAS A PAGAR
  getContasPagar(): ContaPagar[] {
    return currentStore.contasPagar;
  },

  saveContaPagar(conta: ContaPagar): void {
    const index = currentStore.contasPagar.findIndex(c => c.id === conta.id);
    const updatedContas = [...currentStore.contasPagar];
    
    if (index >= 0) {
      updatedContas[index] = conta;
    } else {
      updatedContas.unshift(conta);
    }
    currentStore.contasPagar = updatedContas;
    
    saveLocalStore(currentStore);
    syncItemToFirestore('contasPagar', conta.id, conta);
  },

  marcarContaPaga(id: string, dataPagamento = getLocalDateString()): void {
    const index = currentStore.contasPagar.findIndex(c => c.id === id);
    if (index >= 0) {
      const updatedContas = [...currentStore.contasPagar];
      updatedContas[index] = {
        ...updatedContas[index],
        status: 'paga',
        dataPagamento: dataPagamento
      };
      currentStore.contasPagar = updatedContas;
      
      saveLocalStore(currentStore);
      syncItemToFirestore('contasPagar', id, updatedContas[index]);
    }
  },

  // METAS
  getMetas(): MetaVendedora[] {
    return currentStore.metas;
  },

  saveMeta(meta: MetaVendedora, currentUser: { id: string; name: string }): void {
    const index = currentStore.metas.findIndex(m => m.id === meta.id || (m.vendedoraId === meta.vendedoraId && m.mesAno === meta.mesAno));
    const updatedMetas = [...currentStore.metas];
    
    if (index >= 0) {
      updatedMetas[index] = meta;
    } else {
      updatedMetas.push(meta);
    }
    
    currentStore.metas = updatedMetas;

    this.logAudit({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      acao: index >= 0 ? 'editou' : 'criou',
      tipoRecurso: 'meta',
      idRecurso: meta.id,
      detalhes: `Meta definida para ${meta.vendedoraNome} (${meta.mesAno}): R$ ${meta.metaVenda.toLocaleString('pt-BR')} e taxa ${meta.metaPercentualTaxa}%.`
    });

    saveLocalStore(currentStore);
    syncItemToFirestore('metas', meta.id, meta);
  },

  // FEEDBACKS
  getFeedbacks(): Feedback[] {
    return currentStore.feedbacks;
  },

  saveFeedback(fb: Feedback): void {
    const index = currentStore.feedbacks.findIndex(f => f.id === fb.id);
    const updatedFeedbacks = [...currentStore.feedbacks];
    if (index >= 0) {
      updatedFeedbacks[index] = fb;
    } else {
      updatedFeedbacks.unshift(fb);
    }
    currentStore.feedbacks = updatedFeedbacks;
    saveLocalStore(currentStore);
    syncItemToFirestore('feedbacks', fb.id, fb);
  },

  // ALERTAS / OPORTUNIDADES
  getAlertas(): AlertaOportunidade[] {
    return currentStore.alertas;
  },

  saveAlerta(alerta: AlertaOportunidade): void {
    const index = currentStore.alertas.findIndex(a => a.id === alerta.id);
    const updated = [...currentStore.alertas];
    if (index >= 0) {
      updated[index] = alerta;
    } else {
      updated.unshift(alerta);
    }
    currentStore.alertas = updated;
    saveLocalStore(currentStore);
    syncItemToFirestore('alertas', alerta.id, alerta);
  },

  updateAlertaStatus(id: string, status: 'nova' | 'em_contato' | 'convertida' | 'descartada' | 'adiada' | 'concluida'): void {
    const index = currentStore.alertas.findIndex(a => a.id === id);
    if (index >= 0) {
      const updatedAlertas = [...currentStore.alertas];
      updatedAlertas[index] = { ...updatedAlertas[index], status };
      currentStore.alertas = updatedAlertas;
      saveLocalStore(currentStore);
      syncItemToFirestore('alertas', id, updatedAlertas[index]);
    }
  },

  adiarAlerta(id: string, dataAdiada: string, alertData?: Partial<AlertaOportunidade>): void {
    const index = currentStore.alertas.findIndex(a => a.id === id);
    const updatedAlertas = [...currentStore.alertas];
    if (index >= 0) {
      updatedAlertas[index] = {
        ...updatedAlertas[index],
        status: 'adiada',
        adiadoAte: dataAdiada
      };
      currentStore.alertas = updatedAlertas;
      saveLocalStore(currentStore);
      syncItemToFirestore('alertas', id, updatedAlertas[index]);
    } else if (alertData) {
      const newAlert: AlertaOportunidade = {
        id,
        clienteCpf: alertData.clienteCpf || '',
        clienteNome: alertData.clienteNome || 'Cliente',
        clienteTelefone: alertData.clienteTelefone || '',
        tipo: alertData.tipo || 'portabilidade',
        motivo: alertData.motivo || '',
        vendedoraResponsavel: alertData.vendedoraResponsavel || 'Loja',
        status: 'adiada',
        dataCriacao: alertData.dataCriacao || getLocalDateString(),
        valorPotencial: alertData.valorPotencial,
        propostaOrigemId: alertData.propostaOrigemId,
        adiadoAte: dataAdiada
      };
      currentStore.alertas.unshift(newAlert);
      saveLocalStore(currentStore);
      syncItemToFirestore('alertas', id, newAlert);
    }
  },

  concluirAlerta(id: string, alertData?: Partial<AlertaOportunidade>): void {
    const index = currentStore.alertas.findIndex(a => a.id === id);
    const updatedAlertas = [...currentStore.alertas];
    const todayStr = getLocalDateString();
    if (index >= 0) {
      updatedAlertas[index] = {
        ...updatedAlertas[index],
        status: 'concluida',
        concluidoEm: todayStr
      };
      currentStore.alertas = updatedAlertas;
      saveLocalStore(currentStore);
      syncItemToFirestore('alertas', id, updatedAlertas[index]);
    } else if (alertData) {
      const newAlert: AlertaOportunidade = {
        id,
        clienteCpf: alertData.clienteCpf || '',
        clienteNome: alertData.clienteNome || 'Cliente',
        clienteTelefone: alertData.clienteTelefone || '',
        tipo: alertData.tipo || 'portabilidade',
        motivo: alertData.motivo || '',
        vendedoraResponsavel: alertData.vendedoraResponsavel || 'Loja',
        status: 'concluida',
        dataCriacao: alertData.dataCriacao || todayStr,
        valorPotencial: alertData.valorPotencial,
        propostaOrigemId: alertData.propostaOrigemId,
        concluidoEm: todayStr
      };
      currentStore.alertas.unshift(newAlert);
      saveLocalStore(currentStore);
      syncItemToFirestore('alertas', id, newAlert);
    }
  },

  toggleLiberacaoLeadDigitador(alertaId: string, liberado: boolean, currentUser: { id: string; name: string }): void {
    const index = currentStore.alertas.findIndex(a => a.id === alertaId);
    if (index >= 0) {
      const updatedAlertas = [...currentStore.alertas];
      const alerta = {
        ...updatedAlertas[index],
        liberadoParaDigitador: liberado,
        liberadoPor: liberado ? currentUser.name : undefined,
        dataLiberacao: liberado ? getLocalDateString() : undefined
      };
      updatedAlertas[index] = alerta;
      currentStore.alertas = updatedAlertas;

      saveLocalStore(currentStore);
      syncItemToFirestore('alertas', alertaId, alerta);

      this.logAudit({
        usuarioId: currentUser.id,
        usuarioNome: currentUser.name,
        acao: 'editou',
        tipoRecurso: 'cliente',
        idRecurso: alerta.id,
        cpfCliente: alerta.clienteCpf,
        detalhes: liberado
          ? `Autorizou lead de portabilidade de ${alerta.clienteNome} para a digitadora.`
          : `Revogou liberação de lead de portabilidade (${alerta.clienteNome}) para a digitadora.`
      });
    }
  },

  // AUDIT LOGS (LGPD)
  getAuditLogs(): AuditLog[] {
    return currentStore.auditLogs;
  },

  logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const now = new Date();
    const formatted = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const newLog: AuditLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: formatted
    };

    currentStore.auditLogs.unshift(newLog);
    if (currentStore.auditLogs.length > 500) {
      currentStore.auditLogs.pop();
    }
    saveLocalStore(currentStore);
    syncItemToFirestore('auditLogs', newLog.id, newLog);
  }
};
