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
  Percent
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Proposta, StatusProposta, Operacao, Banco, Promotora } from '../../types';
import { formatCurrency, formatPercent, formatDate, formatCPF } from '../../utils/formatters';
import { NovaPropostaModal } from './NovaPropostaModal';
import { DetalhePropostaModal } from './DetalhePropostaModal';
import { CPFValidationBadge } from '../common/CPFValidationBadge';

interface PropostasViewProps {
  initialProposta?: Proposta | null;
  initialSearchTerm?: string;
}

export const PropostasView: React.FC<PropostasViewProps> = ({ initialProposta = null, initialSearchTerm = '' }) => {
  const { propostas, updateStatusProposta } = useCRM();
  const { currentUser } = useAuth();

  const [viewMode, setViewMode] = useState<'kanban' | 'tabela'>('kanban');
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [filterVendedora, setFilterVendedora] = useState('todas');
  const [filterOperacao, setFilterOperacao] = useState('todas');
  const [filterBanco, setFilterBanco] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  
  // Modals state
  const [isNovaModalOpen, setIsNovaModalOpen] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(initialProposta);

  React.useEffect(() => {
    if (initialProposta) {
      setSelectedProposta(initialProposta);
    }
  }, [initialProposta]);

  // Kanban Columns
  const kanbanColumns: { status: StatusProposta; title: string; color: string; badgeColor: string }[] = [
    { status: 'Em análise', title: 'Em Análise', color: 'border-blue-400 bg-blue-50/30 dark:bg-blue-950/20', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    { status: 'Pendente', title: 'Pendente', color: 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/20', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    { status: 'Aprovada', title: 'Aprovada', color: 'border-purple-400 bg-purple-50/30 dark:bg-purple-950/20', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    { status: 'Paga', title: 'Paga', color: 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    { status: 'Cancelada', title: 'Cancelada', color: 'border-rose-400 bg-rose-50/30 dark:bg-rose-950/20', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    { status: 'Reprovada', title: 'Reprovada', color: 'border-red-400 bg-red-50/30 dark:bg-red-950/20', badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
  ];

  const isDigitador = currentUser?.role === 'digitador';

  // Filter propostas
  const filteredPropostas = useMemo(() => {
    return propostas.filter(p => {
      // If digitador, only show proposals typed by this user
      if (isDigitador) {
        const matchDigitador = p.digitador === currentUser?.name || 
          p.digitador === 'Ana Paula' ||
          (currentUser?.name && p.digitador && p.digitador.toLowerCase().includes(currentUser.name.toLowerCase()));
        if (!matchDigitador) return false;
      }

      const matchSearch =
        p.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf.includes(searchTerm.replace(/\D/g, '')) ||
        p.numeroContrato.includes(searchTerm);

      const matchVendedora = filterVendedora === 'todas' || p.vendedora === filterVendedora;
      const matchOperacao = filterOperacao === 'todas' || p.operacao === filterOperacao;
      const matchBanco = filterBanco === 'todos' || p.banco === filterBanco;
      const matchStatus = filterStatus === 'todos' || p.status === filterStatus;

      return matchSearch && matchVendedora && matchOperacao && matchBanco && matchStatus;
    });
  }, [propostas, searchTerm, filterVendedora, filterOperacao, filterBanco, filterStatus, isDigitador, currentUser]);

  // Unique lists for filter dropdowns
  const vendedorasList = useMemo(() => Array.from(new Set(propostas.map(p => p.vendedora))), [propostas]);
  const bancosList = useMemo(() => Array.from(new Set(propostas.map(p => p.banco))), [propostas]);

  // Aggregates of filtered results
  const totalVolume = filteredPropostas.reduce((acc, p) => acc + p.valorEmprestimo, 0);
  const totalTaxas = filteredPropostas.reduce((acc, p) => acc + p.valorTaxa, 0);

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Top Header & View Switcher */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-[#0F5C63]" />
            <span>{isDigitador ? 'Minhas Propostas & Simulações Digitadas' : 'Funil de Propostas Consignadas'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isDigitador 
              ? 'Acompanhamento restrito às propostas e simulações cadastradas por você' 
              : 'Acompanhamento esteira a esteira: do pré-cadastro ao pagamento e quitação de taxas'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Kanban vs Table Mode */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Quadro Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('tabela')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'tabela'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Lista / Planilha</span>
            </button>
          </div>

          {/* New Proposal CTA */}
          <button
            onClick={() => setIsNovaModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>Nova Proposta</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente, CPF ou contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Vendedora Filter */}
          <select
            value={filterVendedora}
            onChange={(e) => setFilterVendedora(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="todas">Todas as Vendedoras</option>
            {vendedorasList.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {/* Operacao Filter */}
          <select
            value={filterOperacao}
            onChange={(e) => setFilterOperacao(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="todas">Todas as Operações</option>
            <option value="Refin">Refin</option>
            <option value="Portabilidade">Portabilidade</option>
            <option value="Refin da Port">Refin da Port</option>
            <option value="Margem">Margem</option>
            <option value="FGTS">FGTS</option>
            <option value="Saque Complementar">Saque Complementar</option>
            <option value="Conta de Energia Elétrica/Luz">Conta de Energia Elétrica/Luz</option>
            <option value="Cartão Novo">Cartão Novo</option>
            <option value="Credcesta">Credcesta</option>
          </select>

          {/* Banco Filter */}
          <select
            value={filterBanco}
            onChange={(e) => setFilterBanco(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="todos">Todos os Bancos</option>
            {bancosList.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Aggregate Stats */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>{filteredPropostas.length} contratos encontrados</span>
          <div className="flex items-center gap-3">
            <span>Volume Total: <strong className="text-slate-900 dark:text-white tabular-nums">{formatCurrency(totalVolume)}</strong></span>
            <span>Taxas Totais: <strong className="text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(totalTaxas)}</strong></span>
          </div>
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 items-start overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colPropostas = filteredPropostas.filter(p => p.status === col.status);
            const colVolume = colPropostas.reduce((acc, p) => acc + p.valorEmprestimo, 0);

            return (
              <div
                key={col.status}
                className={`flex flex-col rounded-2xl border-t-4 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs min-h-[450px] ${col.color}`}
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
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${col.badgeColor}`}>
                    {colPropostas.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[68vh] pr-0.5">
                  {colPropostas.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-8">
                      Nenhuma proposta
                    </p>
                  ) : (
                    colPropostas.map((prop) => (
                      <div
                        key={prop.id}
                        onClick={() => setSelectedProposta(prop)}
                        className="group p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {prop.nomeCliente}
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
                            <span className="text-[10px] text-slate-400 block leading-none">Taxa</span>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                              {formatCurrency(prop.valorTaxa)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>{prop.vendedora}</span>
                          <span>{formatDate(prop.dataDigitacao)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: FULL DATA TABLE */}
      {viewMode === 'tabela' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Contrato</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Cliente / CPF</th>
                  <th className="py-2.5 px-3">Operação</th>
                  <th className="py-2.5 px-3">Banco</th>
                  <th className="py-2.5 px-3">Promotora</th>
                  <th className="py-2.5 px-3 text-right">Venda (R$)</th>
                  <th className="py-2.5 px-3 text-right">Taxa (R$)</th>
                  <th className="py-2.5 px-3 text-right">% Taxa</th>
                  <th className="py-2.5 px-3">Vendedora</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredPropostas.map((prop) => (
                  <tr
                    key={prop.id}
                    onClick={() => setSelectedProposta(prop)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono text-slate-500">#{prop.numeroContrato}</td>
                    <td className="py-2.5 px-3 tabular-nums text-slate-500">{formatDate(prop.dataDigitacao)}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{prop.nomeCliente}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 tabular-nums">{formatCPF(prop.cpf)}</span>
                        <CPFValidationBadge cpf={prop.cpf} />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{prop.operacao}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{prop.banco}</td>
                    <td className="py-2.5 px-3 text-slate-500">{prop.promotora}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">{formatCurrency(prop.valorEmprestimo)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(prop.valorTaxa)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">
                      {formatPercent(prop.percentualTaxa, 1)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{prop.vendedora}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        prop.status === 'Paga' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        prop.status === 'Aprovada' ? 'bg-purple-100 text-purple-800' :
                        prop.status === 'Pendente' ? 'bg-amber-100 text-amber-800' :
                        prop.status === 'Em análise' ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {prop.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <NovaPropostaModal
        isOpen={isNovaModalOpen}
        onClose={() => setIsNovaModalOpen(false)}
      />

      <DetalhePropostaModal
        proposta={selectedProposta}
        onClose={() => setSelectedProposta(null)}
      />
    </div>
  );
};
