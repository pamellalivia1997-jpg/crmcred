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
  ArrowRight
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Proposta, AlertaOportunidade, Cliente } from '../../types';
import { formatCurrency, formatCPF, formatDate, cleanPersonName } from '../../utils/formatters';
import { CPFValidationBadge } from '../common/CPFValidationBadge';

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
  const { propostas, alertas } = useCRM();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'propostas' | 'leads'>('leads');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

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

  // Portability leads authorized by ADM
  const leadsPortabilidadeAutorizados = useMemo(() => {
    return alertas.filter(a => a.tipo === 'portabilidade' && a.liberadoParaDigitador === true);
  }, [alertas]);

  // Proposals approved or paid from digitador
  const aprovadasPagas = useMemo(() => {
    return minhasPropostas.filter(p => p.status === 'Aprovada' || p.status === 'Paga');
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

  const handleDigitarLead = (alerta: AlertaOportunidade) => {
    const mockCliente: Cliente = {
      id: alerta.clienteCpf,
      cpf: alerta.clienteCpf,
      nome: alerta.clienteNome,
      telefone: alerta.clienteTelefone,
      email: '',
      cidade: 'Igarassu',
      dataNascimento: '1975-01-01',
      convenioPrincipal: 'INSS',
      observacoes: `Lead de Portabilidade autorizado por ${alerta.liberadoPor || 'ADM'}: ${alerta.motivo}`,
      vendedoraResponsavel: alerta.vendedoraResponsavel || 'Digitadora',
      dataCriacao: new Date().toISOString().split('T')[0]
    };
    onOpenNovaProposta(mockCliente);
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

        {/* Card 3: Leads Portabilidade Autorizados */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-cyan-200 dark:border-cyan-900/40 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">Portabilidades Liberadas</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-300 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-cyan-900 dark:text-cyan-200 tabular-nums">
            {leadsPortabilidadeAutorizados.length}
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
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'leads'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-600" />
          <span>Leads de Portabilidade Autorizados</span>
          <span className="px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 text-[10px] font-extrabold">
            {leadsPortabilidadeAutorizados.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('propostas')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'propostas'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
          <span>Minhas Propostas Digitadas</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold">
            {minhasPropostas.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Leads de Portabilidade Autorizados por ADM */}
      {activeTab === 'leads' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-600" />
                <span>Leads de Portabilidade Liberados para Digitação</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Você visualiza apenas os leads de portabilidade com liberação formal de um Administrador (ADM).
              </p>
            </div>

            <button
              onClick={() => onOpenNovaProposta(null)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Digitação Rápida Manual</span>
            </button>
          </div>

          {leadsPortabilidadeAutorizados.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
              <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin duration-1000" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Nenhum lead de portabilidade liberado no momento
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Assim que um ADM liberar um contrato de portabilidade para digitação, ele aparecerá aqui com os dados prontos para lançamento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {leadsPortabilidadeAutorizados.map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 uppercase">
                        Portabilidade Liberada
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
                      <span>Autorizado por: <strong className="text-slate-700 dark:text-slate-200">{lead.liberadoPor || 'ADM'}</strong></span>
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Minhas Propostas Digitadas */}
      {activeTab === 'propostas' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                <span>Propostas Digitadas por Você</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Você visualiza apenas os contratos e simulações digitados sob o seu usuário.
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
              {['todos', 'Em análise', 'Pendente', 'Aprovada', 'Paga', 'Cancelada'].map((st) => (
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Contrato</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Operação & Banco</th>
                  <th className="py-2.5 px-3">Valor Digitado</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Data Digitação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredPropostas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Nenhuma proposta digitada encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredPropostas.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        #{p.numeroContrato}
                        {p.isSimulacao && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Simulação
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">{p.nomeCliente}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-mono">{formatCPF(p.cpf)}</span>
                          <CPFValidationBadge cpf={p.cpf} />
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold block text-slate-800 dark:text-slate-200">{p.operacao}</span>
                        <span className="text-[10px] text-slate-400">{p.banco}</span>
                      </td>
                      <td className="py-3 px-3 tabular-nums font-bold text-slate-900 dark:text-white">
                        {formatCurrency(p.valorEmprestimo)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'Paga'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : p.status === 'Aprovada'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : p.status === 'Em análise'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : p.status === 'Pendente'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 font-mono text-[11px]">
                        {formatDate(p.dataDigitacao)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
