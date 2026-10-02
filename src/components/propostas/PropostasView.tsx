import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Kanban,
  Table as TableIcon,
  Search,
  Filter,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  TrendingUp,
  Percent,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Proposta, StatusProposta, Operacao, Banco, Promotora } from '../../types';
import { formatCurrency, formatPercent, formatDate, formatCPF } from '../../utils/formatters';
import { DetalhePropostaModal } from './DetalhePropostaModal';
import { CPFValidationBadge } from '../common/CPFValidationBadge';

interface PropostasViewProps {
  initialProposta?: Proposta | null;
  initialSearchTerm?: string;
}

type SortField =
  | 'numeroContrato'
  | 'dataDigitacao'
  | 'dataPagamentoCliente'
  | 'nomeCliente'
  | 'operacao'
  | 'banco'
  | 'promotora'
  | 'valorEmprestimo'
  | 'valorTaxa'
  | 'percentualTaxa'
  | 'vendedora'
  | 'status'
  | 'taxaPaga';

export const PropostasView: React.FC<PropostasViewProps> = ({ initialProposta = null, initialSearchTerm = '' }) => {
  const { propostas, updateStatusProposta } = useCRM();
  const { currentUser } = useAuth();

  const [viewMode, setViewMode] = useState<'kanban' | 'tabela'>('tabela');
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  // Period filter with persistence to localStorage (Default: 'mes')
  const [periodoFunil, setPeriodoFunil] = useState<'hoje' | '7d' | 'mes' | 'todos' | 'personalizado'>(() => {
    try {
      const saved = localStorage.getItem('lviacred_periodo_funil');
      if (saved && ['hoje', '7d', 'mes', 'todos', 'personalizado'].includes(saved)) {
        return saved as any;
      }
    } catch (e) {}
    return 'mes';
  });

  const [dataInicioCustom, setDataInicioCustom] = useState(() => {
    try {
      return localStorage.getItem('lviacred_funil_dt_inicio') || '';
    } catch (e) {
      return '';
    }
  });

  const [dataFimCustom, setDataFimCustom] = useState(() => {
    try {
      return localStorage.getItem('lviacred_funil_dt_fim') || '';
    } catch (e) {
      return '';
    }
  });

  // Column dropdown filters
  const [filterVendedora, setFilterVendedora] = useState('todas');
  const [filterOperacao, setFilterOperacao] = useState('todas');
  const [filterBanco, setFilterBanco] = useState('todos');
  const [filterPromotora, setFilterPromotora] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterTaxaPaga, setFilterTaxaPaga] = useState<'todas' | 'sim' | 'nao'>('todas');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('dataDigitacao');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(initialProposta);

  React.useEffect(() => {
    if (initialProposta) {
      setSelectedProposta(initialProposta);
    }
  }, [initialProposta]);

  // Kanban Columns
  const kanbanColumns: { status: StatusProposta; title: string; color: string; badgeColor: string }[] = [
    { status: 'Simuladas', title: 'Simuladas', color: 'border-slate-400 bg-slate-50/30 dark:bg-slate-950/20', badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
    { status: 'Em análise', title: 'Em análise', color: 'border-cyan-400 bg-cyan-50/30 dark:bg-cyan-950/20', badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
    { status: 'Paga', title: 'Paga', color: 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    { status: 'Cancelada', title: 'Cancelada', color: 'border-rose-400 bg-rose-50/30 dark:bg-rose-950/20', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  ];

  const handleMoveProposta = React.useCallback((id: string, newStatus: StatusProposta) => {
    updateStatusProposta(id, newStatus, `Movida via arrastar e soltar (Kanban) para o funil ${newStatus}`);
  }, [updateStatusProposta]);

  const isDigitador = currentUser?.role === 'digitador';

  // Helper date limits for Period filter
  const periodDateLimits = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const d30 = new Date(now);
    d30.setDate(now.getDate() - 30);
    const d30Str = d30.toISOString().split('T')[0];

    const d7 = new Date(now);
    d7.setDate(now.getDate() - 7);
    const d7Str = d7.toISOString().split('T')[0];

    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const mesAtualStr = `${now.getFullYear()}-${mo}`;

    return { todayStr, d30Str, d7Str, mesAtualStr };
  }, []);

  // Filter propostas
  const filteredPropostas = useMemo(() => {
    return propostas.filter(p => {
      // If digitador, only show proposals typed by this user
      if (isDigitador) {
        const matchDigitador =
          p.digitador === currentUser?.name ||
          p.digitador === 'Ana Paula' ||
          (currentUser?.name && p.digitador && p.digitador.toLowerCase().includes(currentUser.name.toLowerCase()));
        if (!matchDigitador) return false;
      }

      // Period filter
      const refDate = p.dataPagamentoCliente || p.dataDigitacao || '';
      if (periodoFunil === 'hoje') {
        if (refDate !== periodDateLimits.todayStr) return false;
      } else if (periodoFunil === '7d') {
        if (refDate < periodDateLimits.d7Str) return false;
      } else if (periodoFunil === 'mes') {
        if (!refDate.startsWith(periodDateLimits.mesAtualStr)) return false;
      } else if (periodoFunil === 'personalizado') {
        if (dataInicioCustom && refDate < dataInicioCustom) return false;
        if (dataFimCustom && refDate > dataFimCustom) return false;
      }

      // Search match
      const matchSearch =
        !searchTerm ||
        p.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf.includes(searchTerm.replace(/\D/g, '')) ||
        p.numeroContrato.toLowerCase().includes(searchTerm.toLowerCase());

      const matchVendedora = filterVendedora === 'todas' || p.vendedora === filterVendedora;
      const matchOperacao = filterOperacao === 'todas' || p.operacao === filterOperacao;
      const matchBanco = filterBanco === 'todos' || p.banco === filterBanco;
      const matchPromotora = filterPromotora === 'todas' || p.promotora === filterPromotora;
      const matchStatus = filterStatus === 'todos' || p.status === filterStatus;

      // Taxa Paga filter
      const isPaidTax = p.taxaPaga === true || p.clientePagouTaxa === true;
      let matchTaxa = true;
      if (filterTaxaPaga === 'sim') matchTaxa = isPaidTax;
      if (filterTaxaPaga === 'nao') matchTaxa = !isPaidTax;

      return matchSearch && matchVendedora && matchOperacao && matchBanco && matchPromotora && matchStatus && matchTaxa;
    });
  }, [
    propostas,
    searchTerm,
    periodoFunil,
    periodDateLimits,
    dataInicioCustom,
    dataFimCustom,
    filterVendedora,
    filterOperacao,
    filterBanco,
    filterPromotora,
    filterStatus,
    filterTaxaPaga,
    isDigitador,
    currentUser
  ]);

  // Sort propostas by selected column
  const sortedPropostas = useMemo(() => {
    return [...filteredPropostas].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'numeroContrato':
          valA = a.numeroContrato || '';
          valB = b.numeroContrato || '';
          break;
        case 'dataDigitacao':
          valA = a.dataDigitacao || '';
          valB = b.dataDigitacao || '';
          break;
        case 'dataPagamentoCliente':
          valA = a.dataPagamentoCliente || '';
          valB = b.dataPagamentoCliente || '';
          break;
        case 'nomeCliente':
          valA = a.nomeCliente.toLowerCase();
          valB = b.nomeCliente.toLowerCase();
          break;
        case 'operacao':
          valA = a.operacao.toLowerCase();
          valB = b.operacao.toLowerCase();
          break;
        case 'banco':
          valA = a.banco.toLowerCase();
          valB = b.banco.toLowerCase();
          break;
        case 'promotora':
          valA = (a.promotora || '').toLowerCase();
          valB = (b.promotora || '').toLowerCase();
          break;
        case 'valorEmprestimo':
          valA = a.valorEmprestimo || 0;
          valB = b.valorEmprestimo || 0;
          break;
        case 'valorTaxa':
          valA = a.valorTaxa || 0;
          valB = b.valorTaxa || 0;
          break;
        case 'percentualTaxa':
          valA = a.percentualTaxa || 0;
          valB = b.percentualTaxa || 0;
          break;
        case 'vendedora':
          valA = a.vendedora.toLowerCase();
          valB = b.vendedora.toLowerCase();
          break;
        case 'status':
          valA = a.status.toLowerCase();
          valB = b.status.toLowerCase();
          break;
        case 'taxaPaga':
          valA = (a.taxaPaga === true || a.clientePagouTaxa === true) ? 1 : 0;
          valB = (b.taxaPaga === true || b.clientePagouTaxa === true) ? 1 : 0;
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPropostas, sortField, sortDirection]);

  // Unique lists for filter dropdowns
  const vendedorasList = useMemo(() => Array.from(new Set(propostas.map(p => p.vendedora).filter(Boolean))), [propostas]);
  const operacoesList = useMemo(() => Array.from(new Set(propostas.map(p => p.operacao).filter(Boolean))), [propostas]);
  const bancosList = useMemo(() => Array.from(new Set(propostas.map(p => p.banco).filter(Boolean))), [propostas]);
  const promotorasList = useMemo(() => Array.from(new Set(propostas.map(p => p.promotora).filter(Boolean))), [propostas]);

  // Aggregates of filtered results
  const totalVolume = filteredPropostas.reduce((acc, p) => acc + p.valorEmprestimo, 0);
  const totalTaxasPagas = filteredPropostas
    .filter(p => p.taxaPaga === true || p.clientePagouTaxa === true)
    .reduce((acc, p) => acc + p.valorTaxa, 0);
  const totalTaxasPendentes = filteredPropostas
    .filter(p => !p.taxaPaga && !p.clientePagouTaxa)
    .reduce((acc, p) => acc + p.valorTaxa, 0);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 inline ml-1 opacity-60 hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-teal-600 dark:text-teal-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-teal-600 dark:text-teal-400 inline ml-1" />
    );
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Top Header & View Switcher */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{isDigitador ? 'Minhas Propostas & Simulações Digitadas' : 'Funil de Propostas Consignadas'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isDigitador
              ? 'Acompanhamento restrito às propostas e simulações cadastradas por você'
              : 'Acompanhamento esteira a esteira com controle de data de pagamento e quitação de taxas'}
          </p>
        </div>

        {/* Kanban vs Table Mode */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => setViewMode('tabela')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'tabela'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tabela</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban</span>
          </button>
        </div>
      </div>

      {/* Modern & Clean Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Main Search & Period Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box (Reduced width) */}
          <div className="relative w-full sm:w-64 lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar CPF, nome ou contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-7 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Period Selector (Label outside, clean options, inline calendar) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Período:
            </span>

            <div className="relative min-w-[155px]">
              <Calendar className="w-3.5 h-3.5 text-teal-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={periodoFunil}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setPeriodoFunil(val);
                  try {
                    localStorage.setItem('lviacred_periodo_funil', val);
                  } catch (err) {}
                }}
                className="w-full pl-8 pr-7 py-2 text-xs font-bold rounded-xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800 text-teal-950 dark:text-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all appearance-none cursor-pointer"
              >
                <option value="hoje">Hoje</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="mes">Mês Atual</option>
                <option value="todos">Todo Histórico</option>
                <option value="personalizado">Personalizado</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-teal-700 text-xs">
                ▾
              </div>
            </div>

            {/* Inline Date Inputs placed side-by-side with the selector */}
            {periodoFunil === 'personalizado' && (
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800 text-xs animate-in fade-in duration-150">
                <input
                  type="date"
                  value={dataInicioCustom}
                  onChange={(e) => {
                    setDataInicioCustom(e.target.value);
                    try {
                      localStorage.setItem('lviacred_funil_dt_inicio', e.target.value);
                    } catch (err) {}
                  }}
                  className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none"
                />
                <span className="text-slate-400 font-bold">até</span>
                <input
                  type="date"
                  value={dataFimCustom}
                  onChange={(e) => {
                    setDataFimCustom(e.target.value);
                    try {
                      localStorage.setItem('lviacred_funil_dt_fim', e.target.value);
                    } catch (err) {}
                  }}
                  className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Secondary Clean Filter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* Vendedora Filter */}
          <select
            value={filterVendedora}
            onChange={(e) => setFilterVendedora(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todas">Vendedora: Todas</option>
            {vendedorasList.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {/* Operacao Filter */}
          <select
            value={filterOperacao}
            onChange={(e) => setFilterOperacao(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todas">Operação: Todas</option>
            {operacoesList.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>

          {/* Banco Filter */}
          <select
            value={filterBanco}
            onChange={(e) => setFilterBanco(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todos">Banco: Todos</option>
            {bancosList.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Promotora Filter */}
          <select
            value={filterPromotora}
            onChange={(e) => setFilterPromotora(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todas">Promotora: Todas</option>
            {promotorasList.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todos">Status: Todos</option>
            <option value="Simuladas">Simuladas</option>
            <option value="Em análise">Em análise</option>
            <option value="Paga">Paga</option>
            <option value="Cancelada">Cancelada</option>
          </select>

          {/* Taxa Paga Filter */}
          <select
            value={filterTaxaPaga}
            onChange={(e) => setFilterTaxaPaga(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todas">Taxa: Todas</option>
            <option value="sim">Taxa: Paga (Sim)</option>
            <option value="nao">Taxa: Pendente (Não)</option>
          </select>
        </div>

        {/* Aggregate Stats Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100 dark:border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">{sortedPropostas.length} contratos</span>
            {(filterVendedora !== 'todas' || filterOperacao !== 'todas' || filterBanco !== 'todos' || filterPromotora !== 'todas' || filterStatus !== 'todos' || filterTaxaPaga !== 'todas' || searchTerm) && (
              <button
                onClick={() => {
                  setFilterVendedora('todas');
                  setFilterOperacao('todas');
                  setFilterBanco('todos');
                  setFilterPromotora('todas');
                  setFilterStatus('todos');
                  setFilterTaxaPaga('todas');
                  setSearchTerm('');
                }}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700 underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
            <span className="flex items-center gap-1">
              Volume: <strong className="text-slate-900 dark:text-white tabular-nums font-black">{formatCurrency(totalVolume)}</strong>
            </span>
            <span className="flex items-center gap-1">
              Taxas Pagas: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums font-black">{formatCurrency(totalTaxasPagas)}</strong>
            </span>
            {totalTaxasPendentes > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                Taxas Pendentes: <strong className="tabular-nums font-black">{formatCurrency(totalTaxasPendentes)}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-start overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colPropostas = sortedPropostas.filter(p => p.status === col.status);
            const colVolume = colPropostas.reduce((acc, p) => acc + p.valorEmprestimo, 0);

            return (
              <div
                key={col.status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const propId = e.dataTransfer.getData('text/plain');
                  if (propId) {
                    handleMoveProposta(propId, col.status);
                  }
                }}
                className={`flex flex-col rounded-3xl border-t-4 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs min-h-[450px] ${col.color}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {col.title}
                    </h2>
                    <span className="text-[10px] text-slate-400 font-semibold tabular-nums">
                      {formatCurrency(colVolume)}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                    {colPropostas.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-2 flex-1 overflow-y-auto overflow-x-hidden max-h-[68vh] pr-0.5 scrollbar-none">
                  {colPropostas.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-8">
                      Nenhuma proposta
                    </p>
                  ) : (
                    colPropostas.map((prop) => {
                      const isTaxPaid = prop.taxaPaga === true || prop.clientePagouTaxa === true;
                      const pctTax = Number(prop.percentualTaxa || 0).toFixed(2);

                      return (
                        <div
                          key={prop.id}
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', prop.id);
                          }}
                          onClick={() => setSelectedProposta(prop)}
                          className="group p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer space-y-1.5 active:cursor-grabbing"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {prop.nomeCliente}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              #{prop.numeroContrato}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{prop.operacao}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{prop.banco}</span>
                          </div>

                          <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                            <div>
                              <span className="text-[10px] text-slate-400 block leading-none">Venda</span>
                              <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                                {formatCurrency(prop.valorEmprestimo)}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block leading-none">Taxa ({pctTax}%)</span>
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                {formatCurrency(prop.valorTaxa)}
                              </span>
                            </div>
                          </div>

                          {/* Taxa Paga Status Badge */}
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 dark:border-slate-700/40">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                              isTaxPaid
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              Taxa: {isTaxPaid ? 'Paga (Sim)' : 'Pendente (Não)'}
                            </span>
                            <span className="text-slate-400 font-semibold">{prop.vendedora}</span>
                          </div>

                          {/* Dates: Digitação + Pagamento ao Cliente */}
                          <div className="text-[9px] text-slate-400 flex flex-wrap items-center justify-between pt-0.5">
                            <span>Dig: {formatDate(prop.dataDigitacao)}</span>
                            {prop.dataPagamentoCliente && (
                              <span className="text-teal-600 dark:text-teal-400 font-bold">
                                Pgto: {formatDate(prop.dataPagamentoCliente)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: FULL DATA TABLE WITH ADVANCED SORTING ON EVERY COLUMN */}
      {viewMode === 'tabela' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[980px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider select-none">
                  {/* Contrato */}
                  <th
                    onClick={() => toggleSort('numeroContrato')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Contrato</span>
                    {renderSortIcon('numeroContrato')}
                  </th>

                  {/* Data (Digitação e Pagamento) */}
                  <th
                    onClick={() => toggleSort('dataDigitacao')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Datas (Dig. / Pgto)</span>
                    {renderSortIcon('dataDigitacao')}
                  </th>

                  {/* Cliente / CPF */}
                  <th
                    onClick={() => toggleSort('nomeCliente')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Cliente / CPF</span>
                    {renderSortIcon('nomeCliente')}
                  </th>

                  {/* Operação */}
                  <th
                    onClick={() => toggleSort('operacao')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Operação</span>
                    {renderSortIcon('operacao')}
                  </th>

                  {/* Banco */}
                  <th
                    onClick={() => toggleSort('banco')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Banco</span>
                    {renderSortIcon('banco')}
                  </th>

                  {/* Promotora */}
                  <th
                    onClick={() => toggleSort('promotora')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Promotora</span>
                    {renderSortIcon('promotora')}
                  </th>

                  {/* Venda (R$) */}
                  <th
                    onClick={() => toggleSort('valorEmprestimo')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Venda (R$)</span>
                    {renderSortIcon('valorEmprestimo')}
                  </th>

                  {/* Taxa (R$) */}
                  <th
                    onClick={() => toggleSort('valorTaxa')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Taxa (R$)</span>
                    {renderSortIcon('valorTaxa')}
                  </th>

                  {/* % Taxa */}
                  <th
                    onClick={() => toggleSort('percentualTaxa')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>% Taxa</span>
                    {renderSortIcon('percentualTaxa')}
                  </th>

                  {/* Taxa Paga (Sim/Não) */}
                  <th
                    onClick={() => toggleSort('taxaPaga')}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Taxa Paga</span>
                    {renderSortIcon('taxaPaga')}
                  </th>

                  {/* Vendedora */}
                  <th
                    onClick={() => toggleSort('vendedora')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Vendedora</span>
                    {renderSortIcon('vendedora')}
                  </th>

                  {/* Status */}
                  <th
                    onClick={() => toggleSort('status')}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {sortedPropostas.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      Nenhuma proposta encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  sortedPropostas.map((prop) => {
                    const isTaxPaid = prop.taxaPaga === true || prop.clientePagouTaxa === true;
                    const pctTax = Number(prop.percentualTaxa || 0).toFixed(2);

                    return (
                      <tr
                        key={prop.id}
                        onClick={() => setSelectedProposta(prop)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        {/* Contrato */}
                        <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                          #{prop.numeroContrato}
                        </td>

                        {/* Datas (Digitação e Pagamento ao Cliente) */}
                        <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">
                          <p className="text-slate-900 dark:text-white font-semibold">
                            {formatDate(prop.dataDigitacao)}
                          </p>
                          {prop.dataPagamentoCliente ? (
                            <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                              Pgto: {formatDate(prop.dataPagamentoCliente)}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400">Pgto pendente</p>
                          )}
                        </td>

                        {/* Cliente / CPF */}
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                            {prop.nomeCliente}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              {formatCPF(prop.cpf)}
                            </span>
                            <CPFValidationBadge cpf={prop.cpf} />
                          </div>
                        </td>

                        {/* Operação */}
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
                          {prop.operacao}
                        </td>

                        {/* Banco */}
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {prop.banco}
                        </td>

                        {/* Promotora */}
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {prop.promotora || '—'}
                        </td>

                        {/* Venda (R$) */}
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                          {formatCurrency(prop.valorEmprestimo)}
                        </td>

                        {/* Taxa (R$) */}
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums whitespace-nowrap text-amber-600 dark:text-amber-400">
                          {formatCurrency(prop.valorTaxa)}
                        </td>

                        {/* % Taxa (Arredondado a no máximo 2 casas decimais) */}
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {pctTax}%
                        </td>

                        {/* Taxa Paga (Sim/Não) */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isTaxPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {isTaxPaid ? 'Sim (Paga)' : 'Não (Pendente)'}
                          </span>
                        </td>

                        {/* Vendedora */}
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium">
                          {prop.vendedora}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prop.status === 'Paga'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : prop.status === 'Em análise'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : prop.status === 'Simuladas'
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {prop.status}
                          </span>
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

      {/* Proposal Detail Modal */}
      <DetalhePropostaModal
        proposta={selectedProposta}
        onClose={() => setSelectedProposta(null)}
      />
    </div>
  );
};
