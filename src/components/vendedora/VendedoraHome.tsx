import React, { useState, useMemo, useEffect } from 'react';
import {
  Target,
  PlusCircle,
  Search,
  BellRing,
  Award,
  TrendingUp,
  Percent,
  Clock,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Sparkles,
  Cake,
  MessageCircle,
  PartyPopper,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { useCRM, PeriodoFiltro } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { openMessagingApp } from '../../utils/messaging';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  formatPhone,
  getBirthdayInfo,
  BirthdayInfo,
  normalizeSellerName,
  isSameSeller,
  getLocalDateString
} from '../../utils/formatters';
import { calcularComissaoVendedoraMes } from '../../utils/commissionRules';
import { Cliente, Proposta } from '../../types';

interface Props {
  onOpenNovaProposta: () => void;
  onNavigateToClientes: () => void;
  onNavigateToAlertas: () => void;
  onNavigateToPropostas: () => void;
}

export const VendedoraHome: React.FC<Props> = ({
  onOpenNovaProposta,
  onNavigateToClientes,
  onNavigateToAlertas,
  onNavigateToPropostas,
}) => {
  const {
    propostas,
    metas,
    alertas,
    clientes,
    periodo,
    setPeriodo,
    anoSelecionado,
    setAnoSelecionado,
    dataInicioPersonalizada,
    setDataInicioPersonalizada,
    dataFimPersonalizada,
    setDataFimPersonalizada
  } = useCRM();
  const { currentUser, allUsers } = useAuth();

  const sellerName = currentUser?.name || 'Hellen Vasconcelos';
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

  // Aniversariantes da semana na carteira da vendedora (ou da loja inteira se vazia)
  const aniversariantesSemana = useMemo(() => {
    const listSeller = (clientes || []).filter(c => isSameSeller(c.vendedoraResponsavel, sellerName));
    const pool = listSeller.length > 0 ? listSeller : (clientes || []);

    return pool
      .map(c => {
        const bInfo = getBirthdayInfo(c.dataNascimento);
        return { cliente: c, bInfo };
      })
      .filter((item): item is { cliente: Cliente; bInfo: BirthdayInfo } => Boolean(item.bInfo && item.bInfo.isThisWeek))
      .sort((a, b) => a.bInfo.daysDiff - b.bInfo.daysDiff);
  }, [clientes, sellerName]);

  const handleMandarParabens = (cliente: Cliente, bInfo: BirthdayInfo) => {
    const primeiroNome = cliente.nome.split(' ')[0];
    const mensagem = `Olá ${primeiroNome}, parabéns! 🎉 Toda a equipe da Lívia Cred Saúde e eu (${sellerName.split(' ')[0]}) desejamos muita saúde, paz e muitas felicidades pelo seu aniversário! Que seu novo ciclo seja abençoado e repleto de realizações. Um grande abraço carinhoso!`;
    openMessagingApp(cliente.telefone, mensagem);
  };

  // Base dates memo
  const baseDateInfo = useMemo(() => {
    const now = new Date();
    const safeYr = now.getFullYear();
    const safeMo = now.getMonth() + 1;
    const safeDay = now.getDate();

    const getYearMonthStr = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
    const todayStr = `${safeYr}-${String(safeMo).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
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

    // Sunday of current week
    const dayOfWeek = now.getDay();
    const sundayCurrent = new Date(now);
    sundayCurrent.setDate(now.getDate() - dayOfWeek);
    const sundayCurrentStr = `${sundayCurrent.getFullYear()}-${String(sundayCurrent.getMonth() + 1).padStart(2, '0')}-${String(sundayCurrent.getDate()).padStart(2, '0')}`;

    // Last Friday
    const lastFriday = new Date(sundayCurrent);
    lastFriday.setDate(sundayCurrent.getDate() - 2);
    const lastFridayStr = `${lastFriday.getFullYear()}-${String(lastFriday.getMonth() + 1).padStart(2, '0')}-${String(lastFriday.getDate()).padStart(2, '0')}`;

    // Previous Sunday
    const prevSunday = new Date(sundayCurrent);
    prevSunday.setDate(sundayCurrent.getDate() - 7);
    const prevSundayStr = `${prevSunday.getFullYear()}-${String(prevSunday.getMonth() + 1).padStart(2, '0')}-${String(prevSunday.getDate()).padStart(2, '0')}`;

    // Previous Friday
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

  // Determine active competence month for metas lookup based on filter
  const activeCompetenceMonth = useMemo(() => {
    if (periodo === 'mes_anterior') {
      return baseDateInfo.prevMonthStr;
    }
    return baseDateInfo.currentMonthStr;
  }, [periodo, baseDateInfo]);

  // Pretty print for competence label
  const competenceLabel = useMemo(() => {
    const [yr, mo] = activeCompetenceMonth.split('-');
    const monthsNames: Record<string, string> = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    return `${monthsNames[mo] || 'Setembro'} de ${yr || '2026'}`;
  }, [activeCompetenceMonth]);

  // Filter propostas by period
  const filteredPropostas = useMemo(() => {
    return propostas.filter(p => {
      const d = p.dataDigitacao;
      if (!d) return false;

      if (periodo === 'hoje') {
        return d === baseDateInfo.todayStr;
      }
      if (periodo === 'semana') {
        return d >= baseDateInfo.sundayCurrentStr && d <= baseDateInfo.todayStr;
      }
      if (periodo === 'semana_anterior') {
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

  // Seller's paid proposals in the active filtered period
  const sellerPaidPropsFiltered = useMemo(() => {
    return filteredPropostas.filter(
      p => isSameSeller(p.vendedora, sellerName) && p.status === 'Paga'
    );
  }, [filteredPropostas, sellerName]);

  // Seller's pending proposals in current filter
  const sellerPendingProps = useMemo(() => {
    return filteredPropostas.filter(
      p => isSameSeller(p.vendedora, sellerName) && (p.status === 'Em análise' || p.status === 'Simuladas')
    );
  }, [filteredPropostas, sellerName]);

  // Seller's all proposals in the active filtered period
  const sellerPropostasInPeriod = useMemo(() => {
    return filteredPropostas.filter(
      p => isSameSeller(p.vendedora, sellerName)
    );
  }, [filteredPropostas, sellerName]);

  // Seller's active alerts
  const sellerAlerts = useMemo(() => {
    return alertas.filter(a => isSameSeller(a.vendedoraResponsavel, sellerName) && a.status === 'nova');
  }, [alertas, sellerName]);

  // Totals
  const totalVendas = sellerPaidPropsFiltered.reduce((acc, p) => acc + p.valorEmprestimo, 0);
  const totalTaxas = sellerPaidPropsFiltered.reduce((acc, p) => acc + p.valorTaxa, 0);
  const taxaMedia = totalVendas > 0 ? (totalTaxas / totalVendas) * 100 : 0;

  // Period multiplier for scaling the goal
  const periodMultiplier = useMemo(() => {
    if (periodo === 'hoje') return 1 / 30;
    if (periodo === 'semana' || periodo === 'semana_anterior') return 7 / 30;
    if (periodo === 'mes' || periodo === 'mes_anterior') return 1;
    if (periodo === 'ultimos_3_meses') return 3;
    if (periodo === 'ano') return 12;
    if (periodo === 'personalizado') {
      const startMs = new Date(dataInicioPersonalizada || '2026-09-01').getTime();
      const endMs = new Date(dataFimPersonalizada || '2026-09-30').getTime();
      const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
      return diffDays / 30;
    }
    return 1;
  }, [periodo, dataInicioPersonalizada, dataFimPersonalizada]);

  // Seller's Goal Lookup for selected Month
  const sellerMeta = useMemo(() => {
    return metas.find(
      m => (m.vendedoraId === currentUser?.id || isSameSeller(m.vendedoraNome, sellerName)) && m.mesAno === activeCompetenceMonth
    );
  }, [metas, currentUser, sellerName, activeCompetenceMonth]);

  const metaVendaBase = useMemo(() => {
    if (sellerMeta && sellerMeta.metaVenda > 0) return sellerMeta.metaVenda;
    const activeSellersCount = allUsers.filter(u => u.role === 'vendedora').length;
    return activeSellersCount > 0 ? Math.round(400000 / activeSellersCount) : 100000;
  }, [sellerMeta, allUsers]);

  const metaVenda = metaVendaBase * periodMultiplier;
  const atingimentoMeta = metaVenda > 0 ? (totalVendas / metaVenda) * 100 : 0;
  const quantoFalta = Math.max(0, metaVenda - totalVendas);

  // Remaining days calculation
  const diasRestantes = useMemo(() => {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    if (todayStr.startsWith(activeCompetenceMonth)) {
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      return Math.max(1, lastDay - today.getDate());
    }
    return 0; // Historical month has 0 days left
  }, [activeCompetenceMonth]);

  // Seller's estimated commissions to receive
  const fechamentoComissao = useMemo(() => {
    return calcularComissaoVendedoraMes(
      currentUser?.id || 'vendedora',
      sellerName,
      activeCompetenceMonth,
      propostas,
      sellerMeta,
      true
    );
  }, [currentUser, sellerName, activeCompetenceMonth, propostas, sellerMeta]);

  // Safe Store Ranking
  const rankingSeguro = useMemo(() => {
    const map = new Map<string, number>();
    const allReps = ['Hellen Vasconcelos', 'Loja Igarassu', 'Taciana Silva', 'Lucélia Ramos', 'Pamella'];
    allReps.forEach(r => map.set(r, 0));

    let outrosTotal = 0;
    propostas
      .filter(p => p.dataDigitacao.startsWith(activeCompetenceMonth) && p.status === 'Paga')
      .forEach(p => {
        const normVendor = normalizeSellerName(p.vendedora);
        if (map.has(normVendor)) {
          map.set(normVendor, (map.get(normVendor) || 0) + p.valorEmprestimo);
        } else {
          outrosTotal += p.valorEmprestimo;
        }
      });

    const list = Array.from(map.entries()).map(([nome, vendas]) => ({ nome, vendas }));
    if (outrosTotal > 0) {
      list.push({ nome: 'Outros', vendas: outrosTotal });
    }

    return list.sort((a, b) => b.vendas - a.vendas);
  }, [propostas, activeCompetenceMonth]);

  const minhaPosicaoRanking = rankingSeguro.findIndex(r => isSameSeller(r.nome, sellerName)) + 1;

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Dynamic Period Filter Bar (Exactly matches the manager dashboard!) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-visible">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>Filtro de Período Ativo</span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Acompanhamento dinâmico: {competenceLabel}
          </p>
        </div>

        {/* Filter Buttons */}
        <div ref={filterContainerRef} className="flex items-center gap-1.5 overflow-visible relative flex-wrap sm:flex-nowrap">
          {/* 1. Hoje */}
          <button
            type="button"
            onClick={() => {
              setPeriodo('hoje');
              setOpenSubmenu(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              periodo === 'hoje'
                ? 'bg-[#0F5C63] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
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
                  ? 'bg-[#0F5C63] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/80'
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
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium transition ${
                    periodo === 'semana' ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Semana Atual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodo('semana_anterior');
                    setOpenSubmenu(null);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium transition ${
                    periodo === 'semana_anterior' ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Semana Anterior
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
                  ? 'bg-[#0F5C63] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/80'
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
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium transition ${
                    periodo === 'mes' ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Mês Atual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodo('mes_anterior');
                    setOpenSubmenu(null);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium transition ${
                    periodo === 'mes_anterior' ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Mês Anterior
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodo('ultimos_3_meses');
                    setOpenSubmenu(null);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium transition ${
                    periodo === 'ultimos_3_meses' ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Últimos 3 Meses
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
                  ? 'bg-[#0F5C63] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/80'
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
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium transition ${
                      periodo === 'ano' && anoSelecionado === yr ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Ano {yr}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-[#0B2A4A] via-[#0F5C63] to-[#1B8A8F] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                Área da Vendedora • Competência {competenceLabel}
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                Olá, {sellerName.split(' ')[0]}! 🚀
              </h1>
              <p className="text-xs text-teal-100">
                {minhaPosicaoRanking > 0 ? (
                  <span>Você está em <strong>{minhaPosicaoRanking}º lugar</strong> no ranking de vendas da loja este período!</span>
                ) : (
                  <span>Nenhum contrato formalizado neste período ainda.</span>
                )}
              </p>
            </div>

            <button
              onClick={onOpenNovaProposta}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 w-fit"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>Digitar Nova Proposta</span>
            </button>
          </div>

          {/* Goal Progress Bar */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-2">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[11px] text-teal-100 font-semibold block">Sua Meta de Vendas (Proporcional)</span>
                <span className="text-2xl font-black text-white tabular-nums">
                  {formatCurrency(totalVendas)}
                </span>
                <span className="text-xs text-teal-200 ml-1.5">de {formatCurrency(metaVenda)}</span>
              </div>

              <div className="text-right">
                <span className="text-lg font-black text-amber-300 tabular-nums">
                  {formatPercent(atingimentoMeta)}
                </span>
                <span className="text-[11px] text-teal-100 block">
                  {quantoFalta > 0 ? `Faltam ${formatCurrency(quantoFalta)}` : 'Meta Batida! 🎉'}
                </span>
              </div>
            </div>

            <div className="w-full bg-black/25 rounded-full h-3 p-0.5 border border-white/20">
              <div
                className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, atingimentoMeta)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-teal-100 pt-0.5">
              <span>{sellerPaidPropsFiltered.length} contratos formalizados e pagos</span>
              {diasRestantes > 0 ? (
                <span><strong>{diasRestantes} dias restantes</strong> no mês</span>
              ) : (
                <span>Histórico / Período Fechado</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Personal KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Minhas Vendas</span>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {formatCurrency(totalVendas)}
          </p>
          <p className="text-[10px] text-slate-400">Total contratado</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Taxa Média</span>
          <p className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
            {formatPercent(taxaMedia)}
          </p>
          <p className="text-[10px] text-slate-400">Total: {formatCurrency(totalTaxas)}</p>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800 shadow-xs">
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Minha Comissão</span>
          <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
            {formatCurrency(fechamentoComissao.totalAPagar)}
          </p>
          <p className="text-[10px] text-emerald-600">Taxas + digitação + bônus</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Oportunidades</span>
          <p className="text-lg sm:text-xl font-extrabold text-purple-600 tabular-nums mt-0.5">
            {sellerAlerts.length}
          </p>
          <p className="text-[10px] text-slate-400">Aguardando contato</p>
        </div>
      </div>

      {/* Quick CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onOpenNovaProposta}
          className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500 hover:shadow-xs transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                Nova Proposta
              </p>
              <p className="text-[11px] text-slate-400">Digitar contrato no sistema</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={onNavigateToClientes}
          className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500 hover:shadow-xs transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                Buscar Cliente (CPF)
              </p>
              <p className="text-[11px] text-slate-400">Histórico completo unificado</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={onNavigateToAlertas}
          className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-500 hover:shadow-xs transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 flex items-center justify-center font-bold">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                Meus Alertas ({sellerAlerts.length})
              </p>
              <p className="text-[11px] text-slate-400">Portabilidade, refin & cartão</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Card: Aniversariantes da Semana */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-300/80 dark:border-amber-800">
              <Cake className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Aniversariantes da Semana</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300">
                  {aniversariantesSemana.length} cliente{aniversariantesSemana.length === 1 ? '' : 's'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Envie felicitações no WhatsApp para estreitar laços, fidelizar e abrir oportunidades de crédito!
              </p>
            </div>
          </div>

          {aniversariantesSemana.some(a => a.bInfo.isToday) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black shadow-xs w-fit">
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Tem aniversário hoje! 🎉</span>
            </span>
          )}
        </div>

        {aniversariantesSemana.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
            <Cake className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nenhum cliente fazendo aniversário nesta semana
            </p>
            <p className="text-[11px] text-slate-400">
              Conforme os aniversários forem se aproximando nos próximos dias, eles aparecerão automaticamente aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aniversariantesSemana.map(({ cliente, bInfo }) => {
              const isToday = bInfo.isToday;

              return (
                <div
                  key={cliente.cpf}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isToday
                      ? 'bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-white dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border-amber-300 dark:border-amber-800 shadow-xs'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isToday
                            ? 'bg-amber-400 text-slate-950 shadow-2xs animate-pulse'
                            : bInfo.isTomorrow
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {bInfo.badgeLabel}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          {bInfo.dayMonth}
                        </span>
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {cliente.nome}
                      </h3>

                      <p className="text-xs text-slate-500">
                        Completando <strong className="text-teal-700 dark:text-teal-400">{bInfo.turningAge} anos</strong> · {cliente.convenioPrincipal}
                      </p>

                      <p className="text-[11px] text-slate-400">
                        {cliente.cidade} · Tel: {formatPhone(cliente.telefone)}
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center font-black text-sm shrink-0 border border-amber-300/60">
                      🎁
                    </div>
                  </div>

                  {/* WhatsApp Action Button */}
                  <button
                    type="button"
                    onClick={() => handleMandarParabens(cliente, bInfo)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-98"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Mandar Parabéns no WhatsApp</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Proposals in Period + Safe Sales Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Meus Contratos no Período */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0F5C63]" />
              <span>Meus Contratos no Período</span>
            </h2>
            <button
              onClick={onNavigateToPropostas}
              className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
            >
              Ver todas
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {sellerPropostasInPeriod.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Nenhum contrato ou simulação para o período selecionado.
              </p>
            ) : (
              sellerPropostasInPeriod.map((p) => {
                const isPaid = p.status === 'Paga';
                const isPending = p.status === 'Em análise' || p.status === 'Simuladas';
                const isCancelled = p.status === 'Cancelada';
                let statusColor = 'bg-slate-100 text-slate-700';
                if (isPaid) statusColor = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300';
                else if (isPending) statusColor = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300';
                else if (isCancelled) statusColor = 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300';

                return (
                  <div key={p.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{p.nomeCliente}</span>
                      <p className="text-[11px] text-slate-500">
                        {p.operacao} · {p.banco} · Contrato #{p.numeroContrato || 'Sem número'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(p.valorEmprestimo)}
                      </span>
                      <span className={`block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 w-fit ml-auto ${statusColor}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ranking de Vendas da Loja */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Ranking Geral de Vendas</span>
            </h2>
            <span className="text-xs text-slate-500">{competenceLabel}</span>
          </div>

          <div className="space-y-2.5">
            {rankingSeguro.map((rep, idx) => {
              const isMe = isSameSeller(rep.nome, sellerName);

              return (
                <div
                  key={rep.nome}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                    isMe
                      ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 font-bold shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-slate-950' :
                      idx === 1 ? 'bg-slate-300 text-slate-900' :
                      idx === 2 ? 'bg-amber-700 text-white' :
                      'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {idx + 1}º
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {rep.nome} {isMe && '(Você)'}
                    </span>
                  </div>

                  <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(rep.vendas)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
