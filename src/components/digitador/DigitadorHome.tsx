import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Calculator,
  UserCheck,
  ShieldCheck,
  Send,
  ArrowRight,
  Edit2,
  Check,
  Save,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Proposta, AlertaOportunidade, Cliente, StatusProposta } from '../../types';
import { formatCurrency, formatCPF, formatDate, cleanPersonName, getLocalDateString } from '../../utils/formatters';
import { CPFValidationBadge } from '../common/CPFValidationBadge';
import { DetalhePropostaModal } from '../propostas/DetalhePropostaModal';

interface Props {
  onOpenNovaProposta: (preselectedCliente?: Cliente | null) => void;
  onNavigateToPropostas: () => void;
  onNavigateToAlertas: () => void;
}

export const DigitadorHome: React.FC<Props> = ({
  onOpenNovaProposta,
  onNavigateToPropostas,
  onNavigateToAlertas
}) => {
  const { propostas, alertas, saveProposta, updateStatusProposta } = useCRM();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'leads' | 'propostas'>('propostas');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [leadTypeFilter, setLeadTypeFilter] = useState('todos');
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [selectedPropostaModal, setSelectedPropostaModal] = useState<Proposta | null>(null);

  // Quick inline edit tracking
  const [quickEditedRowId, setQuickEditedRowId] = useState<string | null>(null);

  const currentUserName = currentUser?.name || 'Ana Paula';

  // Proposals typed by the current digitador
  const minhasPropostas = useMemo(() => {
    return propostas.filter(p => {
      const matchDigitador = p.digitador === currentUserName || 
        p.digitador === 'Ana Paula' || 
        (currentUser?.name && p.digitador && p.digitador.toLowerCase() === currentUser.name.toLowerCase());
      return matchDigitador;
    });
  }, [propostas, currentUserName, currentUser]);

  // Total simulations done (digitador's proposals marked as simulation or all her entries)
  const totalSimulacoes = useMemo(() => {
    return propostas.filter(p => Boolean(p.isSimulacao || p.digitador === currentUserName || p.digitador === 'Ana Paula')).length;
  }, [propostas, currentUserName]);

  // All leads authorized by ADM for this digitador (not just portabilidade, but any distributed lead!)
  const leadsAutorizados = useMemo(() => {
    return alertas.filter(a => {
      if (a.liberadoParaDigitador !== true) return false;
      if (a.digitadorDestino && currentUser?.name) {
        return cleanPersonName(a.digitadorDestino).toLowerCase() === cleanPersonName(currentUser.name).toLowerCase();
      }
      return true;
    });
  }, [alertas, currentUser]);

  // Proposals approved or paid from digitador
  const aprovadasPagas = useMemo(() => {
    return minhasPropostas.filter(p => p.status === 'Paga');
  }, [minhasPropostas]);

  // Filtered proposals list for display
  const filteredPropostas = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const cleanTerm = searchTerm.replace(/\D/g, '');

    return minhasPropostas.filter(p => {
      const matchSearch =
        (p.nomeCliente || '').toLowerCase().includes(term) ||
        (p.cpf || '').includes(cleanTerm) ||
        (p.numeroContrato || '').includes(term);

      const matchStatus = statusFilter === 'todos' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [minhasPropostas, searchTerm, statusFilter]);

  // Filtered leads list
  const filteredLeads = useMemo(() => {
    return leadsAutorizados.filter(l => {
      if (leadTypeFilter === 'todos') return true;
      if (leadTypeFilter === 'portabilidade') return l.tipo === 'portabilidade' || l.tipoLeadDistribuido === 'portabilidade';
      if (leadTypeFilter === 'refin') return l.tipo === 'refin' || l.tipoLeadDistribuido === 'refin';
      if (leadTypeFilter === 'indicacao') return l.tipo === 'cartao_credito' || l.tipoLeadDistribuido === 'indicacao';
      if (leadTypeFilter === 'aniversario') return l.tipo === 'aniversario' || l.tipoLeadDistribuido === 'aniversario';
      if (leadTypeFilter === 'misto') return l.tipoLeadDistribuido === 'misto' || l.tipo === 'reativacao';
      return true;
    });
  }, [leadsAutorizados, leadTypeFilter]);

  // Quick inline status change handler
  const handleQuickStatusChange = (prop: Proposta, novoStatus: StatusProposta) => {
    updateStatusProposta(prop.id, novoStatus, `Alteração rápida realizada no Painel da Digitadora (${currentUserName})`);
    setQuickEditedRowId(prop.id);
    setToastNotice(`Status do contrato #${prop.numeroContrato} atualizado para "${novoStatus}"!`);
    setTimeout(() => {
      setToastNotice(null);
      setQuickEditedRowId(null);
    }, 2500);
  };

  // Quick inline value change handler
  const handleQuickValorChange = (prop: Proposta, novoValorStr: string) => {
    const valorNum = parseFloat(novoValorStr);
    if (isNaN(valorNum) || valorNum === prop.valorEmprestimo) return;

    const updated: Proposta = {
      ...prop,
      valorEmprestimo: valorNum,
      updatedAt: new Date().toISOString()
    };
    saveProposta(updated);
    setQuickEditedRowId(prop.id);
    setToastNotice(`Valor do contrato #${prop.numeroContrato} atualizado para ${formatCurrency(valorNum)}!`);
    setTimeout(() => {
      setToastNotice(null);
      setQuickEditedRowId(null);
    }, 2500);
  };

  // Quick inline contract number change handler
  const handleQuickContratoChange = (prop: Proposta, novoContrato: string) => {
    const cleanContrato = novoContrato.trim();
    if (!cleanContrato || cleanContrato === prop.numeroContrato) return;

    const updated: Proposta = {
      ...prop,
      numeroContrato: cleanContrato,
      updatedAt: new Date().toISOString()
    };
    saveProposta(updated);
    setQuickEditedRowId(prop.id);
    setToastNotice(`Número do contrato atualizado para #${cleanContrato}!`);
    setTimeout(() => {
      setToastNotice(null);
      setQuickEditedRowId(null);
    }, 2500);
  };

  const handleDigitarLead = (alerta: AlertaOportunidade) => {
    const tipoLabel = alerta.tipoLeadDistribuido || alerta.tipo || 'Oportunidade';
    const clienteLead: Cliente = {
      id: alerta.clienteCpf,
      cpf: alerta.clienteCpf,
      nome: alerta.clienteNome,
      telefone: alerta.clienteTelefone,
      email: '',
      cidade: 'Igarassu',
      dataNascimento: '',
      convenioPrincipal: 'INSS',
      observacoes: `Lead (${tipoLabel}) distribuído para digitação: ${alerta.motivo}`,
      vendedoraResponsavel: alerta.vendedoraResponsavel || 'Digitadora',
      dataCriacao: getLocalDateString()
    };
    onOpenNovaProposta(clienteLead);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Welcome Banner (Zero sales targets - pure operational speed & accuracy) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B2A4A] via-[#0F5C63] to-[#1B8A8F] p-5 sm:p-7 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-300/30 text-xs font-bold">
              <Calculator className="w-3.5 h-3.5" />
              <span>Painel de Digitação & Simulações Rápidas</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Olá, {cleanPersonName(currentUserName)}!
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed">
              Área exclusiva para cadastro ágil de propostas, simulações e digitação de leads de portabilidade autorizados pelos ADMs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenNovaProposta(null)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Digitação / Simulação</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Toast Feedback Banner */}
      {toastNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* KPI Cards (No sales goals, only operational counts) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Simulações Realizadas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Simulações Realizadas</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {totalSimulacoes}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Registradas na esteira
          </span>
        </div>

        {/* Card 2: Propostas Digitadas por Mim */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Propostas Digitadas</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {minhasPropostas.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Cadastradas por você
          </span>
        </div>

        {/* Card 3: Leads Distribuídos Autorizados */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-cyan-200 dark:border-cyan-900/40 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">Leads Distribuídos</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-300 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-cyan-900 dark:text-cyan-200 tabular-nums">
            {leadsAutorizados.length}
          </p>
          <span className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 block font-semibold">
            Autorizados por ADM
          </span>
        </div>

        {/* Card 4: Aprovadas / Pagas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Aprovadas & Pagas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {aprovadasPagas.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Concluídas com sucesso
          </span>
        </div>
      </div>

      {/* Tabs Switcher for Content Area */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('propostas')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'propostas'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
          <span>Propostas Digitadas por Você</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold">
            {minhasPropostas.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'leads'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-600" />
          <span>Leads Distribuídos pela Gerência</span>
          <span className="px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 text-[10px] font-extrabold">
            {leadsAutorizados.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Leads Distribuídos pela Gerência */}
      {activeTab === 'leads' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-600" />
                <span>Oportunidades & Leads Liberados para Digitação</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Leads de Portabilidade, Refin, Indicação, Saque Aniversário e Mistos distribuídos pelos ADMs para você trabalhar.
              </p>
            </div>

            <button
              onClick={() => onOpenNovaProposta(null)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Digitação Manual Rápida</span>
            </button>
          </div>

          {/* Lead Types Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'todos', label: 'Todos os Leads' },
              { id: 'portabilidade', label: 'Portabilidade' },
              { id: 'refin', label: 'Refinanciamento' },
              { id: 'indicacao', label: 'Indicação' },
              { id: 'aniversario', label: 'Saque Aniversário' },
              { id: 'misto', label: 'Misto / Reativação' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setLeadTypeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  leadTypeFilter === tab.id
                    ? 'bg-[#0F5C63] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
              <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin duration-1000" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Nenhum lead distribuído nesta categoria no momento
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Assim que um ADM distribuir novas oportunidades de crédito para sua meta, elas aparecerão listadas aqui com todos os dados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredLeads.map((lead) => {
                const tipoNome = lead.tipoLeadDistribuido || (
                  lead.tipo === 'portabilidade' ? 'Portabilidade' :
                  lead.tipo === 'refin' ? 'Refinanciamento' :
                  lead.tipo === 'cartao_credito' ? 'Indicação / Cartão' :
                  lead.tipo === 'aniversario' ? 'Saque Aniversário' : 'Oportunidade Mista'
                );

                return (
                  <div
                    key={lead.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 uppercase">
                          {tipoNome}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(lead.dataCriacao)}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {lead.clienteNome}
                      </h3>

                      <div className="text-xs text-slate-500 font-mono space-y-0.5">
                        <p>CPF: {formatCPF(lead.clienteCpf)}</p>
                        <p>Telefone: {lead.clienteTelefone}</p>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        {lead.motivo}
                      </p>

                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Distribuído por: <strong className="text-slate-700 dark:text-slate-200">{lead.liberadoPor || 'ADM'}</strong></span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        {lead.valorPotencial && (
                          <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            Troco est.: {formatCurrency(lead.valorPotencial)}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDigitarLead(lead)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                      >
                        <span>Digitar Proposta</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Minhas Propostas Digitadas (Com Alteração Rápida Direto na Tela!) */}
      {activeTab === 'propostas' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                <span>Propostas Digitadas por Você</span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300">
                  ⚡ Alteração rápida ativa na tela
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Altere o status, número de contrato ou valor diretamente na tabela abaixo sem precisar abrir telas extras.
              </p>
            </div>

            <button
              onClick={() => onOpenNovaProposta(null)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-xs transition-all active:scale-95 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nova Proposta / Simulação</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cliente, CPF ou contrato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {['todos', 'Simuladas', 'Em análise', 'Paga', 'Cancelada'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st === 'todos' ? 'Todos' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Table With Inline Quick Editing */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Contrato (Rápido)</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Operação & Banco</th>
                  <th className="py-2.5 px-3">Valor Digitado (R$)</th>
                  <th className="py-2.5 px-3 text-center">Status (Alteração Rápida)</th>
                  <th className="py-2.5 px-3 text-right">Data Digitação</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredPropostas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Nenhuma proposta digitada encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredPropostas.map((p) => {
                    const isJustEdited = quickEditedRowId === p.id;

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isJustEdited
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Contrato with Quick inline input */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-mono text-[11px]">#</span>
                            <input
                              type="text"
                              defaultValue={p.numeroContrato}
                              onBlur={(e) => handleQuickContratoChange(p, e.target.value)}
                              className="w-24 px-1.5 py-0.5 text-xs font-mono font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                              title="Altere e clique fora para salvar"
                            />
                            {p.isSimulacao && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                Simulação
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cliente */}
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900 dark:text-white">{p.nomeCliente}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-mono">{formatCPF(p.cpf)}</span>
                            <CPFValidationBadge cpf={p.cpf} />
                          </div>
                        </td>

                        {/* Operação & Banco */}
                        <td className="py-2.5 px-3">
                          <span className="font-semibold block text-slate-800 dark:text-slate-200">{p.operacao}</span>
                          <span className="text-[10px] text-slate-400">{p.banco}</span>
                        </td>

                        {/* Valor Digitado with Quick Inline Input */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400 font-bold">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={p.valorEmprestimo}
                              onBlur={(e) => handleQuickValorChange(p, e.target.value)}
                              className="w-28 px-1.5 py-0.5 text-xs font-mono font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                              title="Altere o valor e clique fora para salvar"
                            />
                          </div>
                        </td>

                        {/* Status (Alteração Rápida Direta na Tela) */}
                        <td className="py-2.5 px-3 text-center">
                          <select
                            value={p.status}
                            onChange={(e) => handleQuickStatusChange(p, e.target.value as StatusProposta)}
                            className={`px-2 py-1 text-xs font-black rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${
                              p.status === 'Paga'
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : p.status === 'Simuladas'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                : p.status === 'Em análise'
                                ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                : 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            <option value="Simuladas">Simuladas</option>
                            <option value="Em análise">Em análise</option>
                            <option value="Paga">Paga</option>
                            <option value="Cancelada">Cancelada</option>
                          </select>
                        </td>

                        {/* Data Digitação */}
                        <td className="py-2.5 px-3 text-right text-slate-500 font-mono text-[11px]">
                          {formatDate(p.dataDigitacao)}
                        </td>

                        {/* Detalhe / Edição Completa */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedPropostaModal(p)}
                            className="p-1 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-slate-800 transition"
                            title="Abrir tela completa da proposta"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalhe / Edição Proposta Modal */}
      {selectedPropostaModal && (
        <DetalhePropostaModal
          proposta={selectedPropostaModal}
          onClose={() => setSelectedPropostaModal(null)}
        />
      )}
    </div>
  );
};
