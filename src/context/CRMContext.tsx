import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Cliente,
  Proposta,
  ComissaoPromotora,
  ContaPagar,
  MetaVendedora,
  Feedback,
  AlertaOportunidade,
  AuditLog,
  StatusProposta
} from '../types';
import { crmStorage, subscribeToData, SpreadsheetRowInput, type CRMDataStore } from '../services/crmStorage';
import { useAuth } from './AuthContext';
import { fetchGoogleSheetsExpenses, SheetExpenseRow } from '../services/expensesSheetService';
import { calculateDashboardMetrics, DashboardMetrics } from '../utils/dashboardCalculations';

export type PeriodoFiltro =
  | 'hoje'
  | '7d'
  | 'mes'
  | 'todos'
  | 'personalizado'
  | 'semana'
  | 'semana_anterior'
  | 'mes_anterior'
  | 'ultimos_3_meses'
  | 'ano'
  | 'tudo';

interface CRMContextType {
  clientes: Cliente[];
  propostas: Proposta[];
  comissoesPromotoras: ComissaoPromotora[];
  contasPagar: ContaPagar[];
  sheetExpenses: SheetExpenseRow[];
  refreshSheetExpenses: () => Promise<void>;
  metas: MetaVendedora[];
  feedbacks: Feedback[];
  alertas: AlertaOportunidade[];
  auditLogs: AuditLog[];
  
  // Period filter state
  periodo: PeriodoFiltro;
  setPeriodo: (p: PeriodoFiltro) => void;
  filtroMesAno: string; // Ex: '2026-09'
  setFiltroMesAno: (val: string) => void;
  dataInicioPersonalizada: string;
  setDataInicioPersonalizada: (val: string) => void;
  dataFimPersonalizada: string;
  setDataFimPersonalizada: (val: string) => void;
  anoSelecionado: number;
  setAnoSelecionado: (val: number) => void;

  // Actions
  saveCliente: (cliente: Cliente) => void;
  saveProposta: (proposta: Proposta) => void;
  deleteProposta: (id: string) => void;
  updateStatusProposta: (id: string, novoStatus: StatusProposta, motivo?: string) => void;
  saveComissaoPromotora: (comissao: ComissaoPromotora) => void;
  saveComissaoPromotoraBatch: (comissoes: ComissaoPromotora[]) => void;
  deleteComissaoPromotora: (id: string) => void;
  saveContaPagar: (conta: ContaPagar) => void;
  marcarContaPaga: (id: string, data?: string) => void;
  saveMeta: (meta: MetaVendedora) => void;
  saveFeedback: (fb: Feedback) => void;
  saveAlerta: (alerta: AlertaOportunidade) => void;
  updateAlertaStatus: (id: string, status: 'nova' | 'em_contato' | 'convertida' | 'descartada' | 'adiada' | 'concluida') => void;
  adiarAlerta: (id: string, dataAdiada: string, alertData?: Partial<AlertaOportunidade>) => void;
  concluirAlerta: (id: string, alertData?: Partial<AlertaOportunidade>) => void;
  toggleLiberacaoLeadDigitador: (alertaId: string, liberado: boolean) => void;
  resetAllData: () => void;
  clearAllTestData: () => Promise<void>;
  clearFunilData: () => Promise<void>;
  clearControladoriaData: () => Promise<void>;
  purgeMockData: () => Promise<string[]>;
  restoreStore: (data: Partial<CRMDataStore>) => void;
  importClientPortfolio: (clientesList: Cliente[]) => { importedCount: number; updatedCount: number };
  importFullSpreadsheetRows: (rows: SpreadsheetRowInput[]) => {
    totalRows: number;
    clientsCreated: number;
    clientsUpdated: number;
    proposalsCreated: number;
    commissionsCreated: number;
    cpfsCorrectedCount: number;
  };
  logCpfAccess: (cpf: string, nomeCliente: string) => void;
  dashboardMetrics: DashboardMetrics;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, allUsers } = useAuth();
  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonth = `${yr}-${mo}`;
  const lastDay = new Date(yr, now.getMonth() + 1, 0).getDate();
  const lastDayStr = `${yr}-${mo}-${String(lastDay).padStart(2, '0')}`;

  const [storeState, setStoreState] = useState(() => crmStorage.getStore());

  const [periodo, setPeriodoState] = useState<PeriodoFiltro>(() => {
    try {
      const saved = localStorage.getItem('lviacred_periodo_financeiro');
      if (saved && ['hoje', 'semana', 'semana_anterior', 'mes', 'mes_anterior', 'ultimos_3_meses', 'ano', 'personalizado', 'tudo'].includes(saved)) {
        return saved as PeriodoFiltro;
      }
    } catch (e) {}
    return 'mes';
  });

  const [filtroMesAno, setFiltroMesAnoState] = useState<string>(() => {
    try {
      return localStorage.getItem('lviacred_fin_filtro_mes') || currentMonth;
    } catch (e) {
      return currentMonth;
    }
  });

  const [dataInicioPersonalizada, setDataInicioPersonalizadaState] = useState<string>(() => {
    try {
      return localStorage.getItem('lviacred_fin_dt_inicio') || '2026-09-01';
    } catch (e) {
      return '2026-09-01';
    }
  });

  const [dataFimPersonalizada, setDataFimPersonalizadaState] = useState<string>(() => {
    try {
      return localStorage.getItem('lviacred_fin_dt_fim') || '2026-09-30';
    } catch (e) {
      return '2026-09-30';
    }
  });

  const [anoSelecionado, setAnoSelecionadoState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lviacred_fin_ano');
      if (saved && !isNaN(Number(saved))) return Number(saved);
    } catch (e) {}
    return yr;
  });

  const setPeriodo = (p: PeriodoFiltro) => {
    setPeriodoState(p);
    try {
      localStorage.setItem('lviacred_periodo_financeiro', p);
    } catch (e) {}
  };

  const setFiltroMesAno = (m: string) => {
    setFiltroMesAnoState(m);
    try {
      localStorage.setItem('lviacred_fin_filtro_mes', m);
    } catch (e) {}
  };

  const setDataInicioPersonalizada = (d: string) => {
    setDataInicioPersonalizadaState(d);
    try {
      localStorage.setItem('lviacred_fin_dt_inicio', d);
    } catch (e) {}
  };

  const setDataFimPersonalizada = (d: string) => {
    setDataFimPersonalizadaState(d);
    try {
      localStorage.setItem('lviacred_fin_dt_fim', d);
    } catch (e) {}
  };

  const setAnoSelecionado = (a: number) => {
    setAnoSelecionadoState(a);
    try {
      localStorage.setItem('lviacred_fin_ano', String(a));
    } catch (e) {}
  };

  const [sheetExpenses, setSheetExpenses] = useState<SheetExpenseRow[]>([]);

  const refreshSheetExpenses = async () => {
    try {
      const rows = await fetchGoogleSheetsExpenses(true);
      setSheetExpenses(rows);
    } catch (e) {
      console.error('Erro ao atualizar despesas do Google Sheets:', e);
    }
  };

  useEffect(() => {
    fetchGoogleSheetsExpenses().then(rows => {
      if (rows && rows.length > 0) {
        setSheetExpenses(rows);
      }
    }).catch(err => {
      console.error('Erro inicial ao buscar despesas do Google Sheets:', err);
    });
  }, []);

  useEffect(() => {
    return subscribeToData(() => {
      const newStore = crmStorage.getStore();
      setStoreState(prev => {
        if (prev === newStore) return prev;
        return { ...newStore };
      });
    });
  }, []);

  const currentActor = {
    id: currentUser?.id || 'sys',
    name: currentUser?.name || 'Sistema'
  };

  const saveCliente = (cliente: Cliente) => {
    crmStorage.saveCliente(cliente, currentActor);
  };

  const saveProposta = (proposta: Proposta) => {
    crmStorage.saveProposta(proposta, currentActor);
  };

  const deleteProposta = (id: string) => {
    crmStorage.deleteProposta(id, currentActor);
  };

  const updateStatusProposta = (id: string, novoStatus: StatusProposta, motivo?: string) => {
    crmStorage.updateStatusProposta(id, novoStatus, currentActor, motivo);
  };

  const saveComissaoPromotora = (comissao: ComissaoPromotora) => {
    crmStorage.saveComissaoPromotora(comissao, currentActor);
  };

  const saveComissaoPromotoraBatch = (comissoes: ComissaoPromotora[]) => {
    crmStorage.saveComissaoPromotoraBatch(comissoes, currentActor);
  };

  const deleteComissaoPromotora = (id: string) => {
    crmStorage.deleteComissaoPromotora(id, currentActor);
  };

  const saveContaPagar = (conta: ContaPagar) => {
    crmStorage.saveContaPagar(conta);
  };

  const marcarContaPaga = (id: string, data?: string) => {
    crmStorage.marcarContaPaga(id, data);
  };

  const saveMeta = (meta: MetaVendedora) => {
    crmStorage.saveMeta(meta, currentActor);
  };

  const saveFeedback = (fb: Feedback) => {
    crmStorage.saveFeedback(fb);
  };

  const saveAlerta = (alerta: AlertaOportunidade) => {
    crmStorage.saveAlerta(alerta);
  };

  const updateAlertaStatus = (id: string, status: 'nova' | 'em_contato' | 'convertida' | 'descartada' | 'adiada' | 'concluida') => {
    crmStorage.updateAlertaStatus(id, status);
  };

  const adiarAlerta = (id: string, dataAdiada: string, alertData?: Partial<AlertaOportunidade>) => {
    crmStorage.adiarAlerta(id, dataAdiada, alertData);
  };

  const concluirAlerta = (id: string, alertData?: Partial<AlertaOportunidade>) => {
    crmStorage.concluirAlerta(id, alertData);
  };

  const toggleLiberacaoLeadDigitador = (alertaId: string, liberado: boolean) => {
    crmStorage.toggleLiberacaoLeadDigitador(alertaId, liberado, currentActor);
  };

  const resetAllData = () => {
    crmStorage.reset();
  };

  const clearAllTestData = async () => {
    await crmStorage.clearAllTestData();
  };

  const clearFunilData = async () => {
    if (!currentUser || currentUser.role !== 'financeiro') {
      throw new Error('Acesso negado: Apenas usuários do perfil Financeiro podem zerar o funil.');
    }
    await crmStorage.clearFunilData();
  };

  const clearControladoriaData = async () => {
    await crmStorage.clearControladoriaData();
  };

  const purgeMockData = async () => {
    return await crmStorage.purgeMockData();
  };

  const restoreStore = (data: Partial<CRMDataStore>) => {
    crmStorage.restoreStore(data);
  };

  const importClientPortfolio = (clientesList: Cliente[]) => {
    return crmStorage.importClientPortfolio(clientesList, currentActor);
  };

  const importFullSpreadsheetRows = (rows: SpreadsheetRowInput[]) => {
    return crmStorage.importFullSpreadsheetRows(rows, currentActor);
  };

  const logCpfAccess = (cpf: string, nomeCliente: string) => {
    crmStorage.logAudit({
      usuarioId: currentActor.id,
      usuarioNome: currentActor.name,
      acao: 'visualizou',
      tipoRecurso: 'cliente',
      idRecurso: cpf,
      cpfCliente: cpf,
      detalhes: `Acessou dados do cliente ${nomeCliente} para consulta de propostas.`
    });
  };

  const cleanPropostas = React.useMemo(() => {
    return storeState.propostas.map(p => {
      let v = p.vendedora;
      let d = p.digitador;
      if (v) {
        v = v.replace(/\s*\(Balc[ãa]o\)/gi, '').replace(/\s+Balc[ãa]o/gi, '').trim();
      }
      if (d) {
        d = d.replace(/\s*\(Balc[ãa]o\)/gi, '').replace(/\s+Balc[ãa]o/gi, '').trim();
      }
      if (v !== p.vendedora || d !== p.digitador) {
        return { ...p, vendedora: v, digitador: d };
      }
      return p;
    });
  }, [storeState.propostas]);

  const cleanMetas = React.useMemo(() => {
    const seen = new Set<string>();
    const uniqueMetas: MetaVendedora[] = [];
    
    // Reverse to process the latest saved metas first, if duplicates exist
    const reversedMetas = [...storeState.metas].reverse();
    
    reversedMetas.forEach(m => {
      let cleanedName = m.vendedoraNome || '';
      cleanedName = cleanedName.replace(/\s*\(Balc[ãa]o\)/gi, '').replace(/\s+Balc[ãa]o/gi, '');
      const key = `${m.vendedoraId || cleanedName}-${m.mesAno}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMetas.push({
          ...m,
          vendedoraNome: cleanedName
        });
      }
    });
    
    return uniqueMetas.reverse();
  }, [storeState.metas]);

  const cleanAlertas = React.useMemo(() => {
    return storeState.alertas.map(a => {
      if (a.vendedoraResponsavel) {
        const cleaned = a.vendedoraResponsavel.replace(/\s*\(Balc[ãa]o\)/gi, '').replace(/\s+Balc[ãa]o/gi, '');
        if (cleaned !== a.vendedoraResponsavel) {
          return { ...a, vendedoraResponsavel: cleaned };
        }
      }
      return a;
    });
  }, [storeState.alertas]);

  const dashboardMetrics = React.useMemo(() => {
    return calculateDashboardMetrics(
      cleanPropostas,
      dataInicioPersonalizada,
      dataFimPersonalizada,
      cleanMetas,
      allUsers || [],
      storeState.comissoesPromotoras,
      sheetExpenses,
      storeState.contasPagar
    );
  }, [cleanPropostas, dataInicioPersonalizada, dataFimPersonalizada, cleanMetas, allUsers, storeState.comissoesPromotoras, sheetExpenses, storeState.contasPagar]);

  return (
    <CRMContext.Provider
      value={{
        clientes: storeState.clientes,
        propostas: cleanPropostas,
        comissoesPromotoras: storeState.comissoesPromotoras,
        contasPagar: storeState.contasPagar,
        sheetExpenses,
        refreshSheetExpenses,
        metas: cleanMetas,
        feedbacks: storeState.feedbacks,
        alertas: cleanAlertas,
        auditLogs: storeState.auditLogs,
        periodo,
        setPeriodo,
        filtroMesAno,
        setFiltroMesAno,
        dataInicioPersonalizada,
        setDataInicioPersonalizada,
        dataFimPersonalizada,
        setDataFimPersonalizada,
        anoSelecionado,
        setAnoSelecionado,
        saveCliente,
        saveProposta,
        deleteProposta,
        updateStatusProposta,
        saveComissaoPromotora,
        saveComissaoPromotoraBatch,
        deleteComissaoPromotora,
        saveContaPagar,
        marcarContaPaga,
        saveMeta,
        saveFeedback,
        saveAlerta,
        updateAlertaStatus,
        adiarAlerta,
        concluirAlerta,
        toggleLiberacaoLeadDigitador,
        resetAllData,
        clearAllTestData,
        clearFunilData,
        clearControladoriaData,
        purgeMockData,
        restoreStore,
        importClientPortfolio,
        importFullSpreadsheetRows,
        logCpfAccess,
        dashboardMetrics
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
