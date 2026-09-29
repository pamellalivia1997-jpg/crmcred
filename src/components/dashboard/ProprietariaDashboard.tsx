import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  Award,
  Share2,
  Calendar,
  Percent,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  PieChart as PieChartIcon,
  Copy,
  Check,
  X,
  FileSpreadsheet,
  Calculator
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { useCRM, PeriodoFiltro } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Proposta, Operacao, Promotora } from '../../types';
import { formatCurrency, formatPercent, formatDate } from '../../utils/formatters';

interface Props {
  onNavigateToPropostas?: (filter?: any) => void;
  onNavigateToClientes?: () => void;
  onNavigateToAlertas?: () => void;
}

export const ProprietariaDashboard: React.FC<Props> = ({
  onNavigateToPropostas,
  onNavigateToClientes,
  onNavigateToAlertas,
}) => {
  const { propostas, comissoesPromotoras, contasPagar, metas, alertas, periodo, setPeriodo } = useCRM();
  const { allUsers } = useAuth();

  // State for detail modal when user taps a card
  const [detailModalTitle, setDetailModalTitle] = useState<string | null>(null);
  const [detailModalContracts, setDetailModalContracts] = useState<Proposta[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Filter propostas by period
  const filteredPropostas = useMemo(() => {
    const now = new Date(2026, 8, 28); // 28 Sept 2026

    return propostas.filter(p => {
      const pDate = new Date(p.dataDigitacao);
      if (isNaN(pDate.getTime())) return true;

      if (periodo === 'hoje') {
        return p.dataDigitacao === '2026-09-28';
      }
      if (periodo === 'semana') {
        // Last 7 days
        const diffTime = Math.abs(now.getTime() - pDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && pDate <= now;
      }
      if (periodo === 'mes') {
        return p.dataDigitacao.startsWith('2026-09');
      }
      if (periodo === 'mes_anterior') {
        return p.dataDigitacao.startsWith('2026-08');
      }
      if (periodo === 'ultimos_3_meses') {
        return (
          p.dataDigitacao.startsWith('2026-09') ||
          p.dataDigitacao.startsWith('2026-08') ||
          p.dataDigitacao.startsWith('2026-07')
        );
      }
      if (periodo === 'ano') {
        return p.dataDigitacao.startsWith('2026');
      }
      return true;
    });
  }, [propostas, periodo]);

  // Previous month for comparative deltas
  const prevMonthPropostas = useMemo(() => {
    return propostas.filter(p => p.dataDigitacao.startsWith('2026-08') && p.status === 'Paga');
  }, [propostas]);

  // Paid propostas in current filter
  const paidPropostas = useMemo(() => {
    return filteredPropostas.filter(p => p.status === 'Paga');
  }, [filteredPropostas]);

  // Financial aggregates
  const totalVendas = useMemo(() => {
    return paidPropostas.reduce((acc, p) => acc + (p.valorEmprestimo || 0), 0);
  }, [paidPropostas]);

  const totalTaxas = useMemo(() => {
    return paidPropostas.reduce((acc, p) => acc + (p.valorTaxa || 0), 0);
  }, [paidPropostas]);

  const totalComissoesPromotoras = useMemo(() => {
    // Sum confirmed commissions from promotoras for these paid proposals
    const paidIds = new Set(paidPropostas.map(p => p.id));
    return comissoesPromotoras
      .filter(c => paidIds.has(c.propostaId) && c.status === 'confirmada')
      .reduce((acc, c) => acc + c.valorRecebido, 0);
  }, [paidPropostas, comissoesPromotoras]);

  const faturamentoBruto = totalTaxas + totalComissoesPromotoras;

  // Expenses in current period
  const totalDespesas = useMemo(() => {
    // Sum of paid/pending expenses in period
    const cp = contasPagar.filter(c => {
      if (periodo === 'hoje' || periodo === 'semana') return c.status === 'pendente';
      if (periodo === 'mes_anterior') return c.vencimento.startsWith('2026-08');
      return c.vencimento.startsWith('2026-09');
    });
    const billsTotal = cp.reduce((acc, c) => acc + c.valor, 0);
    // Base team salaries cost ~R$ 13.500
    const teamSalaries = periodo === 'semana' ? 3375 : 13500;
    return billsTotal + teamSalaries;
  }, [contasPagar, periodo]);

  const lucroLiquido = faturamentoBruto - totalDespesas;
  const margemLucro = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;
  const ticketMedio = paidPropostas.length > 0 ? totalVendas / paidPropostas.length : 0;
  const percentualMedioTaxa = totalVendas > 0 ? (totalTaxas / totalVendas) * 100 : 0;

  // Global monthly target (Lívia Cred Saúde store target: R$ 380.000)
  const metaLoja = 380000;
  const atingimentoMeta = metaLoja > 0 ? (totalVendas / metaLoja) * 100 : 0;
  const quantoFalta = Math.max(0, metaLoja - totalVendas);

  // Previous month comparative deltas
  const prevMonthVendas = prevMonthPropostas.reduce((acc, p) => acc + p.valorEmprestimo, 0);
  const deltaVendas = prevMonthVendas > 0 ? ((totalVendas - prevMonthVendas) / prevMonthVendas) * 100 : 0;

  // Ranking of sales reps
  const rankingVendedoras = useMemo(() => {
    const sellersMap = new Map<string, { nome: string; vendas: number; taxa: number; count: number; meta: number }>();

    // Initial sellers
    const reps = ['Hellen Vasconcelos', 'Loja Igarassu (Balcão)', 'Taciana Silva', 'Lucélia Ramos', 'Pamella'];
    reps.forEach(nome => {
      const userMeta = metas.find(m => m.vendedoraNome === nome && m.mesAno === '2026-09')?.metaVenda || 75000;
      sellersMap.set(nome, { nome, vendas: 0, taxa: 0, count: 0, meta: userMeta });
    });

    paidPropostas.forEach(p => {
      const rep = sellersMap.get(p.vendedora);
      if (rep) {
        rep.vendas += p.valorEmprestimo;
        rep.taxa += p.valorTaxa;
        rep.count += 1;
      }
    });

    return Array.from(sellersMap.values()).sort((a, b) => b.vendas - a.vendas);
  }, [paidPropostas, metas]);

  // Operations breakdown & profitability
  const operationsChartData = useMemo(() => {
    const map = new Map<Operacao, { operacao: Operacao; vendas: number; taxa: number; count: number }>();
    paidPropostas.forEach(p => {
      const curr = map.get(p.operacao) || { operacao: p.operacao, vendas: 0, taxa: 0, count: 0 };
      curr.vendas += p.valorEmprestimo;
      curr.taxa += p.valorTaxa;
      curr.count += 1;
      map.set(p.operacao, curr);
    });

    return Array.from(map.values())
      .map(item => ({
        ...item,
        percentualTaxa: item.vendas > 0 ? (item.taxa / item.vendas) * 100 : 0
      }))
      .sort((a, b) => b.vendas - a.vendas);
  }, [paidPropostas]);

  // Promotoras breakdown
  const promotorasChartData = useMemo(() => {
    const map = new Map<Promotora, { promotora: Promotora; vendas: number; count: number }>();
    paidPropostas.forEach(p => {
      const curr = map.get(p.promotora) || { promotora: p.promotora, vendas: 0, count: 0 };
      curr.vendas += p.valorEmprestimo;
      curr.count += 1;
      map.set(p.promotora, curr);
    });

    return Array.from(map.values()).sort((a, b) => b.vendas - a.vendas);
  }, [paidPropostas]);

  // 12-Month evolution data for AreaChart
  const evolution12Months = useMemo(() => {
    const months = [
      { key: '2025-10', label: 'Out/25' },
      { key: '2025-11', label: 'Nov/25' },
      { key: '2025-12', label: 'Dez/25' },
      { key: '2026-01', label: 'Jan/26' },
      { key: '2026-02', label: 'Fev/26' },
      { key: '2026-03', label: 'Mar/26' },
      { key: '2026-04', label: 'Abr/26' },
      { key: '2026-05', label: 'Mai/26' },
      { key: '2026-06', label: 'Jun/26' },
      { key: '2026-07', label: 'Jul/26' },
      { key: '2026-08', label: 'Ago/26' },
      { key: '2026-09', label: 'Set/26' },
    ];

    return months.map(m => {
      const mProps = propostas.filter(p => p.dataDigitacao.startsWith(m.key) && p.status === 'Paga');
      const vendas = mProps.reduce((acc, p) => acc + p.valorEmprestimo, 0);
      const taxas = mProps.reduce((acc, p) => acc + p.valorTaxa, 0);
      const comissoes = Math.round(vendas * 0.045);
      const faturamento = taxas + comissoes;
      const despesas = 19500 + (m.key === '2025-12' ? 5000 : 0); // Dec 13th salary
      const lucro = faturamento - despesas;

      return {
        mes: m.label,
        vendas,
        faturamento,
        lucro
      };
    });
  }, [propostas]);

  // Employee profitability calculation (Taxa + Comissão - Custo)
  const employeeProfitability = useMemo(() => {
    return rankingVendedoras.map(seller => {
      const user = allUsers.find(u => u.name === seller.nome);
      const custo = user?.baseSalaryCost || 2200;
      const comissaoPromotoraEst = Math.round(seller.vendas * 0.045);
      const receitaGerada = seller.taxa + comissaoPromotoraEst;
      const rentabilidadeLiquida = receitaGerada - custo;

      return {
        nome: seller.nome,
        vendas: seller.vendas,
        taxas: seller.taxa,
        comissaoPromotora: comissaoPromotoraEst,
        receitaTotal: receitaGerada,
        custo,
        rentabilidadeLiquida
      };
    }).sort((a, b) => b.rentabilidadeLiquida - a.rentabilidadeLiquida);
  }, [rankingVendedoras, allUsers]);

  // Cancellations & Rejections
  const canceladasOuReprovadas = useMemo(() => {
    return filteredPropostas.filter(p => p.status === 'Cancelada' || p.status === 'Reprovada');
  }, [filteredPropostas]);

  const totalCancelado = canceladasOuReprovadas.reduce((acc, p) => acc + p.valorEmprestimo, 0);

  // Handle card click to open contract detail modal
  const handleOpenDetailModal = (title: string, list: Proposta[]) => {
    setDetailModalTitle(title);
    setDetailModalContracts(list);
  };

  // Estatísticas de Digitação: Quantas propostas e simulações cada um digitou
  const digitacaoStats = useMemo(() => {
    const counts: Record<string, { propostas: number; volume: number; simulacoes: number }> = {};

    filteredPropostas.forEach(p => {
      const dig = p.digitador || p.vendedora || 'Não informado';
      if (!counts[dig]) {
        counts[dig] = { propostas: 0, volume: 0, simulacoes: 0 };
      }
      counts[dig].propostas += 1;
      counts[dig].volume += p.valorEmprestimo;
      if (p.isSimulacao || dig === 'Ana Paula') {
        counts[dig].simulacoes += 1;
      }
    });

    const totalDigitadas = filteredPropostas.length;
    const totalSimulacoesLoja = filteredPropostas.filter(p => p.isSimulacao || p.digitador === 'Ana Paula').length;

    const list = Object.entries(counts).map(([nome, data]) => {
      const isDigitadoraDedicada = (nome || '').toLowerCase().includes('ana') || 
        allUsers.some(u => (u.name || '').toLowerCase() === (nome || '').toLowerCase() && u.role === 'digitador');
      const share = totalDigitadas > 0 ? (data.propostas / totalDigitadas) * 100 : 0;
      return {
        nome,
        ...data,
        isDigitadoraDedicada,
        share
      };
    }).sort((a, b) => b.propostas - a.propostas);

    return { list, totalDigitadas, totalSimulacoesLoja };
  }, [filteredPropostas, allUsers]);

  // Generate WhatsApp summary text
  const generateWhatsAppSummary = () => {
    const pLabel = periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? 'Esta Semana' : 'Mês Atual (Setembro/2026)';
    return `*LÍVIA CRED SAÚDE • RESUMO GERENCIAL*
📅 *Período:* ${pLabel}

💰 *Vendas Totais:* ${formatCurrency(totalVendas)}
🏷️ *Taxas Recebidas:* ${formatCurrency(totalTaxas)} (${formatPercent(percentualMedioTaxa)})
🏦 *Comissões Promotoras:* ${formatCurrency(totalComissoesPromotoras)}
📈 *Faturamento Bruto:* ${formatCurrency(faturamentoBruto)}
📉 *Despesas Operacionais:* ${formatCurrency(totalDespesas)}
💎 *Lucro Líquido:* ${formatCurrency(lucroLiquido)} (Margem ${formatPercent(margemLucro)})

🎯 *Meta do Mês:* ${formatPercent(atingimentoMeta)} atingido
⏳ *Falta para a Meta:* ${formatCurrency(quantoFalta)}
📄 *Contratos Pagos:* ${paidPropostas.length}
🤝 *Ticket Médio:* ${formatCurrency(ticketMedio)}

🏆 *TOP 3 VENDEDORAS:*
1º ${rankingVendedoras[0]?.nome || '-'}: ${formatCurrency(rankingVendedoras[0]?.vendas || 0)}
2º ${rankingVendedoras[1]?.nome || '-'}: ${formatCurrency(rankingVendedoras[1]?.vendas || 0)}
3º ${rankingVendedoras[2]?.nome || '-'}: ${formatCurrency(rankingVendedoras[2]?.vendas || 0)}

_Gerado automaticamente via Lívia Cred Saúde CRM_`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateWhatsAppSummary());
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Top Header Controls: Title & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Painel Gerencial</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300">
              Diretoria Executiva
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento em tempo real de faturamento, comissões, ranking e rentabilidade.
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(['hoje', 'semana', 'mes', 'mes_anterior', 'ultimos_3_meses', 'ano'] as PeriodoFiltro[]).map((p) => {
            const labels: Record<PeriodoFiltro, string> = {
              hoje: 'Hoje',
              semana: 'Semana',
              mes: 'Este Mês',
              mes_anterior: 'Mês Anterior',
              ultimos_3_meses: '3 Meses',
              ano: '2026',
              tudo: 'Tudo'
            };
            const isSelected = periodo === p;
            return (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#0B2A4A] dark:bg-[#1B8A8F] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}

          {/* Share WhatsApp summary button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ml-1 whitespace-nowrap"
            title="Compartilhar Resumo no WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>

      {/* Global Month Target Progress Banner */}
      <div className="bg-gradient-to-br from-[#0B2A4A] via-[#0F5C63] to-[#1B8A8F] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-300">
                Meta Global da Loja • Competência Setembro/2026
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
                  {formatCurrency(totalVendas)}
                </span>
                <span className="text-xs text-teal-100">
                  de {formatCurrency(metaLoja)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15">
              <div>
                <p className="text-[10px] text-teal-100 uppercase font-semibold">Atingimento</p>
                <p className="text-lg font-black text-amber-300 tabular-nums">
                  {formatPercent(atingimentoMeta)}
                </p>
              </div>
              <div className="h-7 w-[1px] bg-white/20" />
              <div>
                <p className="text-[10px] text-teal-100 uppercase font-semibold">Faltam</p>
                <p className="text-sm font-bold text-white tabular-nums">
                  {formatCurrency(quantoFalta)}
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-black/25 rounded-full h-3.5 p-0.5 border border-white/20">
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${Math.min(100, atingimentoMeta)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-teal-100 mt-2 font-medium">
            <span>{paidPropostas.length} contratos formalizados e pagos</span>
            <span>Ritmo estimado: 104% até o fechamento</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards Grid (Clickable to open contracts breakdown!) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Vendas Totais */}
        <div
          onClick={() => handleOpenDetailModal('Contratos Pagos (Vendas)', paidPropostas)}
          className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-teal-500/50 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Vendas Totais</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#0F5C63] dark:text-[#28B0B7] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums group-hover:text-[#0F5C63] dark:group-hover:text-[#28B0B7] transition-colors">
            {formatCurrency(totalVendas)}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px]">
            {deltaVendas >= 0 ? (
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{deltaVendas.toFixed(1)}%
              </span>
            ) : (
              <span className="flex items-center text-rose-600 dark:text-rose-400 font-bold">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {deltaVendas.toFixed(1)}%
              </span>
            )}
            <span className="text-slate-400">vs mês ant.</span>
          </div>
        </div>

        {/* Card 2: Taxas Recebidas */}
        <div
          onClick={() => handleOpenDetailModal('Taxas de Assessoria Recebidas', paidPropostas.filter(p => p.valorTaxa > 0))}
          className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-500/50 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Taxas Recebidas</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums group-hover:text-amber-600 transition-colors">
            {formatCurrency(totalTaxas)}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
            <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {formatPercent(percentualMedioTaxa)}
            </span>
            <span>da venda total</span>
          </div>
        </div>

        {/* Card 3: Comissões Promotoras */}
        <div
          onClick={() => handleOpenDetailModal('Comissões Recebidas das Promotoras', paidPropostas)}
          className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Comissões Promotoras</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums group-hover:text-blue-600 transition-colors">
            {formatCurrency(totalComissoesPromotoras)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            J2, Sempre, DG & GFT
          </p>
        </div>

        {/* Card 4: Faturamento Bruto */}
        <div
          onClick={() => handleOpenDetailModal('Faturamento (Taxas + Promotoras)', paidPropostas)}
          className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Faturamento Bruto</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(faturamentoBruto)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Taxas + Comissões bancárias
          </p>
        </div>
      </div>

      {/* Secondary Financial Indicators Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500">Despesas Operacionais</span>
          <p className="text-base font-extrabold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
            {formatCurrency(totalDespesas)}
          </p>
          <p className="text-[10px] text-slate-400">Contas + Folha</p>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40">
          <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Lucro Líquido Real</span>
          <p className="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
            {formatCurrency(lucroLiquido)}
          </p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Margem: {formatPercent(margemLucro)}</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500">Nº de Contratos Pagos</span>
          <p className="text-base font-extrabold text-slate-800 dark:text-white tabular-nums mt-0.5">
            {paidPropostas.length}
          </p>
          <p className="text-[10px] text-slate-400">Operações finalizadas</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500">Ticket Médio</span>
          <p className="text-base font-extrabold text-slate-800 dark:text-white tabular-nums mt-0.5">
            {formatCurrency(ticketMedio)}
          </p>
          <p className="text-[10px] text-slate-400">Por contrato</p>
        </div>
      </div>

      {/* Ranking de Vendedoras (Top 3 Medals & Team Progress) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Ranking de Vendedoras</span>
            </h2>
            <p className="text-xs text-slate-500">
              Desempenho individual em vendas e taxa arrecadada
            </p>
          </div>
          <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
            {rankingVendedoras.length} Atendentes
          </span>
        </div>

        <div className="space-y-3">
          {rankingVendedoras.map((vendedora, index) => {
            const percentualAtingido = vendedora.meta > 0 ? (vendedora.vendas / vendedora.meta) * 100 : 0;
            const percentTaxa = vendedora.vendas > 0 ? (vendedora.taxa / vendedora.vendas) * 100 : 0;

            const medalColors = [
              'bg-amber-400 text-slate-950 font-black', // Ouro
              'bg-slate-300 text-slate-900 font-bold',  // Prata
              'bg-amber-700 text-amber-100 font-bold',  // Bronze
            ];

            return (
              <div
                key={vendedora.nome}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${index < 3 ? medalColors[index] : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {index + 1}º
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {vendedora.nome}
                      </p>
                      <p className="text-xs text-slate-500">
                        {vendedora.count} contratos · Taxa: {formatCurrency(vendedora.taxa)} ({formatPercent(percentTaxa)})
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(vendedora.vendas)}
                    </p>
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatPercent(percentualAtingido)} da meta
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percentualAtingido >= 100
                        ? 'bg-emerald-500'
                        : percentualAtingido >= 70
                        ? 'bg-teal-600'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, percentualAtingido)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Produtividade de Digitação de Propostas & Simulações Realizadas */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-600" />
              <span>Produtividade de Digitação: Propostas por Colaborador</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quantas propostas e simulações cada um digitou no período selecionado.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 text-xs font-bold flex items-center gap-1.5">
              <span>Simulações Realizadas:</span>
              <span className="text-sm font-black text-cyan-900 dark:text-cyan-200 tabular-nums">
                {digitacaoStats.totalSimulacoesLoja}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5">
              <span>Total Digitadas:</span>
              <span className="text-sm font-black text-teal-900 dark:text-teal-200 tabular-nums">
                {digitacaoStats.totalDigitadas}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Colaborador / Quem Digitou</th>
                <th className="py-2.5 px-3">Perfil</th>
                <th className="py-2.5 px-3 text-center">Propostas Digitadas</th>
                <th className="py-2.5 px-3 text-center">Simulações</th>
                <th className="py-2.5 px-3 text-right">Volume Digitado (R$)</th>
                <th className="py-2.5 px-3 text-right">Participação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {digitacaoStats.list.map((item) => (
                <tr key={item.nome} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[10px] shrink-0 ${
                        item.isDigitadoraDedicada
                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200'
                          : 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200'
                      }`}>
                        {item.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.nome}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.isDigitadoraDedicada
                        ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {item.isDigitadoraDedicada ? 'Digitadora Dedicada' : 'Vendedora'}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white text-xs tabular-nums">
                      {item.propostas} propostas
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center tabular-nums font-bold text-cyan-700 dark:text-cyan-300">
                    {item.simulacoes}
                  </td>

                  <td className="py-3 px-3 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(item.volume)}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.isDigitadoraDedicada ? 'bg-cyan-500' : 'bg-teal-600'}`}
                          style={{ width: `${Math.min(100, item.share)}%` }}
                        />
                      </div>
                      <span className="text-slate-500 font-bold tabular-nums w-9 text-right text-[11px]">
                        {item.share.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 12-Month Financial Evolution Line Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Evolução Histórica (Últimos 12 Meses)
            </h2>
            <p className="text-xs text-slate-500">
              Trajetória consolidada de Vendas Totais, Faturamento e Lucro Líquido
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-teal-600">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600" /> Vendas
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Faturamento
            </span>
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Lucro
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolution12Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="vendasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stop-color="#0F5C63" stopOpacity={0.4} />
                  <stop offset="95%" stop-color="#0F5C63" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stop-color="#F5B700" stopOpacity={0.4} />
                  <stop offset="95%" stop-color="#F5B700" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`} stroke="#94a3b8" />
              <Tooltip
                formatter={(value: any) => [formatCurrency(Number(value)), '']}
                contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="vendas" name="Vendas" stroke="#0F5C63" strokeWidth={2.5} fillOpacity={1} fill="url(#vendasGrad)" />
              <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#F5B700" strokeWidth={2} fillOpacity={1} fill="url(#fatGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Sales by Product/Operation & Promotoras Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Operations Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Vendas por Produto & Operação
              </h3>
              <p className="text-xs text-slate-500">
                Volume contratado e % média de taxa cobrada
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {operationsChartData.map((op) => (
              <div
                key={op.operacao}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {op.operacao}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {op.count} contratos · Taxa: {formatCurrency(op.taxa)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(op.vendas)}
                  </p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    {formatPercent(op.percentualTaxa)} taxa
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Promotoras & Banks */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Volume por Promotora Parceira
              </h3>
              <p className="text-xs text-slate-500">
                Distribuição de esteiras de crédito formalizadas
              </p>
            </div>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={promotorasChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="promotora" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} stroke="#94a3b8" />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Volume']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="vendas" radius={[6, 6, 0, 0]}>
                  {promotorasChartData.map((_, idx) => (
                    <Cell key={idx} fill={idx === 0 ? '#0B2A4A' : idx === 1 ? '#0F5C63' : idx === 2 ? '#1B8A8F' : '#F5B700'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rentabilidade por Funcionário (Taxa + Comissão - Custo) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Rentabilidade Líquida por Atendente
            </h3>
            <p className="text-xs text-slate-500">
              Taxa Arrecadada + Comissão de Promotora Gerada − Custo do Funcionário
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Atendente</th>
                <th className="py-2.5 px-3 text-right">Vendas (R$)</th>
                <th className="py-2.5 px-3 text-right">Taxas (R$)</th>
                <th className="py-2.5 px-3 text-right">Comissão Prom.</th>
                <th className="py-2.5 px-3 text-right">Custo Fixo</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-white">Lucro Gerado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {employeeProfitability.map((emp) => (
                <tr key={emp.nome} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                    {emp.nome}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(emp.vendas)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(emp.taxas)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-blue-600 dark:text-blue-400">{formatCurrency(emp.comissaoPromotora)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-rose-500">-{formatCurrency(emp.custo)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(emp.rentabilidadeLiquida)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row: Cancelamentos/Reprovações + Oportunidades de Portabilidade Teaser */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cancelamentos */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Cancelamentos e Reprovações
              </h3>
            </div>
            <span className="text-xs font-bold text-rose-600">
              {canceladasOuReprovadas.length} contratos ({formatCurrency(totalCancelado)})
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {canceladasOuReprovadas.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhum contrato cancelado no período selecionado.</p>
            ) : (
              canceladasOuReprovadas.map((c) => (
                <div key={c.id} className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-white">{c.nomeCliente}</span>
                    <span className="text-rose-600 font-bold tabular-nums">{formatCurrency(c.valorEmprestimo)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {c.banco} · {c.operacao} · Vendedora: {c.vendedora}
                  </p>
                  {c.motivoCancelamento && (
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1 italic">
                      Motivo: {c.motivoCancelamento}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Oportunidades de Portabilidade Teaser */}
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 rounded-3xl p-5 border border-teal-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Motor de Oportunidades
              </span>
              <span className="text-xs font-extrabold text-amber-600 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                {alertas.length} Clientes Aptos
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Oportunidades de Portabilidade & Refin
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              O CRM monitorou automaticamente clientes com contratos consignados pagos há mais de 12 meses. Oportunidade de liberar troco em dinheiro e gerar novas taxas.
            </p>

            <div className="mt-4 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-teal-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Potencial estimado de vendas nesta carteira:
              </p>
              <p className="text-xl font-black text-teal-700 dark:text-teal-400 tabular-nums">
                R$ 148.500,00
              </p>
              <p className="text-[11px] text-slate-500">Estimativa de R$ 17.800,00 em novas taxas líquidas.</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-teal-100 dark:border-slate-700 flex items-center justify-end">
            <button
              onClick={onNavigateToAlertas}
              className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300 hover:underline"
            >
              <span>Ver todas as oportunidades</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal (When user taps ANY card or graphic to see the contracts list) */}
      {detailModalTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {detailModalTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {detailModalContracts.length} contratos listados neste agrupamento
                </p>
              </div>
              <button
                onClick={() => setDetailModalTitle(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2 px-2">Data</th>
                    <th className="py-2 px-2">Cliente</th>
                    <th className="py-2 px-2">Operação</th>
                    <th className="py-2 px-2">Banco</th>
                    <th className="py-2 px-2 text-right">Venda (R$)</th>
                    <th className="py-2 px-2 text-right">Taxa (R$)</th>
                    <th className="py-2 px-2">Vendedora</th>
                    <th className="py-2 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {detailModalContracts.map((prop) => (
                    <tr key={prop.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-2 tabular-nums text-slate-500">{formatDate(prop.dataDigitacao)}</td>
                      <td className="py-2 px-2 font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                        {prop.nomeCliente}
                      </td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{prop.operacao}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{prop.banco}</td>
                      <td className="py-2 px-2 text-right font-bold tabular-nums">{formatCurrency(prop.valorEmprestimo)}</td>
                      <td className="py-2 px-2 text-right font-bold text-amber-600 tabular-nums">{formatCurrency(prop.valorTaxa)}</td>
                      <td className="py-2 px-2 text-slate-500 truncate max-w-[100px]">{prop.vendedora}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          prop.status === 'Paga' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          prop.status === 'Aprovada' ? 'bg-blue-100 text-blue-800' :
                          prop.status === 'Pendente' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {prop.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setDetailModalTitle(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-teal-600 text-white font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Resumo Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Compartilhar Resumo no WhatsApp
                </h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2">
                Texto formatado pronto para enviar à Lívia ou no grupo da diretoria:
              </p>
              <textarea
                readOnly
                value={generateWhatsAppSummary()}
                rows={11}
                className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-sm transition-all"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Copiado com sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
