import React, { useMemo } from 'react';
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
  PartyPopper
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { openMessagingApp } from '../../utils/messaging';
import { formatCurrency, formatPercent, formatDate, formatPhone, getBirthdayInfo, BirthdayInfo, formatBirthDateWithAge } from '../../utils/formatters';
import { calcularComissaoVendedoraMes } from '../../utils/commissionRules';
import { Cliente } from '../../types';

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
  const { propostas, metas, alertas, clientes } = useCRM();
  const { currentUser } = useAuth();

  const sellerName = currentUser?.name || 'Hellen Vasconcelos';

  // Aniversariantes da semana na carteira da vendedora (ou da loja inteira se vazia)
  const aniversariantesSemana = useMemo(() => {
    const listSeller = (clientes || []).filter(c => c.vendedoraResponsavel === sellerName);
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

  // Dynamically detect competence month-year based on proposals in the system
  const currentMonthYear = useMemo(() => {
    if (propostas.length === 0) return '2026-09';
    let latest = '';
    propostas.forEach(p => {
      if (p.dataDigitacao && p.dataDigitacao > latest) {
        latest = p.dataDigitacao;
      }
    });
    if (latest && latest.length >= 7) {
      return latest.slice(0, 7); // 'YYYY-MM'
    }
    return '2026-09';
  }, [propostas]);

  // Pretty print for competence label (e.g. '2026-03' -> 'Março de 2026')
  const competenceLabel = useMemo(() => {
    const [yr, mo] = currentMonthYear.split('-');
    const monthsNames: Record<string, string> = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    return `${monthsNames[mo] || 'Setembro'} de ${yr || '2026'}`;
  }, [currentMonthYear]);

  // Seller's propostas this month
  const sellerPaidPropsThisMonth = useMemo(() => {
    return propostas.filter(
      p => p.vendedora === sellerName && p.dataDigitacao.startsWith(currentMonthYear) && p.status === 'Paga'
    );
  }, [propostas, sellerName, currentMonthYear]);

  // Seller's pending proposals
  const sellerPendingProps = useMemo(() => {
    return propostas.filter(
      p => p.vendedora === sellerName && (p.status === 'Em análise' || p.status === 'Pendente')
    );
  }, [propostas, sellerName]);

  // Seller's alerts
  const sellerAlerts = useMemo(() => {
    return alertas.filter(a => a.vendedoraResponsavel === sellerName && a.status === 'nova');
  }, [alertas, sellerName]);

  // Sales totals
  const totalVendas = sellerPaidPropsThisMonth.reduce((acc, p) => acc + p.valorEmprestimo, 0);
  const totalTaxas = sellerPaidPropsThisMonth.reduce((acc, p) => acc + p.valorTaxa, 0);
  const taxaMedia = totalVendas > 0 ? (totalTaxas / totalVendas) * 100 : 0;

  // Seller's Goal
  const sellerMeta = metas.find(m => m.vendedoraId === currentUser?.id || m.vendedoraNome === sellerName);
  const metaVenda = sellerMeta?.metaVenda || 95000;
  const atingimentoMeta = metaVenda > 0 ? (totalVendas / metaVenda) * 100 : 0;
  const quantoFalta = Math.max(0, metaVenda - totalVendas);

  // Remaining days calculation
  const diasRestantes = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (todayStr.startsWith(currentMonthYear)) {
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      return Math.max(1, lastDay - today.getDate());
    }
    return 0; // Mês já encerrado se for histórico
  }, [currentMonthYear]);

  // Seller's estimated commissions to receive
  const fechamentoComissao = useMemo(() => {
    return calcularComissaoVendedoraMes(
      currentUser?.id || 'vendedora',
      sellerName,
      currentMonthYear,
      propostas,
      sellerMeta,
      true
    );
  }, [currentUser, sellerName, currentMonthYear, propostas, sellerMeta]);

  // Ranking (Safe: shows only sellers, rank position and sales total without exposing company net profit or company expenses!)
  const rankingSeguro = useMemo(() => {
    const map = new Map<string, number>();
    const allReps = ['Hellen Vasconcelos', 'Loja Igarassu (Balcão)', 'Taciana Silva', 'Lucélia Ramos', 'Pamella'];
    allReps.forEach(r => map.set(r, 0));

    let outrosTotal = 0;
    propostas
      .filter(p => p.dataDigitacao.startsWith(currentMonthYear) && p.status === 'Paga')
      .forEach(p => {
        if (map.has(p.vendedora)) {
          map.set(p.vendedora, (map.get(p.vendedora) || 0) + p.valorEmprestimo);
        } else {
          outrosTotal += p.valorEmprestimo;
        }
      });

    const list = Array.from(map.entries())
      .map(([nome, vendas]) => ({ nome, vendas }));
    if (outrosTotal > 0) {
      list.push({ nome: 'Outros', vendas: outrosTotal });
    }

    return list.sort((a, b) => b.vendas - a.vendas);
  }, [propostas, currentMonthYear]);

  const minhaPosicaoRanking = rankingSeguro.findIndex(r => r.nome === sellerName) + 1;

  return (
    <div className="space-y-4 pb-20 md:pb-8">
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
                Você está em <strong>{minhaPosicaoRanking}º lugar</strong> no ranking de vendas da loja este mês!
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
                <span className="text-[11px] text-teal-100 font-semibold block">Sua Meta de Vendas</span>
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
              <span>{sellerPaidPropsThisMonth.length} contratos formalizados e pagos</span>
              <span><strong>{diasRestantes} dias restantes</strong> no mês</span>
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
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Minha Comissão Prevista</span>
          <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
            {formatCurrency(fechamentoComissao.totalAPagar)}
          </p>
          <p className="text-[10px] text-emerald-600">Taxas + digitação + bônus</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Oportunidades Hoje</span>
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

      {/* Card: Aniversariantes da Semana (Para a vendedora mandar parabéns e estreitar relacionamento) */}
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

      {/* Grid: Pending Proposals + Safe Sales Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Minhas Propostas Pendentes / Em Análise */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Minhas Propostas em Andamento</span>
            </h2>
            <button
              onClick={onNavigateToPropostas}
              className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
            >
              Ver todas
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {sellerPendingProps.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Nenhuma proposta pendente no momento. Bom trabalho!
              </p>
            ) : (
              sellerPendingProps.map((p) => (
                <div key={p.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{p.nomeCliente}</span>
                    <p className="text-[11px] text-slate-500">
                      {p.operacao} · {p.banco} · Contrato #{p.numeroContrato}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(p.valorEmprestimo)}
                    </span>
                    <span className="block text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full mt-0.5">
                      {p.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ranking de Vendas da Loja (Sem dados financeiros confidenciais da empresa) */}
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
              const isMe = rep.nome === sellerName;

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
