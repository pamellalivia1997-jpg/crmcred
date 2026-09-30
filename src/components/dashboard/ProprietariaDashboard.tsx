import React, { useState, useMemo, useEffect } from 'react';
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
  Calculator,
  ChevronDown
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
import { formatCurrency, formatPercent, formatDate, normalizeSellerName } from '../../utils/formatters';
import { DetalhePropostaModal } from '../propostas/DetalhePropostaModal';

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
  const {
    propostas,
    comissoesPromotoras,
    contasPagar,
    metas,
    alertas,
    periodo,
    setPeriodo,
    anoSelecionado,
    setAnoSelecionado,
    dataInicioPersonalizada,
    setDataInicioPersonalizada,
    dataFimPersonalizada,
    setDataFimPersonalizada
  } = useCRM();
  const { allUsers } = useAuth();

  // Submenu state for touch/mobile and desktop click
  const [openSubmenu, setOpenSubmenu] = useState<'semana' | 'mes' | 'ano' | null>(null);
  const filterContainerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (filterContainerRef.current && !filterContainerRef.current.contains(event.target as Node)) {
        setOpenSubmenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // State for detail modal when user taps an element if needed
  const [detailModalTitle, setDetailModalTitle] = useState<string | null>(null);
  const [detailModalContracts, setDetailModalContracts] = useState<Proposta[]>([]);
  const [selectedSellerName, setSelectedSellerName] = useState<string | null>(null);
  const [selectedSellerProposals, setSelectedSellerProposals] = useState<Proposta[]>([]);
  const [selectedProposalDetail, setSelectedProposalDetail] = useState<Proposta | null>(null);

  // Dynamically adapt baseDate based on current date and latest proposal date
  const baseDateInfo = useMemo(() => {
    const now = new Date();
    const safeYr = now.getFullYear();
    const safeMo = now.getMonth() + 1;
    const safeDy = now.getDate();

    const todayStr = `${safeYr}-${String(safeMo).padStart(2, '0')}-${String(safeDy).padStart(2, '0')}`;
    
    // Format helper for year-month strings
    const getYearMonthStr = (year: number, month: number) => {
      const m = String(month).padStart(2, '0');
      return `${year}-${m}`;
    };

    const currentMonthStr = getYearMonthStr(safeYr, safeMo); // YYYY-MM
    
    // Previous month
    let prevMo = safeMo - 1;
    let prevYr = safeYr;
    if (prevMo === 0) {
      prevMo = 12;
      prevYr -= 1;
    }
    const prevMonthStr = getYearMonthStr(prevYr, prevMo);

    // Month before previous
    let prev2Mo = prevMo - 1;
    let prev2Yr = prevYr;
    if (prev2Mo === 0) {
      prev2Mo = 12;
      prev2Yr -= 1;
    }
    const prev2MonthsStr = getYearMonthStr(prev2Yr, prev2Mo);

    // Domingo da semana atual
    const dayOfWeek = now.getDay(); // 0 = Domingo
    const sundayCurrent = new Date(now);
    sundayCurrent.setDate(now.getDate() - dayOfWeek);
    const sundayCurrentStr = `${sundayCurrent.getFullYear()}-${String(sundayCurrent.getMonth() + 1).padStart(2, '0')}-${String(sundayCurrent.getDate()).padStart(2, '0')}`;

    // Sexta-feira anterior (2 dias antes do Domingo da semana atual)
    const lastFriday = new Date(sundayCurrent);
    lastFriday.setDate(sundayCurrent.getDate() - 2);
    const lastFridayStr = `${lastFriday.getFullYear()}-${String(lastFriday.getMonth() + 1).padStart(2, '0')}-${String(lastFriday.getDate()).padStart(2, '0')}`;

    // Domingo anterior ao domingo atual (7 dias antes)
    const prevSunday = new Date(sundayCurrent);
    prevSunday.setDate(sundayCurrent.getDate() - 7);
    const prevSundayStr = `${prevSunday.getFullYear()}-${String(prevSunday.getMonth() + 1).padStart(2, '0')}-${String(prevSunday.getDate()).padStart(2, '0')}`;

    // Sexta-feira da semana anterior (9 dias antes do domingo atual)
    const prevFriday = new Date(sundayCurrent);
    prevFriday.setDate(sundayCurrent.getDate() - 9);
    const prevFridayStr = `${prevFriday.getFullYear()}-${String(prevFriday.getMonth() + 1).padStart(2, '0')}-${String(prevFriday.getDate()).padStart(2, '0')}`;

    return {
      todayStr,
      sundayCurrentStr,
      lastFridayStr,
      prevSundayStr,
      prevFridayStr,
      currentMonthStr,
      prevMonthStr,
      prev2MonthsStr,
      yearStr: String(safeYr)
    };
  }, []);

  // Filter propostas by period
  const filteredPropostas = useMemo(() => {
    return propostas.filter(p => {
      const d = p.dataDigitacao;
      if (!d) return false;

      if (periodo === 'hoje') {
        return d === baseDateInfo.todayStr;
      }
      if (periodo === 'semana') {
        // Obrigatório: do Domingo da semana atual até a data atual (hoje)
        return d >= baseDateInfo.sundayCurrentStr && d <= baseDateInfo.todayStr;
      }
      if (periodo === 'semana_anterior') {
        // "Semana Anterior" (definida da sexta-feira anterior até o domingo anterior)
        return (
          (d >= baseDateInfo.lastFridayStr && d <= baseDateInfo.sundayCurrentStr) ||
          (d >= baseDateInfo.prevFridayStr && d <= baseDateInfo.prevSundayStr) ||
          (d >= baseDateInfo.prevSundayStr && d <= baseDateInfo.sundayCurrentStr)
        );
      }
      if (periodo === 'mes') {
        return d.startsWith(baseDateInfo.currentMonthStr);
      }
      if (periodo === 'mes_anterior') {
        return d.startsWith(baseDateInfo.prevMonthStr);
      }
      if (periodo === 'ultimos_3_meses') {
        return (
          d.startsWith(baseDateInfo.currentMonthStr) ||
          d.startsWith(baseDateInfo.prevMonthStr) ||
          d.startsWith(baseDateInfo.prev2MonthsStr)
        );
      }
      if (periodo === 'ano') {
        const targetYear = String(anoSelecionado || 2026);
        return d.startsWith(targetYear);
      }
      if (periodo === 'personalizado') {
        const start = dataInicioPersonalizada || '2020-01-01';
        const end = dataFimPersonalizada || '2030-12-31';
        return d >= start && d <= end;
      }
      return true;
    });
  }, [propostas, periodo, baseDateInfo, anoSelecionado, dataInicioPersonalizada, dataFimPersonalizada]);

  // Previous month for comparative deltas
  const prevMonthPropostas = useMemo(() => {
    return propostas.filter(p => p.dataDigitacao.startsWith(baseDateInfo.prevMonthStr) && p.status === 'Paga');
  }, [propostas, baseDateInfo]);

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
    const paidIds = new Set(paidPropostas.map(p => p.id));
    return comissoesPromotoras
      .filter(c => paidIds.has(c.propostaId) && c.status === 'confirmada')
      .reduce((acc, c) => acc + c.valorRecebido, 0);
  }, [paidPropostas, comissoesPromotoras]);

  const faturamentoBruto = totalTaxas + totalComissoesPromotoras;

  // Expenses in current period
  const totalDespesas = useMemo(() => {
    const cp = contasPagar.filter(c => {
      if (periodo === 'hoje' || periodo === 'semana' || periodo === 'semana_anterior') return c.status === 'pendente';
      if (periodo === 'mes_anterior') return c.vencimento.startsWith(baseDateInfo.prevMonthStr);
      if (periodo === 'ultimos_3_meses') {
        return (
          c.vencimento.startsWith(baseDateInfo.currentMonthStr) ||
          c.vencimento.startsWith(baseDateInfo.prevMonthStr) ||
          c.vencimento.startsWith(baseDateInfo.prev2MonthsStr)
        );
      }
      if (periodo === 'personalizado') {
        const start = dataInicioPersonalizada || '2020-01-01';
        const end = dataFimPersonalizada || '2030-12-31';
        return c.vencimento >= start && c.vencimento <= end;
      }
      return c.vencimento.startsWith(baseDateInfo.currentMonthStr);
    });
    const billsTotal = cp.reduce((acc, c) => acc + c.valor, 0);
    const teamSalaries = periodo === 'semana' || periodo === 'semana_anterior' ? 3375 : 13500;
    return billsTotal + teamSalaries;
  }, [contasPagar, periodo, baseDateInfo, dataInicioPersonalizada, dataFimPersonalizada]);

  const lucroLiquido = faturamentoBruto - totalDespesas;
  const margemLucro = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;
  const ticketMedio = paidPropostas.length > 0 ? totalVendas / paidPropostas.length : 0;
  const percentualMedioTaxa = totalVendas > 0 ? (totalTaxas / totalVendas) * 100 : 0;

  // Comparative period deltas
  const { prevPeriodVendas, prevPeriodTaxas, deltaLabel } = useMemo(() => {
    let prevProps: Proposta[] = [];
    let label = 'vs mês ant.';

    if (periodo === 'hoje') {
      const yesterday = new Date(baseDateInfo.todayStr);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      prevProps = propostas.filter(p => p.dataDigitacao === yStr && p.status === 'Paga');
      label = 'vs ontem';
    } else if (periodo === 'semana') {
      // Semana anterior
      prevProps = propostas.filter(p => {
        const d = p.dataDigitacao;
        return (
          p.status === 'Paga' &&
          ((d >= baseDateInfo.lastFridayStr && d <= baseDateInfo.sundayCurrentStr) ||
           (d >= baseDateInfo.prevFridayStr && d <= baseDateInfo.prevSundayStr) ||
           (d >= baseDateInfo.prevSundayStr && d <= baseDateInfo.sundayCurrentStr))
        );
      });
      label = 'vs semana ant.';
    } else if (periodo === 'semana_anterior') {
      label = 'vs semana ant.';
    } else if (periodo === 'mes') {
      prevProps = propostas.filter(p => p.dataDigitacao.startsWith(baseDateInfo.prevMonthStr) && p.status === 'Paga');
      label = 'vs mês ant.';
    } else if (periodo === 'mes_anterior') {
      prevProps = propostas.filter(p => p.dataDigitacao.startsWith(baseDateInfo.prev2MonthsStr) && p.status === 'Paga');
      label = 'vs mês ant.';
    } else if (periodo === 'ultimos_3_meses') {
      label = 'vs período ant.';
    } else if (periodo === 'ano') {
      const prevYear = String((anoSelecionado || 2026) - 1);
      prevProps = propostas.filter(p => p.dataDigitacao.startsWith(prevYear) && p.status === 'Paga');
      label = 'vs ano ant.';
    } else {
      label = 'vs período ant.';
    }

    const pVendas = prevProps.reduce((acc, p) => acc + (p.valorEmprestimo || 0), 0);
    const pTaxas = prevProps.reduce((acc, p) => acc + (p.valorTaxa || 0), 0);
    return { prevPeriodVendas: pVendas, prevPeriodTaxas: pTaxas, deltaLabel: label };
  }, [propostas, periodo, baseDateInfo, anoSelecionado]);

  const deltaVendas = prevPeriodVendas > 0 ? ((totalVendas - prevPeriodVendas) / prevPeriodVendas) * 100 : 0;

  // Active saleswomen list (only role === 'vendedora', active status, and not inactivated in month)
  const activeSellers = useMemo(() => {
    return allUsers.filter(u => {
      if (u.role !== 'vendedora') return false;
      if (u.status !== 'ativo') return false;
      const foundMeta = metas.find(m => (m.vendedoraId === u.id || normalizeSellerName(m.vendedoraNome) === normalizeSellerName(u.name)) && m.mesAno === baseDateInfo.currentMonthStr);
      if (foundMeta && foundMeta.isAtivoNoMes === false) return false;
      return true;
    });
  }, [allUsers, metas, baseDateInfo]);

  // Store meta sum calculation based on individual saleswomen targets (ONLY users with role === 'vendedora')
  const storeMetaMonthly = useMemo(() => {
    const reps = activeSellers.map(u => normalizeSellerName(u.name)).filter(n => n && n !== 'Outros');
    
    let sum = 0;
    reps.forEach(nome => {
      const foundMeta = metas.find(m => normalizeSellerName(m.vendedoraNome) === normalizeSellerName(nome) && m.mesAno === baseDateInfo.currentMonthStr);
      if (foundMeta && foundMeta.metaVenda > 0) {
        sum += foundMeta.metaVenda;
      } else {
        const foundUser = allUsers.find(u => normalizeSellerName(u.name) === normalizeSellerName(nome));
        if (foundUser && foundUser.monthlySalesGoal && foundUser.monthlySalesGoal > 0) {
          sum += foundUser.monthlySalesGoal;
        } else {
          // Fallbacks for known sellers, Balcão is 0
          if (normalizeSellerName(nome).includes('IGARASSU') || normalizeSellerName(nome).includes('LOJA')) {
            sum += 0;
          } else {
            const defaults: Record<string, number> = {
              'Bianca': 85000,
              'Hellen Vasconcelos': 95000,
              'Taciana Silva': 80000,
              'Lucélia Ramos': 75000
            };
            sum += defaults[nome] || 80000;
          }
        }
      }
    });
    return sum > 0 ? sum : 335000;
  }, [activeSellers, metas, allUsers, baseDateInfo]);

  const metaLoja = useMemo(() => {
    let periodMultiplier = 1;
    if (periodo === 'hoje') periodMultiplier = 1 / 30;
    else if (periodo === 'semana' || periodo === 'semana_anterior') periodMultiplier = 7 / 30;
    else if (periodo === 'mes' || periodo === 'mes_anterior') periodMultiplier = 1;
    else if (periodo === 'ultimos_3_meses') periodMultiplier = 3;
    else if (periodo === 'ano') periodMultiplier = 12;
    else if (periodo === 'personalizado') {
      const startMs = new Date(dataInicioPersonalizada || '2026-09-01').getTime();
      const endMs = new Date(dataFimPersonalizada || '2026-09-30').getTime();
      const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
      periodMultiplier = diffDays / 30;
    }
    return storeMetaMonthly * periodMultiplier;
  }, [storeMetaMonthly, periodo, dataInicioPersonalizada, dataFimPersonalizada]);

  const atingimentoMeta = metaLoja > 0 ? (totalVendas / metaLoja) * 100 : 0;
  const quantoFalta = Math.max(0, metaLoja - totalVendas);

  // Ranking of sales reps (ONLY active users registered as 'vendedora'; everything else goes to 'Outros')
  const rankingVendedoras = useMemo(() => {
    const sellersMap = new Map<string, { nome: string; vendas: number; taxa: number; count: number; meta: number }>();

    // Dynamic list of active registered vendedoras ONLY
    const reps = activeSellers.map(u => normalizeSellerName(u.name)).filter(n => n && n !== 'Outros');
    
    // Period multiplier for scaling
    let periodMultiplier = 1;
    if (periodo === 'hoje') periodMultiplier = 1 / 30;
    else if (periodo === 'semana' || periodo === 'semana_anterior') periodMultiplier = 7 / 30;
    else if (periodo === 'mes' || periodo === 'mes_anterior') periodMultiplier = 1;
    else if (periodo === 'ultimos_3_meses') periodMultiplier = 3;
    else if (periodo === 'ano') periodMultiplier = 12;
    else if (periodo === 'personalizado') {
      const startMs = new Date(dataInicioPersonalizada || '2026-09-01').getTime();
      const endMs = new Date(dataFimPersonalizada || '2026-09-30').getTime();
      const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
      periodMultiplier = diffDays / 30;
    }

    const currentMonth = baseDateInfo.currentMonthStr;

    const getUserBaseMonthlyGoal = (name: string): number => {
      const foundMeta = metas.find(m => normalizeSellerName(m.vendedoraNome) === normalizeSellerName(name) && m.mesAno === currentMonth);
      if (foundMeta && foundMeta.metaVenda > 0) return foundMeta.metaVenda;
      
      const foundUser = allUsers.find(u => normalizeSellerName(u.name) === normalizeSellerName(name));
      if (foundUser && foundUser.monthlySalesGoal && foundUser.monthlySalesGoal > 0) return foundUser.monthlySalesGoal;
      
      if (normalizeSellerName(name).includes('IGARASSU') || normalizeSellerName(name).includes('LOJA')) return 0;
      
      const defaults: Record<string, number> = {
        'Bianca': 85000,
        'Hellen Vasconcelos': 95000,
        'Taciana Silva': 80000,
        'Lucélia Ramos': 75000
      };
      return defaults[name] || 80000;
    };

    reps.forEach(nome => {
      const baseMonthlyGoal = getUserBaseMonthlyGoal(nome);
      const scaledMeta = baseMonthlyGoal * periodMultiplier;
      sellersMap.set(nome, { nome, vendas: 0, taxa: 0, count: 0, meta: scaledMeta });
    });

    const recognizedRepsSet = new Set(reps);

    let outrosVendas = 0;
    let outrosTaxa = 0;
    let outrosCount = 0;

    paidPropostas.forEach(p => {
      const normName = normalizeSellerName(p.vendedora);
      if (!normName || normName === 'Outros' || !recognizedRepsSet.has(normName)) {
        // Collect into generic "Outros" for non-vendedoras/unassigned
        outrosVendas += p.valorEmprestimo;
        outrosTaxa += p.valorTaxa;
        outrosCount += 1;
        return;
      }

      const rep = sellersMap.get(normName);
      if (rep) {
        rep.vendas += p.valorEmprestimo;
        rep.taxa += p.valorTaxa;
        rep.count += 1;
      }
    });

    if (outrosCount > 0) {
      sellersMap.set('Outros', {
        nome: 'Outros',
        vendas: outrosVendas,
        taxa: outrosTaxa,
        count: outrosCount,
        meta: 0
      });
    }

    return Array.from(sellersMap.values()).sort((a, b) => b.vendas - a.vendas);
  }, [paidPropostas, activeSellers, metas, allUsers, periodo, baseDateInfo, dataInicioPersonalizada, dataFimPersonalizada]);

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
      const isOutros = seller.nome === 'Outros';
      const user = allUsers.find(u => u.name === seller.nome);
      const custo = isOutros ? 0 : (user?.baseSalaryCost || 2200);
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

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Top Header Controls: Title & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Painel Gerencial
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento em tempo real de faturamento, comissões, ranking e rentabilidade.
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div ref={filterContainerRef} className="flex items-center gap-1.5 overflow-visible relative">
          {/* 1. Hoje */}
          <button
            type="button"
            onClick={() => {
              setPeriodo('hoje');
              setOpenSubmenu(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              periodo === 'hoje'
                ? 'bg-[#0B2A4A] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Hoje
          </button>

          {/* 2. Semana */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenSubmenu(prev => (prev === 'semana' ? null : 'semana'));
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                periodo === 'semana' || periodo === 'semana_anterior'
                  ? 'bg-[#0B2A4A] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{periodo === 'semana_anterior' ? 'Semana Anterior' : 'Semana'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSubmenu === 'semana' ? 'rotate-180' : ''}`} />
            </button>

            {openSubmenu === 'semana' && (
              <div className="absolute top-full left-0 mt-1.5 z-[70] min-w-[160px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setPeriodo('semana');
                    setOpenSubmenu(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    periodo === 'semana'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Semana Atual</span>
                  {periodo === 'semana' && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodo('semana_anterior');
                    setOpenSubmenu(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    periodo === 'semana_anterior'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Semana Anterior</span>
                  {periodo === 'semana_anterior' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* 3. Este Mês */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenSubmenu(prev => (prev === 'mes' ? null : 'mes'));
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                periodo === 'mes' || periodo === 'mes_anterior' || periodo === 'ultimos_3_meses'
                  ? 'bg-[#0B2A4A] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>
                {periodo === 'mes_anterior' ? 'Mês Anterior' : periodo === 'ultimos_3_meses' ? '3 Meses' : 'Este Mês'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSubmenu === 'mes' ? 'rotate-180' : ''}`} />
            </button>

            {openSubmenu === 'mes' && (
              <div className="absolute top-full left-0 mt-1.5 z-[70] min-w-[170px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setPeriodo('mes');
                    setOpenSubmenu(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    periodo === 'mes'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Este Mês</span>
                  {periodo === 'mes' && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodo('mes_anterior');
                    setOpenSubmenu(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    periodo === 'mes_anterior'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Mês Anterior</span>
                  {periodo === 'mes_anterior' && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodo('ultimos_3_meses');
                    setOpenSubmenu(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    periodo === 'ultimos_3_meses'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Últimos 3 Meses</span>
                  {periodo === 'ultimos_3_meses' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* 4. Filtro de Ano */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenSubmenu(prev => (prev === 'ano' ? null : 'ano'));
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                periodo === 'ano'
                  ? 'bg-[#0B2A4A] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{periodo === 'ano' && anoSelecionado ? String(anoSelecionado) : '2026'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSubmenu === 'ano' ? 'rotate-180' : ''}`} />
            </button>

            {openSubmenu === 'ano' && (
              <div className="absolute top-full left-0 mt-1.5 z-[70] min-w-[130px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                {[2026, 2025, 2024, 2023, 2022].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setAnoSelecionado(yr);
                      setPeriodo('ano');
                      setOpenSubmenu(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                      periodo === 'ano' && (anoSelecionado === yr || (!anoSelecionado && yr === 2026))
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{yr}</span>
                    {periodo === 'ano' && (anoSelecionado === yr || (!anoSelecionado && yr === 2026)) && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5. Personalizado */}
          <button
            type="button"
            onClick={() => {
              setPeriodo('personalizado');
              setOpenSubmenu(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              periodo === 'personalizado'
                ? 'bg-[#0B2A4A] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Personalizado</span>
          </button>
        </div>

          {/* Inline Date Range Picker for "Personalizado" */}
          {periodo === 'personalizado' && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs animate-in fade-in duration-150">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#0F5C63]" />
                <span>Período:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-semibold">De</span>
                <input
                  type="date"
                  value={dataInicioPersonalizada}
                  onChange={(e) => setDataInicioPersonalizada(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-semibold">Até</span>
                <input
                  type="date"
                  value={dataFimPersonalizada}
                  onChange={(e) => setDataFimPersonalizada(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                ({filteredPropostas.length} contratos localizados)
              </span>
            </div>
          )}
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

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Vendas Totais */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Vendas Totais</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#0F5C63] dark:text-[#28B0B7] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
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
            <span className="text-slate-400">{deltaLabel}</span>
          </div>
        </div>

        {/* Card 2: Taxas Recebidas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Taxas Recebidas</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Comissões Promotoras</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(totalComissoesPromotoras)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            J2, Sempre, DG & GFT
          </p>
        </div>

        {/* Card 4: Faturamento Bruto */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
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
            const metaVenda = vendedora.meta > 0 ? vendedora.meta : 80000;
            const metaTaxa = metaVenda * 0.20; // 20% of sales goal as requested

            const percentualVenda = metaVenda > 0 ? (vendedora.vendas / metaVenda) * 100 : 0;
            const percentualTaxaGoal = metaTaxa > 0 ? (vendedora.taxa / metaTaxa) * 100 : 0;

            const formatCompactMeta = (val: number) => {
              if (val === 0) return '0';
              return val >= 1000 ? `${(val / 1000).toFixed(0)}k` : formatCurrency(val);
            };

            const medalColors = [
              'bg-amber-400 text-slate-950 font-black', // Ouro
              'bg-slate-300 text-slate-900 font-bold',  // Prata
              'bg-amber-700 text-amber-100 font-bold',  // Bronze
            ];

            return (
              <div
                key={vendedora.nome}
                onClick={() => {
                  const recognizedRepsSet = new Set(activeSellers.map(u => normalizeSellerName(u.name)).filter(n => n && n !== 'Outros'));
                  const propsForSeller = vendedora.nome === 'Outros'
                    ? filteredPropostas.filter(p => {
                        const norm = normalizeSellerName(p.vendedora);
                        return !norm || norm === 'Outros' || !recognizedRepsSet.has(norm);
                      })
                    : filteredPropostas.filter(p => normalizeSellerName(p.vendedora) === vendedora.nome);
                  setSelectedSellerName(vendedora.nome);
                  setSelectedSellerProposals(propsForSeller);
                }}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all duration-150 hover:shadow-xs hover:scale-[1.005]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                      vendedora.nome === 'Outros'
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : index < 3
                        ? medalColors[index]
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {vendedora.nome === 'Outros' ? '•' : `${index + 1}º`}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span>{vendedora.nome}</span>
                        {vendedora.nome === 'Outros' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            Histórico
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {vendedora.count} contratos no período
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 text-xs leading-normal">
                    {vendedora.nome === 'Outros' ? (
                      <>
                        <p className="text-slate-500 font-semibold flex items-center gap-1.5 sm:justify-end">
                          <span>Total Vendas:</span>
                          <span className="font-black text-[#0F5C63] dark:text-[#28B0B7]">{formatCurrency(vendedora.vendas)}</span>
                        </p>
                        <p className="text-slate-500 font-semibold mt-1 flex items-center gap-1.5 sm:justify-end">
                          <span>Taxa Total:</span>
                          <span className="font-black text-amber-600 dark:text-amber-400">{formatCurrency(vendedora.taxa)}</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-slate-500 font-semibold flex items-center gap-1.5 sm:justify-end">
                          <span>Pagos:</span>
                          <span className="font-black text-[#0F5C63] dark:text-[#28B0B7]">{formatCurrency(vendedora.vendas)}</span>
                        </p>
                        <p className="text-slate-500 font-semibold mt-1 flex items-center gap-1.5 sm:justify-end">
                          <span>Taxa:</span>
                          <span className="font-black text-amber-600 dark:text-amber-400">{formatCurrency(vendedora.taxa)}</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bars (only for individual saleswomen with goals) */}
                {vendedora.nome !== 'Outros' ? (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    {/* Bar 1: Total Liberado */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 w-12 sm:w-16 shrink-0">Vendas</span>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden relative">
                        <div
                          className="h-full rounded-full bg-[#0F5C63] transition-all duration-500"
                          style={{ width: `${Math.min(100, percentualVenda)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-teal-700 dark:text-teal-400 w-10 text-right tabular-nums">
                        {percentualVenda.toFixed(0)}%
                      </span>
                    </div>

                    {/* Bar 2: Taxa Arrecadada */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 w-12 sm:w-16 shrink-0">Taxa</span>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden relative">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, percentualTaxaGoal)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 w-10 text-right tabular-nums">
                        {percentualTaxaGoal.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Contratos de balcão / ex-colaboradores / canais externos</span>
                    <span className="font-bold text-teal-700 dark:text-teal-400">Ver contratos ➔</span>
                  </div>
                )}
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
                  {detailModalContracts.length} contratos listados • <span className="text-teal-600 dark:text-teal-400 font-semibold">Clique na linha para abrir a proposta</span>
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
                    <tr
                      key={prop.id}
                      onClick={() => setSelectedProposalDetail(prop)}
                      className="hover:bg-teal-50/80 dark:hover:bg-teal-950/40 cursor-pointer transition-colors group"
                      title="Clique para ver os detalhes da proposta"
                    >
                      <td className="py-2.5 px-2 tabular-nums text-slate-500">{formatDate(prop.dataDigitacao)}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-white truncate max-w-[140px] group-hover:text-teal-700 dark:group-hover:text-teal-300">
                        {prop.nomeCliente}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">{prop.operacao}</td>
                      <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">{prop.banco}</td>
                      <td className="py-2.5 px-2 text-right font-bold tabular-nums">{formatCurrency(prop.valorEmprestimo)}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-amber-600 tabular-nums">{formatCurrency(prop.valorTaxa)}</td>
                      <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[110px]">
                        {prop.vendedora || 'Não informado'}
                      </td>
                      <td className="py-2.5 px-2 text-center">
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

      {/* Detail Modal (When user clicks a salesperson in the ranking list) */}
      {selectedSellerName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Produção de {selectedSellerName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedSellerProposals.length} contratos formalizados • <span className="text-teal-600 dark:text-teal-400 font-semibold">Clique na linha para abrir a proposta</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedSellerName(null)}
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
                    <th className="py-2 px-2 text-right">Liberado (R$)</th>
                    <th className="py-2 px-2 text-right">Taxa (R$)</th>
                    <th className="py-2 px-2">Vendedora</th>
                    <th className="py-2 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedSellerProposals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-slate-400">Nenhum contrato encontrado para este filtro no período.</td>
                    </tr>
                  ) : (
                    selectedSellerProposals.map((prop) => (
                      <tr
                        key={prop.id}
                        onClick={() => setSelectedProposalDetail(prop)}
                        className="hover:bg-teal-50/80 dark:hover:bg-teal-950/40 cursor-pointer transition-colors group"
                        title="Clique para ver os detalhes da proposta"
                      >
                        <td className="py-2.5 px-2 tabular-nums text-slate-500">{formatDate(prop.dataDigitacao)}</td>
                        <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-white truncate max-w-[140px] group-hover:text-teal-700 dark:group-hover:text-teal-300">
                          {prop.nomeCliente}
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">{prop.operacao}</td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">{prop.banco}</td>
                        <td className="py-2.5 px-2 text-right font-bold tabular-nums text-teal-600">{formatCurrency(prop.valorEmprestimo)}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-amber-600 tabular-nums">{formatCurrency(prop.valorTaxa)}</td>
                        <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[110px]">
                          {prop.vendedora || selectedSellerName}
                        </td>
                        <td className="py-2.5 px-2 text-center">
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedSellerName(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-teal-600 text-white font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Detail Full Modal */}
      {selectedProposalDetail && (
        <DetalhePropostaModal
          proposta={selectedProposalDetail}
          onClose={() => setSelectedProposalDetail(null)}
        />
      )}
    </div>
  );
};
