import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  FileSpreadsheet,
  Calculator,
  ChevronDown,
  Settings,
  Sliders,
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
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
  X
} from 'lucide-react';
import { SystemHealthIndicator } from '../common/SystemHealthIndicator';
import { SmartFilter } from '../common/SmartFilter';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatPercent, formatDate, normalizeSellerName, getMonthYearLabel, isSameSeller } from '../../utils/formatters';
import { matchesSeller, isTaxaPaga } from '../../utils/dashboardCalculations';
import type { Proposta, StatusProposta, Operacao, Banco, Promotora } from '../../types/models';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  BarChart,
  Bar
} from 'recharts';
import { DetalhePropostaModal } from '../propostas/DetalhePropostaModal';
import { calculateTotalExpensesFromSheet } from '../../services/expensesSheetService';

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
    sheetExpenses,
    metas,
    alertas,
    periodo,
    setPeriodo,
    filtroMesAno,
    setFiltroMesAno,
    anoSelecionado,
    setAnoSelecionado,
    dataInicioPersonalizada,
    setDataInicioPersonalizada,
    dataFimPersonalizada,
    setDataFimPersonalizada,
    dashboardMetrics,
    purgeMockData
  } = useCRM();
  const { currentUser, allUsers } = useAuth();

  const [purgeResult, setPurgeResult] = useState<string[] | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  const handlePurge = async () => {
    if (!window.confirm('Tem certeza que deseja apagar permanentemente as 6 propostas fictícias do banco de dados?')) return;
    setIsPurging(true);
    try {
      const deleted = await purgeMockData();
      setPurgeResult(deleted);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPurging(false);
    }
  };

  // 1. Single Source of Truth for Date Filtering Range (Defaults strictly to September 2026 to avoid race conditions)
  const [dateRange, setDateRange] = useState<{ dataInicio: string; dataFim: string }>(() => ({
    dataInicio: dataInicioPersonalizada || '2026-09-01',
    dataFim: dataFimPersonalizada || '2026-09-30'
  }));

  // Sync with global CRM context whenever context dates update (e.g. from Painel Financeiro)
  useEffect(() => {
    if (dataInicioPersonalizada && dataFimPersonalizada) {
      setDateRange({
        dataInicio: dataInicioPersonalizada,
        dataFim: dataFimPersonalizada
      });
    }
  }, [dataInicioPersonalizada, dataFimPersonalizada]);

  // Sync dateRange with global context when user changes filter
  const handleRangeChange = (newRange: { dataInicio: string; dataFim: string }) => {
    setDateRange(newRange);
    setDataInicioPersonalizada(newRange.dataInicio);
    setDataFimPersonalizada(newRange.dataFim);
  };

  // Submenu state for touch/mobile and desktop click
  const [openSubmenu, setOpenSubmenu] = useState<'semana' | 'mes' | 'ano' | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [copiedResumo, setCopiedResumo] = useState(false);
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

  // State for detail modal
  const [detailModalTitle, setDetailModalTitle] = useState<string | null>(null);
  const [detailModalContracts, setDetailModalContracts] = useState<Proposta[]>([]);
  const [selectedSellerName, setSelectedSellerName] = useState<string | null>(null);
  const [selectedSellerProposals, setSelectedSellerProposals] = useState<Proposta[]>([]);
  const [selectedProposalDetail, setSelectedProposalDetail] = useState<Proposta | null>(null);

  // Base date calculations for comparisons
  const baseDateInfo = useMemo(() => {
    const now = new Date();
    const safeYr = now.getFullYear();
    const safeMo = now.getMonth() + 1;
    const safeDy = now.getDate();

    const todayStr = `${safeYr}-${String(safeMo).padStart(2, '0')}-${String(safeDy).padStart(2, '0')}`;
    
    const getYearMonthStr = (year: number, month: number) => {
      const m = String(month).padStart(2, '0');
      return `${year}-${m}`;
    };

    const currentMonthStr = getYearMonthStr(safeYr, safeMo);
    
    let prevMo = safeMo - 1;
    let prevYr = safeYr;
    if (prevMo === 0) {
      prevMo = 12;
      prevYr -= 1;
    }
    const prevMonthStr = getYearMonthStr(prevYr, prevMo);

    let prev2Mo = prevMo - 1;
    let prev2Yr = prevYr;
    if (prev2Mo === 0) {
      prev2Mo = 12;
      prev2Yr -= 1;
    }
    const prev2MonthsStr = getYearMonthStr(prev2Yr, prev2Mo);

    const dayOfWeek = now.getDay();
    const sundayCurrent = new Date(now);
    sundayCurrent.setDate(now.getDate() - dayOfWeek);
    const sundayCurrentStr = `${sundayCurrent.getFullYear()}-${String(sundayCurrent.getMonth() + 1).padStart(2, '0')}-${String(sundayCurrent.getDate()).padStart(2, '0')}`;

    const lastFriday = new Date(sundayCurrent);
    lastFriday.setDate(sundayCurrent.getDate() - 2);
    const lastFridayStr = `${lastFriday.getFullYear()}-${String(lastFriday.getMonth() + 1).padStart(2, '0')}-${String(lastFriday.getDate()).padStart(2, '0')}`;

    const prevSunday = new Date(sundayCurrent);
    prevSunday.setDate(sundayCurrent.getDate() - 7);
    const prevSundayStr = `${prevSunday.getFullYear()}-${String(prevSunday.getMonth() + 1).padStart(2, '0')}-${String(prevSunday.getDate()).padStart(2, '0')}`;

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

  // 2. Filter Propostas and KPIs mapped strictly from centralized dashboardMetrics
  const filteredPropostas = dashboardMetrics.filteredPropostas;
  const totalVendas = dashboardMetrics.totalVendas;
  const totalTaxas = dashboardMetrics.totalTaxas;
  const paidPropostas = dashboardMetrics.contratosFormalizadosEPagos;

  // Previous month for comparative deltas
  const prevMonthPropostas = useMemo(() => {
    return propostas.filter(p => {
      const dataDigi = p.dataDigitacao ? p.dataDigitacao.substring(0, 10) : '';
      return dataDigi.startsWith(baseDateInfo.prevMonthStr) && p.status === 'Paga';
    });
  }, [propostas, baseDateInfo]);

  const totalComissoesPromotoras = dashboardMetrics.totalComissoesPromotoras;
  const faturamentoBruto = totalTaxas + totalComissoesPromotoras;
  const totalDespesas = dashboardMetrics.totalDespesas;
  const lucroLiquido = dashboardMetrics.lucroLiquido;
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

  // 4. Dynamic Competence Month derived from dateRange.dataInicio (e.g. '2026-09-01' -> '2026-09')
  const activeCompetenceMonth = useMemo(() => {
    if (dateRange.dataInicio && dateRange.dataInicio.length >= 7) {
      return dateRange.dataInicio.substring(0, 7);
    }
    return baseDateInfo.currentMonthStr;
  }, [dateRange, baseDateInfo]);

  // Map of normalized name/salesName to User for easy lookup
  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    allUsers.forEach(u => {
      const normName = normalizeSellerName(u.name);
      const normSalesName = u.salesName ? normalizeSellerName(u.salesName) : null;
      map.set(normName, u);
      if (normSalesName) map.set(normSalesName, u);
    });
    return map;
  }, [allUsers]);

  // Active saleswomen list
  const activeSellers = useMemo(() => {
    return allUsers.filter(u => {
      if (u.role !== 'vendedora') return false;
      if (u.status !== 'ativo') return false;
      
      const foundMeta = metas.find(m => 
        (m.vendedoraId === u.id || 
         normalizeSellerName(m.vendedoraNome) === normalizeSellerName(u.name) ||
         (u.salesName && normalizeSellerName(m.vendedoraNome) === normalizeSellerName(u.salesName))) && 
        m.mesAno === activeCompetenceMonth
      );
      
      if (foundMeta && foundMeta.isAtivoNoMes === false) return false;
      return true;
    });
  }, [allUsers, metas, activeCompetenceMonth]);

  // Store meta sum calculation based on individual saleswomen targets
  const storeMetaMonthly = useMemo(() => {
    const savedMetasForMonth = metas.filter(m => m.mesAno === activeCompetenceMonth);
    const masterLojaMeta = savedMetasForMonth.find(m => m.vendedoraId === 'loja');
    if (masterLojaMeta && masterLojaMeta.metaVenda > 0) {
      return masterLojaMeta.metaVenda;
    }

    const activeSellerIds = new Set(allUsers.filter(u => u.role === 'vendedora').map(u => u.id));
    const uniqueMetasMap = new Map<string, number>();
    
    savedMetasForMonth.forEach(m => {
      if (m.vendedoraId !== 'loja' && m.isAtivoNoMes !== false && activeSellerIds.has(m.vendedoraId)) {
        uniqueMetasMap.set(m.vendedoraId, m.metaVenda || 0);
      }
    });

    const sum = Array.from(uniqueMetasMap.values()).reduce((acc, val) => acc + val, 0);
    if (sum > 0) {
      return sum;
    }

    return 320000;
  }, [metas, activeCompetenceMonth, allUsers]);

  const metaLoja = dashboardMetrics.metaPeriodo;
  const rankingVendedoras = dashboardMetrics.rankingVendedoras;

  const atingimentoMeta = metaLoja > 0 ? (totalVendas / metaLoja) * 100 : 0;
  const quantoFalta = Math.max(0, metaLoja - totalVendas);

  // Operations breakdown - strictly paid sales and isTaxaPaga taxes
  const operationsChartData = useMemo(() => {
    const map = new Map<Operacao, { operacao: Operacao; vendas: number; taxa: number; count: number }>();
    filteredPropostas.forEach(p => {
      const isPaid = p.status === 'Paga';
      const isTaxPaid = p.taxaPaga === true || String(p.taxaPaga).toUpperCase() === 'SIM' || p.clientePagouTaxa === true;
      const curr = map.get(p.operacao) || { operacao: p.operacao, vendas: 0, taxa: 0, count: 0 };
      
      if (isPaid) {
        curr.vendas += (p.valorEmprestimo || 0);
        curr.count += 1;
      }
      if (isTaxPaid) {
        curr.taxa += (p.valorTaxa || 0);
      }
      map.set(p.operacao, curr);
    });

    return Array.from(map.values())
      .map(item => ({
        ...item,
        percentualTaxa: item.vendas > 0 ? (item.taxa / item.vendas) * 100 : 0
      }))
      .sort((a, b) => b.vendas - a.vendas);
  }, [filteredPropostas]);

  // Promotoras breakdown - strictly paid sales (exclusively hiding assessoria)
  const promotorasChartData = useMemo(() => {
    const map = new Map<string, { promotora: string; vendas: number; count: number }>();
    filteredPropostas.filter(p => p.status === 'Paga').forEach(p => {
      if (!p.promotora) return;
      const promLower = p.promotora.toLowerCase().trim();
      const opLower = (p.operacao || '').toLowerCase().trim();
      if (
        promLower.includes('maquineta') ||
        promLower.includes('pessoal de livia') ||
        promLower.includes('pessoal da livia') ||
        promLower.includes('assessoria') ||
        opLower.includes('assessoria')
      ) {
        return;
      }
      const curr = map.get(p.promotora) || { promotora: p.promotora, vendas: 0, count: 0 };
      curr.vendas += (p.valorEmprestimo || 0);
      curr.count += 1;
      map.set(p.promotora, curr);
    });

    return Array.from(map.values()).sort((a, b) => b.vendas - a.vendas);
  }, [filteredPropostas]);

  // 12-Month evolution data for Chart 1
  const evolutionVendasTaxas = useMemo(() => {
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
      const mProps = propostas.filter(p => {
        const d = p.dataDigitacao;
        return d && d.startsWith(m.key) && p.status === 'Paga';
      });
      const vendas = mProps.reduce((acc, p) => acc + p.valorEmprestimo, 0);
      const taxas = mProps
        .filter(p => p.taxaPaga === true || String(p.taxaPaga).toUpperCase() === 'SIM' || p.clientePagouTaxa === true)
        .reduce((acc, p) => acc + p.valorTaxa, 0);

      return {
        mes: m.label,
        vendas,
        taxas
      };
    });
  }, [propostas]);

  // Canonical operations
  const CANONICAL_OPERATIONS = [
    'Portabilidade',
    'Refin',
    'Margem',
    'FGTS',
    'Refin da Port',
    'Conta de Energia',
    'Cartão Novo',
    'Saque Complementar',
    'Credcesta'
  ];

  const getCanonicalOpName = (rawOp?: string): string => {
    if (!rawOp || !rawOp.trim()) return 'Outros';
    const p = rawOp.trim().toLowerCase();
    if (p.includes('fgts') || p.includes('saque-aniversário') || p.includes('saque aniversario')) return 'FGTS';
    if (p.includes('refin da port') || p.includes('refin port')) return 'Refin da Port';
    if (p === 'port' || (p.includes('portabilidade') && !p.includes('refin'))) return 'Portabilidade';
    if (p === 'refinanciamento' || p === 'refin' || p.startsWith('refin')) return 'Refin';
    if (p.includes('margem') || p === 'novo' || p.includes('novo consignado')) return 'Margem';
    if (p.includes('energia') || p.includes('luz')) return 'Conta de Energia';
    if (p.includes('cartão') || p.includes('cartao') || p.includes('rmc') || p.includes('rcc')) return 'Cartão Novo';
    if (p.includes('complementar')) return 'Saque Complementar';
    if (p.includes('credcesta')) return 'Credcesta';
    return rawOp.trim();
  };

  const distinctOperations = useMemo(() => {
    const presentOps = new Set<string>();
    paidPropostas.forEach(p => {
      const op = getCanonicalOpName(p.operacao);
      presentOps.add(op);
    });

    const list: string[] = [];
    CANONICAL_OPERATIONS.forEach(op => {
      if (presentOps.has(op) || ['FGTS', 'Portabilidade', 'Refin', 'Margem'].includes(op)) {
        list.push(op);
      }
    });
    presentOps.forEach(op => {
      if (!list.includes(op)) list.push(op);
    });

    return list;
  }, [paidPropostas]);

  const resolveSellerCanonicalName = (rawSeller?: string | null): string => {
    if (!rawSeller || !rawSeller.trim()) return 'Não informado';
    const clean = rawSeller.trim();
    const cleanLower = clean.toLowerCase();
    if (cleanLower.includes('igarassu') || cleanLower.includes('loja')) {
      const bianca = allUsers.find(u => u.name.toLowerCase().includes('bianca') || (u.salesName && u.salesName.toLowerCase().includes('bianca')));
      if (bianca) return bianca.salesName || bianca.name;
      return 'Bianca';
    }
    const found = allUsers.find(u => {
      if (u.salesName && u.salesName.toLowerCase().trim() === clean.toLowerCase()) return true;
      if (u.name && u.name.toLowerCase().trim() === clean.toLowerCase()) return true;
      if (normalizeSellerName(u.name) === normalizeSellerName(clean)) return true;
      if (u.salesName && normalizeSellerName(u.salesName) === normalizeSellerName(clean)) return true;
      return false;
    });
    if (found) {
      return found.salesName || found.name;
    }
    return clean;
  };

  const matrixDataOperacoes = useMemo(() => {
    const activeSellerUsers = allUsers.filter(u => u.role === 'vendedora' && u.status === 'ativo');

    const result = activeSellerUsers.map(emp => {
      const repName = emp.salesName || emp.name;
      const repProps = filteredPropostas.filter(p => matchesSeller(p.vendedora, emp));
      const paidRepProps = repProps.filter(p => p.status === 'Paga');

      const totalVendaRep = paidRepProps.reduce((acc, p) => acc + (p.valorEmprestimo || 0), 0);
      const totalTaxaRep = repProps
        .filter(isTaxaPaga)
        .reduce((acc, p) => acc + (p.valorTaxa || 0), 0);
      const percentTaxaGeral = totalVendaRep > 0 ? Number(((totalTaxaRep / totalVendaRep) * 100).toFixed(2)) : 0;

      const userMeta = metas.find(m => 
        (m.vendedoraId === emp.id || 
         (m.vendedoraNome && isSameSeller(m.vendedoraNome, emp.name)) ||
         (emp.salesName && m.vendedoraNome && isSameSeller(m.vendedoraNome, emp.salesName)))
      )?.metaVenda || 75000;
      const atingimento = userMeta > 0 ? Number(((totalVendaRep / userMeta) * 100).toFixed(1)) : 0;

      const opsBreakdown: Record<string, { venda: number; taxa: number; percent: number; count: number }> = {};
      distinctOperations.forEach(op => {
        const opsAll = repProps.filter(p => getCanonicalOpName(p.operacao) === op);
        const opsPaid = opsAll.filter(p => p.status === 'Paga');
        const venda = opsPaid.reduce((acc, p) => acc + (p.valorEmprestimo || 0), 0);
        const taxa = opsAll
          .filter(isTaxaPaga)
          .reduce((acc, p) => acc + (p.valorTaxa || 0), 0);
        const percent = venda > 0 ? Number(((taxa / venda) * 100).toFixed(2)) : 0;
        opsBreakdown[op] = { venda, taxa, percent, count: opsPaid.length };
      });

      return {
        repName,
        totalVendaRep,
        totalTaxaRep,
        percentTaxaGeral,
        userMeta,
        atingimento,
        opsBreakdown
      };
    });

    return result.sort((a, b) => b.totalVendaRep - a.totalVendaRep);
  }, [filteredPropostas, allUsers, metas, distinctOperations]);

  // Digitação Stats
  const digitacaoStats = useMemo(() => {
    const counts: Record<string, { propostas: number; volume: number; simulacoes: number }> = {};

    filteredPropostas.forEach(p => {
      const rawDig = p.digitador || p.vendedora || 'Não informado';
      const normDig = normalizeSellerName(rawDig);
      const user = userMap.get(normDig);
      const dig = user ? user.name : rawDig;

      if (!counts[dig]) {
        counts[dig] = { propostas: 0, volume: 0, simulacoes: 0 };
      }
      
      const isSim = p.isSimulacao === true || p.status === 'Simuladas' || p.origemSimulacao === true;
      if (isSim) {
        counts[dig].simulacoes += 1;
      }

      const isPropostaOficial = p.status !== 'Simuladas' && p.isSimulacao !== true;
      if (isPropostaOficial) {
        counts[dig].propostas += 1;
        counts[dig].volume += (p.valorEmprestimo || 0);
      }
    });

    const totalDigitadas = filteredPropostas.filter(p => p.status !== 'Simuladas' && p.isSimulacao !== true).length;
    const totalSimulacoesLoja = filteredPropostas.filter(p => 
      p.isSimulacao === true || p.status === 'Simuladas' || p.origemSimulacao === true
    ).length;

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
  }, [filteredPropostas, allUsers, userMap]);

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Top Header Controls: Title, Secret Button & Smart Period Filter */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600 shrink-0" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Painel Gerencial
              </h1>
              {/* Secret System Health Indicator Button */}
              <SystemHealthIndicator />
              {currentUser && currentUser.name.toLowerCase().includes('geovanne') && currentUser.role === 'financeiro' && (
                <button
                  onClick={handlePurge}
                  disabled={isPurging}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isPurging ? 'Apagando...' : 'Apagar Dados Fictícios'}
                </button>
              )}
            </div>
            {/* Conference Strip for Geovanne (Financeiro) */}
            {currentUser && currentUser.name.toLowerCase().includes('geovanne') && currentUser.role === 'financeiro' && (
              <div className="space-y-2 mt-2">
                <div className="text-[9px] font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  Firebase: Conectado | Total: {propostas.length} | Setembro: {filteredPropostas.length} | Fictícias: {propostas.filter(p => p.id.startsWith('prop-sep26-')).length} | Doc Lidos: {localStorage.getItem('crm_cloud_reads') || 0}
                </div>
                {purgeResult && (
                  <div className="text-[9px] font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 animate-in slide-in-from-top-1">
                    Documentos apagados (#482500 a #482505): {purgeResult.join(', ')}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhamento em tempo real de faturamento, comissões, ranking e rentabilidade.
            </p>
          </div>
        </div>

        {/* Full-width horizontal filter bar */}
        <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800">
          <SmartFilter
            dataInicio={dateRange.dataInicio}
            dataFim={dateRange.dataFim}
            onChangeRange={handleRangeChange}
          />
        </div>
      </div>

      {/* Global Month Target Progress Banner */}
      <div className="bg-gradient-to-br from-[#0B2A4A] via-[#0F5C63] to-[#1B8A8F] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-300">
                Meta Global da Loja • Competência {getMonthYearLabel(activeCompetenceMonth)}
              </span>
              <div className="flex flex-col mt-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
                    {formatCurrency(totalVendas)}
                  </span>
                  <span className="text-xs text-teal-100">
                    de {formatCurrency(metaLoja)}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs text-amber-300 font-bold opacity-90">
                  Taxa arrecadada: {formatCurrency(totalTaxas)}
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
          <p className="text-[10px] text-slate-400">Contas e custos do período</p>
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

      {/* Ranking de Vendedoras */}
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
            const metaVenda = vendedora.meta > 0 ? vendedora.meta : 0;
            const userObj = allUsers.find(u => normalizeSellerName(u.name) === normalizeSellerName(vendedora.nome));
            const foundMeta = metas.find(m => 
              (m.vendedoraId === userObj?.id || normalizeSellerName(m.vendedoraNome) === normalizeSellerName(vendedora.nome)) && 
              m.mesAno === activeCompetenceMonth
            );
            const metaPercentualTaxa = foundMeta?.metaPercentualTaxa ?? userObj?.monthlyTaxPercentGoal ?? 20;
            const metaTaxa = metaVenda * (metaPercentualTaxa / 100);

            const percentualVenda = metaVenda > 0 ? (vendedora.vendas / metaVenda) * 100 : 0;
            const percentualTaxaGoal = metaTaxa > 0 ? (vendedora.taxa / metaTaxa) * 100 : 0;

            const medalColors = [
              'bg-amber-400 text-slate-950 font-black',
              'bg-slate-300 text-slate-900 font-bold',
              'bg-amber-700 text-amber-100 font-bold',
            ];

            return (
              <div
                key={vendedora.nome}
                onClick={() => {
                  const sellerUser = allUsers.find(
                    u =>
                      (u.salesName && u.salesName === vendedora.nome) ||
                      u.name === vendedora.nome ||
                      normalizeSellerName(u.name) === normalizeSellerName(vendedora.nome) ||
                      (u.salesName && normalizeSellerName(u.salesName) === normalizeSellerName(vendedora.nome))
                  );

                  let propsForSeller: Proposta[];
                  if (vendedora.nome === 'Outros') {
                    propsForSeller = filteredPropostas.filter(p => !allUsers.some(emp => matchesSeller(p.vendedora, emp)));
                  } else if (sellerUser) {
                    propsForSeller = filteredPropostas.filter(
                      p => matchesSeller(p.vendedora, sellerUser) || (!p.vendedora && matchesSeller(p.digitador, sellerUser))
                    );
                  } else {
                    propsForSeller = filteredPropostas.filter(
                      p => isSameSeller(p.vendedora, vendedora.nome) || normalizeSellerName(p.vendedora) === normalizeSellerName(vendedora.nome)
                    );
                  }

                  // Sort proposals with paid first, then by date descending
                  propsForSeller.sort((a, b) => {
                    if (a.status === 'Paga' && b.status !== 'Paga') return -1;
                    if (a.status !== 'Paga' && b.status === 'Paga') return 1;
                    return (b.dataDigitacao || '').localeCompare(a.dataDigitacao || '');
                  });

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
                        <div className="flex flex-col items-start sm:items-end gap-0.5">
                          <p className="text-slate-500 font-semibold flex items-center gap-1.5">
                            <span>Vendas:</span>
                            <span className="font-black text-[#0F5C63] dark:text-[#28B0B7]">{formatCurrency(vendedora.vendas)}</span>
                            <span className="text-[10px] text-slate-400 font-normal ml-0.5">/ {formatCurrency(metaVenda)}</span>
                          </p>
                          <p className="text-slate-500 font-semibold flex items-center gap-1.5">
                            <span>Taxa:</span>
                            <span className="font-black text-amber-600 dark:text-amber-400">{formatCurrency(vendedora.taxa)}</span>
                            <span className="text-[10px] text-slate-400 font-normal ml-0.5">/ {formatCurrency(metaTaxa)}</span>
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {vendedora.nome !== 'Outros' ? (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
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

      {/* Produtividade de Digitação */}
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

      {/* 12-Month Financial Evolution Charts */}
      <div className="flex flex-col gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Evolução Histórica de Vendas (Últimos 12 Meses)
              </h2>
              <p className="text-[11px] text-slate-500">
                Volume consolidado de Vendas e Taxas arrecadadas
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-teal-600">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" /> Vendas
              </span>
              <span className="flex items-center gap-1.5 text-amber-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Taxas
              </span>
            </div>
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionVendasTaxas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="vendasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F5C63" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0F5C63" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="taxasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5B700" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F5B700" stopOpacity={0.0} />
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
                <Area type="monotone" dataKey="taxas" name="Taxas" stroke="#F5B700" strokeWidth={2} fillOpacity={1} fill="url(#taxasGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid: Sales by Product & Promotoras Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      {/* Card: Análise de Vendas por Operação × Vendedora */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Análise de Vendas por Operação × Vendedora</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Volume contratado e taxas líquidas auferidas por linha de produto e atendente
            </p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 self-start sm:self-auto">
            {matrixDataOperacoes.length} Vendedoras / Atendentes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-xs">Vendedora</th>
                <th className="py-2.5 px-3 text-right">Total Vendas</th>
                <th className="py-2.5 px-3 text-right">Taxas Pagas</th>
                <th className="py-2.5 px-3 text-right">% Taxa</th>
                {distinctOperations
                  .filter(op => matrixDataOperacoes.some(m => (m.opsBreakdown[op]?.venda || 0) > 0) || ['FGTS', 'Portabilidade', 'Refin', 'Margem'].includes(op))
                  .map(op => (
                    <th key={op} className="py-2.5 px-3 text-right whitespace-nowrap">
                      {op}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {matrixDataOperacoes.map((row) => {
                const activeOps = distinctOperations.filter(op =>
                  matrixDataOperacoes.some(m => (m.opsBreakdown[op]?.venda || 0) > 0) || ['FGTS', 'Portabilidade', 'Refin', 'Margem'].includes(op)
                );

                return (
                  <tr key={row.repName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10">
                      {row.repName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(row.totalVendaRep)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatCurrency(row.totalTaxaRep)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-600 dark:text-slate-300">
                      {row.percentTaxaGeral > 0 ? `${row.percentTaxaGeral.toFixed(2)}%` : '—'}
                    </td>
                    {activeOps.map(op => {
                      const data = row.opsBreakdown[op];
                      const hasVenda = data && data.venda > 0;
                      return (
                        <td key={op} className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                          {hasVenda ? (
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-100 block">
                                {formatCurrency(data.venda)}
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                {data.percent > 0 ? `${data.percent.toFixed(2)}%` : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {(() => {
                const activeOps = distinctOperations.filter(op =>
                  matrixDataOperacoes.some(m => (m.opsBreakdown[op]?.venda || 0) > 0) || ['FGTS', 'Portabilidade', 'Refin', 'Margem'].includes(op)
                );
                const grandTotalVendas = matrixDataOperacoes.reduce((acc, m) => acc + m.totalVendaRep, 0);
                const grandTotalTaxas = matrixDataOperacoes.reduce((acc, m) => acc + m.totalTaxaRep, 0);
                const grandPercent = grandTotalVendas > 0 ? Number(((grandTotalTaxas / grandTotalVendas) * 100).toFixed(2)) : 0;

                return (
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 font-extrabold text-slate-900 dark:text-white">
                    <td className="py-3 px-3 uppercase text-[10px] tracking-wider sticky left-0 bg-slate-50/80 dark:bg-slate-800/60 z-10">
                      Total da Loja
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-teal-700 dark:text-teal-400 font-black">
                      {formatCurrency(grandTotalVendas)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-amber-600 dark:text-amber-400 font-black">
                      {formatCurrency(grandTotalTaxas)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-black text-slate-700 dark:text-slate-300">
                      {grandPercent > 0 ? `${grandPercent.toFixed(2)}%` : '—'}
                    </td>
                    {activeOps.map(op => {
                      const opTotalVenda = matrixDataOperacoes.reduce((acc, m) => acc + (m.opsBreakdown[op]?.venda || 0), 0);
                      const opTotalTaxa = matrixDataOperacoes.reduce((acc, m) => acc + (m.opsBreakdown[op]?.taxa || 0), 0);
                      const opPercent = opTotalVenda > 0 ? Number(((opTotalTaxa / opTotalVenda) * 100).toFixed(2)) : 0;
                      return (
                        <td key={op} className="py-3 px-3 text-right tabular-nums whitespace-nowrap font-bold">
                          {opTotalVenda > 0 ? (
                            <div>
                              <span>{formatCurrency(opTotalVenda)}</span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-normal">
                                {opPercent > 0 ? `${opPercent.toFixed(2)}%` : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModalTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
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
                          prop.status === 'Cancelada' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
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

      {/* Seller Modal */}
      {selectedSellerName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
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
                        <td className="py-2.5 px-2 text-right font-bold tabular-nums">{formatCurrency(prop.valorEmprestimo)}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-amber-600 tabular-nums">{formatCurrency(prop.valorTaxa)}</td>
                        <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[110px]">
                          {prop.vendedora || 'Não informado'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prop.status === 'Paga' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            prop.status === 'Cancelada' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
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

      {/* Proposal Detail View Modal */}
      {selectedProposalDetail && (
        <DetalhePropostaModal
          proposta={selectedProposalDetail}
          onClose={() => setSelectedProposalDetail(null)}
        />
      )}
    </div>
  );
};

export default ProprietariaDashboard;
