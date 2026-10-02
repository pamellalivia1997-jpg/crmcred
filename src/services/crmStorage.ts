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

const STORAGE_KEY = 'livia_credsaude_crm_data_v1';

interface CRMDataStore {
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
    // 2. Propostas validation
    const uniqueMap = new Map<string, Proposta>();
    store.propostas.forEach(p => {
      if (p && p.id) {
        // Remove specific legacy mock proposals that interfere with real imported data
        if (p.id.startsWith('prop-sep26-')) {
          modified = true;
          return;
        }
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
        uniqueMap.set(p.id, p);
      }
    });
    store.propostas = Array.from(uniqueMap.values());
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

  return { sanitized: store, modified };
}

// Load store from LocalStorage fallback
function loadStore(): CRMDataStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { sanitized, modified } = sanitizeStore(parsed);
      if (modified) {
        saveLocalStore(sanitized);
      }
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

async function syncItemToFirestore(collectionName: string, id: string, data: any) {
  try {
    const docRef = doc(db, collectionName, id);
    const cleaned = cleanPayloadForFirestore(data);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (err) {
    console.warn(`Firestore sync warning on ${collectionName}/${id}:`, err);
  }
}

async function syncBatchToFirestore(collectionName: string, items: any[]) {
  if (!items || items.length === 0) return;
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
  } catch (err) {
    console.warn(`Firestore batch sync warning on ${collectionName}:`, err);
  }
}

async function deleteItemFromFirestore(collectionName: string, id: string) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Firestore delete warning on ${collectionName}/${id}:`, err);
  }
}

// Listen to Firestore real-time snapshots with smart cache reconciliation
export function initFirestoreRealtimeSync() {
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
      onSnapshot(
        collRef,
        (snapshot) => {
          const items: any[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ ...docSnap.data(), id: docSnap.id });
          });

          if (snapshot.empty) {
            const localItems = (currentStore as any)[coll];
            if (Array.isArray(localItems) && localItems.length > 0) {
              // Upload in efficient batches instead of single concurrent requests
              syncBatchToFirestore(coll, localItems);
            } else {
              if (localItems && localItems.length > 0) {
                (currentStore as any)[coll] = [];
                saveLocalStore(currentStore);
              }
            }
          } else {
            (currentStore as any)[coll] = items;
            
            // Always sanitize store on any realtime snapshot update (proposals, users, etc.)
            const { sanitized } = sanitizeStore(currentStore);
            currentStore = sanitized;

            saveLocalStore(currentStore);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, coll);
        }
      );
    } catch (e) {
      console.warn(`Erro ao registrar listener onSnapshot para ${coll}:`, e);
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
    currentStore = generateSeedData();
    saveLocalStore(currentStore);
  },

  // Zerar dados de teste e base completa de clientes
  clearAllTestData(): void {
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

    // Clear Firestore collections including clientes
    const collectionsToClear = ['clientes', 'propostas', 'comissoesPromotoras', 'contasPagar', 'alertas', 'feedbacks', 'auditLogs'];
    collectionsToClear.forEach(async (collName) => {
      try {
        const querySnap = await getDocs(collection(db, collName));
        const batch = writeBatch(db);
        querySnap.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      } catch (e) {
        console.warn(`Erro ao limpar coleção ${collName} no Firestore:`, e);
      }
    });
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
        dataNascimento: cli.dataNascimento || '1975-01-01',
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

      // Sync to Firestore
      syncItemToFirestore('clientes', formattedClient.id, formattedClient);
    });

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
    let clientsCreated = 0;
    let clientsUpdated = 0;
    let proposalsCreated = 0;
    let commissionsCreated = 0;
    let cpfsCorrectedCount = 0;

    // Build a secure Firestore Write Batch
    const batch = writeBatch(db);

    rows.forEach((row, index) => {
      if (!row.nomeCliente || !row.nomeCliente.trim()) return;

      // 1. CPF Auto-Correction & Standardization
      const { cleanCpf, formattedCpf, wasCorrected } = standardizeCPF(row.cpf);
      if (wasCorrected) cpfsCorrectedCount++;

      // 2. Parsed values
      const parsedEmp = parseBrazilianCurrency(row.valorEmprestimo);
      const parsedTaxa = parseBrazilianCurrency(row.valorTaxa);
      const parsedPercentTaxa = parseBrazilianCurrency(row.percentualTaxa);
      const dateDigitacao = parseBrazilianDate(row.dataDigitacao) || getLocalDateString();
      const rawDatePagto = parseBrazilianDate(row.dataPagamentoCliente);
      const datePagamento = rawDatePagto || dateDigitacao;
      const rawContract = row.numeroContrato ? String(row.numeroContrato).trim() : '';
      const cleanContract = rawContract ? rawContract : `CONTR-${cleanCpf}-${Date.now()}-${index}`;

      const rawSeller = row.vendedora && row.vendedora.trim() && row.vendedora !== '0' ? row.vendedora.trim() : actor.name || 'Hellen Vasconcelos';
      const sellerName = normalizeSellerName(rawSeller);
      const rawDigitador = row.digitador && row.digitador.trim() && row.digitador !== '0' ? row.digitador.trim() : sellerName;
      const digitadorName = normalizeSellerName(rawDigitador);

      // 3. Find or Create/Update Client
      const existingClientIdx = currentStore.clientes.findIndex(c => c.cpf.replace(/\D/g, '') === cleanCpf);
      let clientRecord: Cliente;

      const rawPhone = row.telefone && row.telefone.trim() && row.telefone.trim() !== '0' ? row.telefone.trim() : '(81) 98000-0000';

      if (existingClientIdx < 0) {
        clientRecord = {
          id: cleanCpf,
          cpf: cleanCpf,
          nome: row.nomeCliente.trim(),
          dataNascimento: '1975-01-01',
          telefone: rawPhone,
          email: `${cleanCpf}@cliente.com`,
          cidade: 'Igarassu',
          convenioPrincipal: (row.convenio as Convenio) || 'INSS',
          observacoes: 'Cliente importado via planilha oficial de contratos.',
          vendedoraResponsavel: sellerName,
          dataCriacao: dateDigitacao
        };
        currentStore.clientes.unshift(clientRecord);
        clientsCreated++;
      } else {
        clientRecord = {
          ...currentStore.clientes[existingClientIdx],
          nome: row.nomeCliente.trim() || currentStore.clientes[existingClientIdx].nome,
          telefone: rawPhone !== '(81) 98000-0000' ? rawPhone : currentStore.clientes[existingClientIdx].telefone,
          vendedoraResponsavel: sellerName
        };
        currentStore.clientes[existingClientIdx] = clientRecord;
        clientsUpdated++;
      }

      // Buffer Client write in the Firestore Batch
      const clientDocRef = doc(db, 'clientes', clientRecord.id);
      batch.set(clientDocRef, JSON.parse(JSON.stringify(clientRecord)), { merge: true });

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
      } else {
        isTaxaRealmentePaga = statusProp === 'Paga';
      }

      // 5. Create Proposta for this specific row (Supports repeated clients across multiple rows!)
      const proposalId = `prop-${cleanCpf}-${cleanContract.replace(/\W/g, '')}-${index}`;
      const hasLink = row.linkDocumento && row.linkDocumento.trim() && row.linkDocumento.trim() !== '0' ? row.linkDocumento.trim() : undefined;
      const newProposta: Proposta = {
        id: proposalId,
        carimboDataHora: row.carimboDataHora || new Date().toISOString(),
        cpf: cleanCpf,
        nomeCliente: row.nomeCliente.trim(),
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

      currentStore.propostas.unshift(newProposta);
      proposalsCreated++;

      // Buffer Proposal write in the Firestore Batch
      const proposalDocRef = doc(db, 'propostas', newProposta.id);
      batch.set(proposalDocRef, JSON.parse(JSON.stringify(newProposta)), { merge: true });

      // 6. Handle Promoter Commission (J2, Sempre, DG, GFT, Faturado) if present
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
          clienteNome: row.nomeCliente.trim(),
          promotora: (row.promotora as Promotora) || 'J2 Promotora',
          valorRecebido: comVal,
          dataRecebimento: datePagamento,
          tipo: 'fixo',
          status: 'confirmada',
          observacao: 'Comissão importada da planilha oficial de produção.'
        };

        currentStore.comissoesPromotoras.unshift(comRecord);
        commissionsCreated++;

        // Buffer Commission write in the Firestore Batch
        const commissionDocRef = doc(db, 'comissoesPromotoras', comRecord.id);
        batch.set(commissionDocRef, JSON.parse(JSON.stringify(comRecord)), { merge: true });
      }
    });

    // Commit Firestore Write Batch immediately as an atomic transaction (prevents multiple asynchronous calls overhead!)
    batch.commit().catch(err => {
      console.error('Erro ao salvar lote no Firestore:', err);
    });

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
    if (!comissoes || comissoes.length === 0) return;

    const updatedComissoes = [...currentStore.comissoesPromotoras];
    const batch = writeBatch(db);

    comissoes.forEach(comissao => {
      const index = updatedComissoes.findIndex(c => c.id === comissao.id);
      if (index >= 0) {
        updatedComissoes[index] = comissao;
      } else {
        updatedComissoes.unshift(comissao);
      }

      const commissionDocRef = doc(db, 'comissoesPromotoras', comissao.id);
      batch.set(commissionDocRef, JSON.parse(JSON.stringify(comissao)), { merge: true });
    });

    currentStore.comissoesPromotoras = updatedComissoes;
    saveLocalStore(currentStore);

    batch.commit().catch(err => {
      console.error('Erro ao salvar lote de comissões no Firestore:', err);
    });

    this.logAudit({
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      acao: 'criou',
      tipoRecurso: 'comissao',
      idRecurso: 'batch-reconciliation',
      detalhes: `Importação em lote de ${comissoes.length} repasses de promotoras conciliados.`
    });
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
