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
import { normalizeSellerName } from '../utils/formatters';

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
    return { ...u, name };
  });

  if (Array.isArray(store.propostas)) {
    store.propostas.forEach(p => {
      if (p.vendedora && /Pamella\s+L[íi]via/i.test(p.vendedora)) {
        p.vendedora = 'Pamella';
        modified = true;
      }
      if (p.digitador && /Pamella\s+L[íi]via/i.test(p.digitador)) {
        p.digitador = 'Pamella';
        modified = true;
      }
    });
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

// Firestore Sync Helpers
async function syncItemToFirestore(collectionName: string, id: string, data: any) {
  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, JSON.parse(JSON.stringify(data)), { merge: true });
  } catch (err) {
    console.warn(`Firestore sync warning on ${collectionName}/${id}:`, err);
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

// Listen to Firestore real-time snapshots
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
              // Firestore is empty, but we have local items (e.g. seed data). Upload them to Firestore!
              localItems.forEach((item) => {
                if (item && item.id) {
                  syncItemToFirestore(coll, item.id, item);
                }
              });
            } else {
              // Both are empty. Ensure local is cleared too.
              if (localItems && localItems.length > 0) {
                (currentStore as any)[coll] = [];
                saveLocalStore(currentStore);
              }
            }
          } else {
            (currentStore as any)[coll] = items;
            
            // Ensure default saleswomen are always preserved on sync
            if (coll === 'users') {
              const { sanitized } = sanitizeStore(currentStore);
              currentStore = sanitized;
            }

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

// Start listeners
initFirestoreRealtimeSync();

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

// Helper: Parse Brazilian currency formats (e.g., "2.957,02" -> 2957.02)
export function parseBrazilianCurrency(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let s = String(val).trim().replace('R$', '').trim();
  if (!s || s === '-' || s === '0') return 0;
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

// Helper: Parse Brazilian date formats (e.g., "12/03/2026 18:04:11" -> "2026-03-12")
export function parseBrazilianDate(dateStr: any): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const s = String(dateStr).trim().split(' ')[0];
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }
  } else if (s.includes('-')) {
    return s;
  }
  return new Date().toISOString().split('T')[0];
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
    return currentStore;
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
        dataCriacao: cli.dataCriacao || new Date().toISOString().split('T')[0]
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
      const dateDigitacao = parseBrazilianDate(row.dataDigitacao);
      const datePagamento = parseBrazilianDate(row.dataPagamentoCliente || row.dataDigitacao);
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
      if (statusRaw.includes('ANAL') || statusRaw.includes('ANÁL')) statusProp = 'Em análise';
      else if (statusRaw.includes('PEND')) statusProp = 'Pendente';
      else if (statusRaw.includes('APROV')) statusProp = 'Aprovada';
      else if (statusRaw.includes('CANCEL')) statusProp = 'Cancelada';
      else if (statusRaw.includes('REPROV')) statusProp = 'Reprovada';

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
        taxaPaga: statusProp === 'Paga',
        clientePagouTaxa: String(row.clientePagou).toUpperCase() === 'SIM' || parsedTaxa > 0,
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
    if (index >= 0) {
      currentStore.users[index] = user;
    } else {
      currentStore.users.push(user);
    }
    saveLocalStore(currentStore);
    syncItemToFirestore('users', user.id, user);
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

    if (isNew) {
      currentStore.clientes.unshift(formattedClient);
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
      currentStore.clientes[index] = formattedClient;
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

    if (isNew) {
      currentStore.propostas.unshift(proposta);
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
      currentStore.propostas[index] = proposta;
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

  updateStatusProposta(
    propostaId: string,
    novoStatus: StatusProposta,
    currentUser: { id: string; name: string },
    motivo?: string
  ): void {
    const prop = currentStore.propostas.find(p => p.id === propostaId);
    if (!prop) return;

    const statusAntigo = prop.status;
    prop.status = novoStatus;
    if (motivo) prop.motivoCancelamento = motivo;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    if (novoStatus === 'Paga' && !prop.dataPagamentoCliente) {
      prop.dataPagamentoCliente = new Date().toISOString().split('T')[0];
      prop.taxaPaga = true;
      prop.clientePagouTaxa = true;
    }

    prop.historicoStatus.push({
      status: novoStatus,
      data: now,
      usuario: currentUser.name,
      motivo
    });

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
    if (index >= 0) {
      currentStore.comissoesPromotoras[index] = comissao;
    } else {
      currentStore.comissoesPromotoras.unshift(comissao);
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

  // CONTAS A PAGAR
  getContasPagar(): ContaPagar[] {
    return currentStore.contasPagar;
  },

  saveContaPagar(conta: ContaPagar): void {
    const index = currentStore.contasPagar.findIndex(c => c.id === conta.id);
    if (index >= 0) {
      currentStore.contasPagar[index] = conta;
    } else {
      currentStore.contasPagar.unshift(conta);
    }
    saveLocalStore(currentStore);
    syncItemToFirestore('contasPagar', conta.id, conta);
  },

  marcarContaPaga(id: string, dataPagamento = new Date().toISOString().split('T')[0]): void {
    const conta = currentStore.contasPagar.find(c => c.id === id);
    if (conta) {
      conta.status = 'paga';
      conta.dataPagamento = dataPagamento;
      saveLocalStore(currentStore);
      syncItemToFirestore('contasPagar', conta.id, conta);
    }
  },

  // METAS
  getMetas(): MetaVendedora[] {
    return currentStore.metas;
  },

  saveMeta(meta: MetaVendedora, currentUser: { id: string; name: string }): void {
    const index = currentStore.metas.findIndex(m => m.id === meta.id || (m.vendedoraId === meta.vendedoraId && m.mesAno === meta.mesAno));
    if (index >= 0) {
      currentStore.metas[index] = meta;
    } else {
      currentStore.metas.push(meta);
    }

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
    if (index >= 0) {
      currentStore.feedbacks[index] = fb;
    } else {
      currentStore.feedbacks.unshift(fb);
    }
    saveLocalStore(currentStore);
    syncItemToFirestore('feedbacks', fb.id, fb);
  },

  // ALERTAS / OPORTUNIDADES
  getAlertas(): AlertaOportunidade[] {
    return currentStore.alertas;
  },

  updateAlertaStatus(id: string, status: 'nova' | 'em_contato' | 'convertida' | 'descartada'): void {
    const alerta = currentStore.alertas.find(a => a.id === id);
    if (alerta) {
      alerta.status = status;
      saveLocalStore(currentStore);
      syncItemToFirestore('alertas', alerta.id, alerta);
    }
  },

  toggleLiberacaoLeadDigitador(alertaId: string, liberado: boolean, currentUser: { id: string; name: string }): void {
    const alerta = currentStore.alertas.find(a => a.id === alertaId);
    if (alerta) {
      alerta.liberadoParaDigitador = liberado;
      alerta.liberadoPor = liberado ? currentUser.name : undefined;
      alerta.dataLiberacao = liberado ? new Date().toISOString().split('T')[0] : undefined;
      saveLocalStore(currentStore);
      syncItemToFirestore('alertas', alerta.id, alerta);

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
