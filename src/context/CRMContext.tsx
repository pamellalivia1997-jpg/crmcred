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
import { crmStorage, subscribeToData, SpreadsheetRowInput } from '../services/crmStorage';
import { useAuth } from './AuthContext';

export type PeriodoFiltro =
  | 'hoje'
  | 'semana'
  | 'semana_anterior'
  | 'mes'
  | 'mes_anterior'
  | 'ultimos_3_meses'
  | 'ano'
  | 'personalizado'
  | 'tudo';

interface CRMContextType {
  clientes: Cliente[];
  propostas: Proposta[];
  comissoesPromotoras: ComissaoPromotora[];
  contasPagar: ContaPagar[];
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
  saveContaPagar: (conta: ContaPagar) => void;
  marcarContaPaga: (id: string, data?: string) => void;
  saveMeta: (meta: MetaVendedora) => void;
  saveFeedback: (fb: Feedback) => void;
  updateAlertaStatus: (id: string, status: 'nova' | 'em_contato' | 'convertida' | 'descartada') => void;
  toggleLiberacaoLeadDigitador: (alertaId: string, liberado: boolean) => void;
  resetAllData: () => void;
  clearAllTestData: () => void;
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
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonth = `${yr}-${mo}`;
  const lastDay = new Date(yr, now.getMonth() + 1, 0).getDate();
  const lastDayStr = `${yr}-${mo}-${String(lastDay).padStart(2, '0')}`;

  const [storeState, setStoreState] = useState(() => crmStorage.getStore());
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');
  const [filtroMesAno, setFiltroMesAno] = useState<string>(currentMonth);
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState<string>(`${currentMonth}-01`);
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState<string>(lastDayStr);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(yr);

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

  const updateAlertaStatus = (id: string, status: 'nova' | 'em_contato' | 'convertida' | 'descartada') => {
    crmStorage.updateAlertaStatus(id, status);
  };

  const toggleLiberacaoLeadDigitador = (alertaId: string, liberado: boolean) => {
    crmStorage.toggleLiberacaoLeadDigitador(alertaId, liberado, currentActor);
  };

  const resetAllData = () => {
    crmStorage.reset();
  };

  const clearAllTestData = () => {
    crmStorage.clearAllTestData();
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
      if (p.vendedora) {
        const cleaned = p.vendedora.replace(/\s*\(Balc[ãa]o\)/gi, '').replace(/\s+Balc[ãa]o/gi, '');
        if (cleaned !== p.vendedora) {
          return { ...p, vendedora: cleaned };
        }
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

  return (
    <CRMContext.Provider
      value={{
        clientes: storeState.clientes,
        propostas: cleanPropostas,
        comissoesPromotoras: storeState.comissoesPromotoras,
        contasPagar: storeState.contasPagar,
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
        saveContaPagar,
        marcarContaPaga,
        saveMeta,
        saveFeedback,
        updateAlertaStatus,
        toggleLiberacaoLeadDigitador,
        resetAllData,
        clearAllTestData,
        importClientPortfolio,
        importFullSpreadsheetRows,
        logCpfAccess
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
