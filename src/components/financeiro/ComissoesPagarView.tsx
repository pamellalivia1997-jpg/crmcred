import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Receipt,
  Users,
  Calculator,
  Shield,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Download,
  AlertCircle,
  TrendingUp,
  Percent,
  Sparkles
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatPercent, cleanPersonName, getMonthYearLabel } from '../../utils/formatters';
import { normalizeDateToISO, isContratoPago } from '../../utils/dashboardCalculations';

type TabPerfil = 'vendedoras' | 'digitador' | 'adm';

interface ComissaoItem {
  id: string;
  nome: string;
  cargo: string;
  role: 'vendedora' | 'digitador' | 'adm' | 'proprietaria' | 'financeiro';
  volumeVendas: number;
  totalTaxas: number;
  comissaoVendas: number;
  comissaoTaxas: number;
  totalAPagar: number;
  status: 'apurado' | 'pendente' | 'aprovado';
  observacoes: string;
}

export const ComissoesPagarView: React.FC = () => {
  const { allUsers } = useAuth();
  const { propostas } = useCRM();

  const [activeTab, setActiveTab] = useState<TabPerfil>('vendedoras');
  const [searchTerm, setSearchTerm] = useState('');

  // Current competence and next month reference
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth() + 1;
  const currentCompetence = `${yr}-${String(mo).padStart(2, '0')}`;

  const nextMo = mo === 12 ? 1 : mo + 1;
  const nextYr = mo === 12 ? yr + 1 : yr;
  const nextMonthCompetence = `${nextYr}-${String(nextMo).padStart(2, '0')}`;

  const [competenceFilter, setCompetenceFilter] = useState(currentCompetence);

  // Filter paid proposals for current competence
  const paidPropostasInPeriod = useMemo(() => {
    return propostas.filter(p => {
      const dateRef = normalizeDateToISO(p.dataPagamentoCliente || p.dataDigitacao);
      return dateRef.startsWith(competenceFilter) && isContratoPago(p);
    });
  }, [propostas, competenceFilter]);

  // Compute commission items preview by collaborator
  const comissoesPorColaborador = useMemo(() => {
    const list: ComissaoItem[] = [];

    // 1. Vendedoras
    const vendedoras = allUsers.filter(u => u.role === 'vendedora' && u.status === 'ativo');
    vendedoras.forEach(v => {
      const vProps = paidPropostasInPeriod.filter(p =>
        p.vendedora && p.vendedora.toLowerCase().includes(v.name.toLowerCase().split(' ')[0])
      );
      const vendas = vProps.reduce((acc, p) => acc + (p.valorEmprestimo || 0), 0);
      const taxas = vProps.reduce((acc, p) => acc + (p.valorTaxa || 0), 0);

      // Baseline preview calculations (custom calculation engine will be customized later)
      const comissaoTaxas = taxas * 0.20;
      const comissaoVendas = vProps.length * 25.00;
      const totalAPagar = comissaoTaxas + comissaoVendas;

      list.push({
        id: v.id,
        nome: cleanPersonName(v.name),
        cargo: 'Vendedora',
        role: 'vendedora',
        volumeVendas: vendas,
        totalTaxas: taxas,
        comissaoVendas,
        comissaoTaxas,
        totalAPagar,
        status: 'apurado',
        observacoes: `${vProps.length} contratos formalizados na competência.`
      });
    });

    // 2. Digitador(es)
    const digitadores = allUsers.filter(u => u.role === 'digitador' && u.status === 'ativo');
    digitadores.forEach(d => {
      const dProps = paidPropostasInPeriod.filter(p =>
        p.digitador && p.digitador.toLowerCase().includes(d.name.toLowerCase().split(' ')[0])
      );
      const vendas = dProps.reduce((acc, p) => acc + (p.valorEmprestimo || 0), 0);
      const taxas = dProps.reduce((acc, p) => acc + (p.valorTaxa || 0), 0);

      const comissaoVendas = dProps.length * 15.00;
      const comissaoTaxas = 0;
      const totalAPagar = comissaoVendas + comissaoTaxas;

      list.push({
        id: d.id,
        nome: cleanPersonName(d.name),
        cargo: 'Digitadora Dedicada',
        role: 'digitador',
        volumeVendas: vendas,
        totalTaxas: taxas,
        comissaoVendas,
        comissaoTaxas,
        totalAPagar,
        status: 'apurado',
        observacoes: `${dProps.length} propostas digitadas e pagas.`
      });
    });

    // 3. ADM / Gerência
    const adms = allUsers.filter(u => (u.role === 'adm' || u.role === 'proprietaria') && u.status === 'ativo');
    adms.forEach(a => {
      const vendasLoja = paidPropostasInPeriod.reduce((acc, p) => acc + (p.valorEmprestimo || 0), 0);
      const taxasLoja = paidPropostasInPeriod.reduce((acc, p) => acc + (p.valorTaxa || 0), 0);

      // Preliminary preview: baseline management override
      const comissaoVendas = 0;
      const comissaoTaxas = 0;
      const totalAPagar = comissaoVendas + comissaoTaxas;

      list.push({
        id: a.id,
        nome: cleanPersonName(a.name),
        cargo: a.role === 'proprietaria' ? 'Diretoria Executiva' : 'Administrador',
        role: a.role,
        volumeVendas: vendasLoja,
        totalTaxas: taxasLoja,
        comissaoVendas,
        comissaoTaxas,
        totalAPagar,
        status: 'pendente',
        observacoes: 'Aguardando regras específicas de remuneração variável.'
      });
    });

    return list;
  }, [allUsers, paidPropostasInPeriod]);

  // Filter items by active tab and search
  const filteredItems = useMemo(() => {
    return comissoesPorColaborador.filter(item => {
      if (activeTab === 'vendedoras' && item.role !== 'vendedora') return false;
      if (activeTab === 'digitador' && item.role !== 'digitador') return false;
      if (activeTab === 'adm' && item.role !== 'adm' && item.role !== 'proprietaria') return false;

      if (searchTerm) {
        return item.nome.toLowerCase().includes(searchTerm.toLowerCase().trim());
      }
      return true;
    });
  }, [comissoesPorColaborador, activeTab, searchTerm]);

  // Tab totals
  const totalGeralTab = filteredItems.reduce((acc, i) => acc + i.totalAPagar, 0);
  const totalComissaoVendasTab = filteredItems.reduce((acc, i) => acc + i.comissaoVendas, 0);
  const totalComissaoTaxasTab = filteredItems.reduce((acc, i) => acc + i.comissaoTaxas, 0);
  const totalVolumeVendasTab = filteredItems.reduce((acc, i) => acc + i.volumeVendas, 0);

  return (
    <div className="space-y-4 pb-20 md:pb-8 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold mb-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Módulo Financeiro • Fechamento Mensal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Comissões a Pagar</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Apuração das comissões devidas na competência atual com previsão de liquidação e repasse no <strong>mês seguinte ({getMonthYearLabel(nextMonthCompetence)})</strong>.
          </p>
        </div>

        {/* Competence Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>Competência:</span>
            <select
              value={competenceFilter}
              onChange={(e) => setCompetenceFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="2026-10">Outubro/2026 (Pagar em Nov/2026)</option>
              <option value="2026-09">Setembro/2026 (Pagar em Out/2026)</option>
              <option value="2026-08">Agosto/2026 (Pagar em Set/2026)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards: Comissões Previstas para o Mês Seguinte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-emerald-500/10 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
            Total a Pagar no Mês Seguinte
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            {formatCurrency(totalGeralTab)}
          </p>
          <span className="text-[10px] text-emerald-600 mt-1 block">
            Previsão líquida para {getMonthYearLabel(nextMonthCompetence)}
          </span>
        </div>

        <div className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-800 shadow-xs">
          <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block">
            Total Comissão de Vendas
          </span>
          <p className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400 tabular-nums mt-1">
            {formatCurrency(totalComissaoVendasTab)}
          </p>
          <span className="text-[10px] text-blue-600 mt-1 block">
            Volume e contratos digitados
          </span>
        </div>

        <div className="bg-teal-50/60 dark:bg-teal-950/20 p-4 rounded-2xl border border-teal-200/80 dark:border-teal-800 shadow-xs">
          <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 block">
            Total Comissão de Taxas
          </span>
          <p className="text-xl sm:text-2xl font-black text-teal-700 dark:text-teal-400 tabular-nums mt-1">
            {formatCurrency(totalComissaoTaxasTab)}
          </p>
          <span className="text-[10px] text-teal-600 mt-1 block">
            Alíquota sobre taxas apuradas
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">
            Volume de Vendas da Categoria
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
            {formatCurrency(totalVolumeVendasTab)}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {filteredItems.length} colaboradores na categoria
          </span>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          {/* Sub-tabs: Vendedoras, Digitador, ADM */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('vendedoras')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'vendedoras'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <span>Vendedoras</span>
            </button>

            <button
              onClick={() => setActiveTab('digitador')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'digitador'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-600" />
              <span>Digitador</span>
            </button>

            <button
              onClick={() => setActiveTab('adm')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'adm'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>ADM</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Notice of Architecture */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Previsão de Pagamento para o Mês Seguinte:</strong> Comissões calculadas separadamente em <strong>Comissão de Vendas</strong> e <strong>Comissão de Taxas</strong>. A estrutura de cálculo detalhada poderá ser ajustada conforme novas diretrizes.
            </span>
          </div>
        </div>

        {/* Commissions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Colaborador(a)</th>
                <th className="py-2.5 px-3">Cargo</th>
                <th className="py-2.5 px-3 text-right">Volume Vendas</th>
                <th className="py-2.5 px-3 text-right">Taxas Totais</th>
                <th className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400 font-bold">Comissão de Vendas</th>
                <th className="py-2.5 px-3 text-right text-teal-600 dark:text-teal-400 font-bold">Comissão de Taxas</th>
                <th className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-black">Total a Pagar</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    Nenhum colaborador encontrado para a categoria selecionada.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {item.nome}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {item.cargo}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.volumeVendas)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.totalTaxas)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(item.comissaoVendas)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-teal-600 dark:text-teal-400">
                      {formatCurrency(item.comissaoTaxas)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.totalAPagar)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'apurado'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {item.status === 'apurado' ? 'Apurado' : 'Aguardando'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                      {item.observacoes}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-black text-xs bg-slate-50/60 dark:bg-slate-800/60">
                  <td colSpan={2} className="py-3 px-3 text-slate-900 dark:text-white uppercase">
                    Totais da Categoria ({filteredItems.length})
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(totalVolumeVendasTab)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(filteredItems.reduce((acc, i) => acc + i.totalTaxas, 0))}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-blue-600 dark:text-blue-400">
                    {formatCurrency(totalComissaoVendasTab)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-teal-600 dark:text-teal-400">
                    {formatCurrency(totalComissaoTaxasTab)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalGeralTab)}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-slate-400 text-[10px] text-right">
                    Previsão para {getMonthYearLabel(nextMonthCompetence)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
