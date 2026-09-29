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
  StatusProposta
} from '../types';
import { generateSeedData, INITIAL_USERS } from '../data/mockSeed';

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

// Sanitize store to ensure brand naming compliance
function sanitizeStore(store: CRMDataStore): { sanitized: CRMDataStore; modified: boolean } {
  let modified = false;

  if (Array.isArray(store.users)) {
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
  }

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
      if (Array.isArray(p.historicoStatus)) {
        p.historicoStatus.forEach(h => {
          if (h.usuario && /Pamella\s+L[íi]via/i.test(h.usuario)) {
            h.usuario = 'Pamella';
            modified = true;
          }
          if (h.usuario && /L[íi]via\s+Cristina/i.test(h.usuario)) {
            h.usuario = 'Lívia';
            modified = true;
          }
        });
      }
    });
  }

  if (Array.isArray(store.metas)) {
    store.metas.forEach(m => {
      if (m.vendedoraNome && /Pamella\s+L[íi]via/i.test(m.vendedoraNome)) {
        m.vendedoraNome = 'Pamella';
        modified = true;
      }
    });
  }

  if (Array.isArray(store.feedbacks)) {
    store.feedbacks.forEach(f => {
      if (f.autorNome && /Pamella\s+L[íi]via/i.test(f.autorNome)) {
        f.autorNome = 'Pamella';
        modified = true;
      }
      if (f.vendedoraNome && /Pamella\s+L[íi]via/i.test(f.vendedoraNome)) {
        f.vendedoraNome = 'Pamella';
        modified = true;
      }
    });
  }

  if (Array.isArray(store.auditLogs)) {
    store.auditLogs.forEach(a => {
      if (a.usuarioNome && /Pamella\s+L[íi]via/i.test(a.usuarioNome)) {
        a.usuarioNome = 'Pamella';
        modified = true;
      }
      if (a.usuarioNome && /L[íi]via\s+Cristina/i.test(a.usuarioNome)) {
        a.usuarioNome = 'Lívia';
        modified = true;
      }
    });
  }

  return { sanitized: store, modified };
}

// Load or initialize store
function loadStore(): CRMDataStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { sanitized, modified } = sanitizeStore(parsed);
      
      // Ensure default digitador exists
      let needsSave = modified;
      if (Array.isArray(sanitized.users)) {
        const hasDigitador = sanitized.users.some(u => u.role === 'digitador' || u.id === 'user-ana');
        if (!hasDigitador) {
          sanitized.users.push({
            id: 'user-ana',
            name: 'Ana Paula',
            email: 'ana@liviacredsaude.com.br',
            password: '123',
            role: 'digitador',
            phone: '(81) 98555-6677',
            status: 'ativo',
            monthlySalesGoal: 0,
            monthlyTaxPercentGoal: 0,
            baseSalaryCost: 2000,
          });
          needsSave = true;
        }
      }

      if (needsSave) {
        saveStore(sanitized);
      }
      return sanitized;
    }
  } catch (e) {
    console.error('Erro ao ler LocalStorage:', e);
  }

  const seed = generateSeedData();
  saveStore(seed);
  return seed;
}

function saveStore(data: CRMDataStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    notify();
  } catch (e) {
    console.error('Erro ao salvar no LocalStorage:', e);
  }
}

export function resetDemoData(): CRMDataStore {
  const seed = generateSeedData();
  saveStore(seed);
  return seed;
}

// Store singleton in memory
let currentStore: CRMDataStore = loadStore();

export const crmStorage = {
  getStore(): CRMDataStore {
    return currentStore;
  },

  reset(): void {
    currentStore = resetDemoData();
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
    saveStore(currentStore);
  },

  deleteUser(userId: string): void {
    currentStore.users = currentStore.users.filter(u => u.id !== userId);
    saveStore(currentStore);
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

    if (isNew) {
      currentStore.clientes.unshift(cliente);
      this.logAudit({
        usuarioId: currentUser.id,
        usuarioNome: currentUser.name,
        acao: 'criou',
        tipoRecurso: 'cliente',
        idRecurso: cliente.id || cliente.cpf,
        cpfCliente: cliente.cpf,
        detalhes: `Cadastrou novo cliente ${cliente.nome} (${cliente.convenioPrincipal}).`
      });
    } else {
      currentStore.clientes[index] = cliente;
      this.logAudit({
        usuarioId: currentUser.id,
        usuarioNome: currentUser.name,
        acao: 'editou',
        tipoRecurso: 'cliente',
        idRecurso: cliente.id || cliente.cpf,
        cpfCliente: cliente.cpf,
        detalhes: `Atualizou dados cadastrais de ${cliente.nome}.`
      });
    }
    saveStore(currentStore);
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
    saveStore(currentStore);
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

    saveStore(currentStore);
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

    saveStore(currentStore);
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
    saveStore(currentStore);
  },

  marcarContaPaga(id: string, dataPagamento = new Date().toISOString().split('T')[0]): void {
    const conta = currentStore.contasPagar.find(c => c.id === id);
    if (conta) {
      conta.status = 'paga';
      conta.dataPagamento = dataPagamento;
      saveStore(currentStore);
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

    saveStore(currentStore);
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
    saveStore(currentStore);
  },

  // ALERTAS / OPORTUNIDADES
  getAlertas(): AlertaOportunidade[] {
    return currentStore.alertas;
  },

  updateAlertaStatus(id: string, status: 'nova' | 'em_contato' | 'convertida' | 'descartada'): void {
    const alerta = currentStore.alertas.find(a => a.id === id);
    if (alerta) {
      alerta.status = status;
      saveStore(currentStore);
    }
  },

  toggleLiberacaoLeadDigitador(alertaId: string, liberado: boolean, currentUser: { id: string; name: string }): void {
    const alerta = currentStore.alertas.find(a => a.id === alertaId);
    if (alerta) {
      alerta.liberadoParaDigitador = liberado;
      alerta.liberadoPor = liberado ? currentUser.name : undefined;
      alerta.dataLiberacao = liberado ? new Date().toISOString().split('T')[0] : undefined;
      saveStore(currentStore);

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
    saveStore(currentStore);
  }
};
