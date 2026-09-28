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
import { crmStorage, subscribeToData } from '../services/crmStorage';
import { useAuth } from './AuthContext';

export type PeriodoFiltro = 'hoje' | 'semana' | 'mes' | 'mes_anterior' | 'ultimos_3_meses' | 'ano' | 'tudo';

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

  // Actions
  saveCliente: (cliente: Cliente) => void;
  saveProposta: (proposta: Proposta) => void;
  updateStatusProposta: (id: string, novoStatus: StatusProposta, motivo?: string) => void;
  saveComissaoPromotora: (comissao: ComissaoPromotora) => void;
  saveContaPagar: (conta: ContaPagar) => void;
  marcarContaPaga: (id: string, data?: string) => void;
  saveMeta: (meta: MetaVendedora) => void;
  saveFeedback: (fb: Feedback) => void;
  updateAlertaStatus: (id: string, status: 'nova' | 'em_contato' | 'convertida' | 'descartada') => void;
  resetAllData: () => void;
  logCpfAccess: (cpf: string, nomeCliente: string) => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [storeState, setStoreState] = useState(() => crmStorage.getStore());
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');
  const [filtroMesAno, setFiltroMesAno] = useState<string>('2026-09');

  useEffect(() => {
    return subscribeToData(() => {
      setStoreState({ ...crmStorage.getStore() });
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

  const resetAllData = () => {
    crmStorage.reset();
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

  return (
    <CRMContext.Provider
      value={{
        clientes: storeState.clientes,
        propostas: storeState.propostas,
        comissoesPromotoras: storeState.comissoesPromotoras,
        contasPagar: storeState.contasPagar,
        metas: storeState.metas,
        feedbacks: storeState.feedbacks,
        alertas: storeState.alertas,
        auditLogs: storeState.auditLogs,
        periodo,
        setPeriodo,
        filtroMesAno,
        setFiltroMesAno,
        saveCliente,
        saveProposta,
        updateStatusProposta,
        saveComissaoPromotora,
        saveContaPagar,
        marcarContaPaga,
        saveMeta,
        saveFeedback,
        updateAlertaStatus,
        resetAllData,
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
