import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  PlusCircle,
  FileCheck2,
  Search,
  Check,
  X
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { ComissaoPromotora, ContaPagar, Proposta, Promotora } from '../../types';
import { formatCurrency, formatPercent, formatDate, getLocalDateString } from '../../utils/formatters';
import { calcularComissaoVendedoraMes } from '../../utils/commissionRules';

export const FinanceiroView: React.FC = () => {
  const {
    propostas,
    comissoesPromotoras,
    contasPagar,
    metas,
    saveComissaoPromotora,
    saveContaPagar,
    marcarContaPaga
  } = useCRM();
  const { allUsers, currentUser } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'promotoras' | 'conferencia' | 'contas_pagar' | 'fechamento_vendedoras' | 'dre'>('promotoras');

  // Lançamento comissão promotora modal/form state
  const [selectedContratoBusca, setSelectedContratoBusca] = useState('');
  const [propostaSelecionada, setPropostaSelecionada] = useState<Proposta | null>(null);
  const [valorComissaoStr, setValorComissaoStr] = useState('');
  const [promotoraLancamento, setPromotoraLancamento] = useState<Promotora>('J2 Promotora');
  const [comissaoSalvaSucesso, setComissaoSalvaSucesso] = useState(false);

  // Nova Conta a Pagar modal state
  const [isNovaContaModalOpen, setIsNovaContaModalOpen] = useState(false);
  const [novaContaDescricao, setNovaContaDescricao] = useState('');
  const [novaContaValorStr, setNovaContaValorStr] = useState('');
  const [novaContaCategoria, setNovaContaCategoria] = useState<ContaPagar['categoria']>('Despesas Gerais');
  const [novaContaVencimento, setNovaContaVencimento] = useState('2026-10-10');

  // Paid propostas
  const paidPropostas = useMemo(() => propostas.filter(p => p.status === 'Paga'), [propostas]);

  // Contratos pagos sem comissão de promotora lançada (Pendências de conferência)
  const pendenciasConferencia = useMemo(() => {
    const launchedIds = new Set(
      comissoesPromotoras
        .filter(c => c.status === 'confirmada' && c.valorRecebido > 0)
        .map(c => c.propostaId)
    );

    return paidPropostas.filter(p => !launchedIds.has(p.id));
  }, [paidPropostas, comissoesPromotoras]);

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

  // Fechamento das comissões das vendedoras
  const sellers = useMemo(() => allUsers.filter(u => u.role === 'vendedora'), [allUsers]);
  const fechamentoVendedoras = useMemo(() => {
    return sellers.map(seller => {
      const sellerMeta = metas.find(m => m.vendedoraId === seller.id && m.mesAno === currentMonthYear);
      return calcularComissaoVendedoraMes(
        seller.id,
        seller.name,
        currentMonthYear,
        propostas,
        sellerMeta,
        true // atingiu meta coletiva
      );
    });
  }, [sellers, metas, propostas, currentMonthYear]);

  // DRE figures
  const totalTaxas = useMemo(() => {
    return paidPropostas
      .filter(p => p.dataDigitacao.startsWith(currentMonthYear))
      .reduce((acc, p) => acc + p.valorTaxa, 0);
  }, [paidPropostas, currentMonthYear]);

  const totalComissoesPromotorasConfirmadas = useMemo(() => {
    return comissoesPromotoras
      .filter(c => c.dataRecebimento.startsWith(currentMonthYear) && c.status === 'confirmada')
      .reduce((acc, c) => acc + c.valorRecebido, 0);
  }, [comissoesPromotoras, currentMonthYear]);

  const faturamentoTotal = totalTaxas + totalComissoesPromotorasConfirmadas;

  const totalContasPagarMes = useMemo(() => {
    return contasPagar
      .filter(c => c.vencimento.startsWith(currentMonthYear))
      .reduce((acc, c) => acc + c.valor, 0);
  }, [contasPagar, currentMonthYear]);

  const totalComissoesEquipe = fechamentoVendedoras.reduce((acc, f) => acc + f.totalAPagar, 0);
  const totalSalariosFixos = sellers.reduce((acc, s) => acc + s.baseSalaryCost, 0) + 3500; // ADM + sellers
  const despesasOperacionaisTotais = totalContasPagarMes + totalSalariosFixos + totalComissoesEquipe;
  const lucroLiquidoDRE = faturamentoTotal - despesasOperacionaisTotais;

  // Handle buscar proposta por número de contrato
  const handleBuscarContrato = () => {
    const clean = selectedContratoBusca.trim();
    if (!clean) return;
    const found = propostas.find(p => p.numeroContrato === clean || p.cpf.includes(clean));
    if (found) {
      setPropostaSelecionada(found);
      setPromotoraLancamento(found.promotora);
      // Auto estimate 4.5%
      setValorComissaoStr(Math.round(found.valorEmprestimo * 0.045).toString());
    } else {
      alert('Nenhum contrato encontrado com esse número ou CPF.');
    }
  };

  // Handle salvar comissão promotora
  const handleSalvarComissao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propostaSelecionada) return;

    const valor = parseFloat(valorComissaoStr) || 0;
    const novaCom: ComissaoPromotora = {
      id: `com-prom-${Date.now()}`,
      propostaId: propostaSelecionada.id,
      numeroContrato: propostaSelecionada.numeroContrato,
      clienteNome: propostaSelecionada.nomeCliente,
      promotora: promotoraLancamento,
      valorRecebido: valor,
      dataRecebimento: getLocalDateString(),
      tipo: 'percentual',
      status: 'confirmada',
      observacao: 'Lançado no painel financeiro.'
    };

    saveComissaoPromotora(novaCom);
    setComissaoSalvaSucesso(true);
    setPropostaSelecionada(null);
    setSelectedContratoBusca('');
    setValorComissaoStr('');
    setTimeout(() => setComissaoSalvaSucesso(false), 2500);
  };

  // Handle salvar nova conta a pagar
  const handleSalvarContaPagar = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(novaContaValorStr) || 0;
    if (!novaContaDescricao.trim() || val <= 0) return;

    const novaConta: ContaPagar = {
      id: `cp-${Date.now()}`,
      descricao: novaContaDescricao.trim(),
      categoria: novaContaCategoria,
      valor: val,
      vencimento: novaContaVencimento,
      recorrente: true,
      status: 'pendente'
    };

    saveContaPagar(novaConta);
    setIsNovaContaModalOpen(false);
    setNovaContaDescricao('');
    setNovaContaValorStr('');
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            <span>Controladoria & Gestão Financeira</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Comissões recebidas das promotoras, conferência de extratos, contas a pagar e fechamento de equipe
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('promotoras')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeSubTab === 'promotoras'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Lançar Promotoras
          </button>
          <button
            onClick={() => setActiveSubTab('conferencia')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeSubTab === 'conferencia'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>Conferência</span>
            {pendenciasConferencia.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {pendenciasConferencia.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('contas_pagar')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeSubTab === 'contas_pagar'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Contas a Pagar
          </button>
          <button
            onClick={() => setActiveSubTab('fechamento_vendedoras')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeSubTab === 'fechamento_vendedoras'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Comissões Vendedoras
          </button>
          <button
            onClick={() => setActiveSubTab('dre')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeSubTab === 'dre'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            DRE & Resultado
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LANÇAR COMISSÃO PROMOTORA */}
      {activeSubTab === 'promotoras' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Lançar Comissão Recebida
              </h2>
              <p className="text-xs text-slate-500">
                Informe o número do contrato ou CPF da proposta para vincular o repasse
              </p>
            </div>

            {comissaoSalvaSucesso && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Comissão lançada com sucesso no financeiro!</span>
              </div>
            )}

            {/* Step 1: Search Contract */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Buscar Contrato ou CPF do Cliente
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: 482025 ou CPF..."
                  value={selectedContratoBusca}
                  onChange={(e) => setSelectedContratoBusca(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleBuscarContrato}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Localizar
                </button>
              </div>
            </div>

            {/* Step 2: Fill Commission Details */}
            {propostaSelecionada && (
              <form onSubmit={handleSalvarComissao} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 space-y-1">
                  <p className="font-bold text-teal-900 dark:text-teal-200">
                    {propostaSelecionada.nomeCliente} · Contrato #{propostaSelecionada.numeroContrato}
                  </p>
                  <p className="text-[11px] text-teal-800 dark:text-teal-300">
                    Operação: {propostaSelecionada.operacao} · Banco: {propostaSelecionada.banco} · Venda: {formatCurrency(propostaSelecionada.valorEmprestimo)}
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Promotora Pagadora
                  </label>
                  <select
                    value={promotoraLancamento}
                    onChange={(e) => setPromotoraLancamento(e.target.value as Promotora)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="J2 Promotora">J2 Promotora</option>
                    <option value="Sempre">Sempre</option>
                    <option value="DG">DG</option>
                    <option value="GFT">GFT</option>
                    <option value="Direto Banco">Direto Banco</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Valor Recebido da Promotora (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={valorComissaoStr}
                    onChange={(e) => setValorComissaoStr(e.target.value)}
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  Confirmar Recebimento da Comissão
                </button>
              </form>
            )}
          </div>

          {/* List of recent launched commissions */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Comissões Lançadas Recentemente ({comissoesPromotoras.length})
            </h2>

            <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
              {comissoesPromotoras.map((c) => (
                <div key={c.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{c.clienteNome}</span>
                    <span className="text-[11px] text-slate-400 ml-1.5 font-mono">#{c.numeroContrato}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Promotora: <strong>{c.promotora}</strong> · Recebido em: {c.dataRecebimento ? formatDate(c.dataRecebimento) : 'Aguardando'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-teal-700 dark:text-teal-400 tabular-nums">
                      {formatCurrency(c.valorRecebido)}
                    </span>
                    <span className={`block text-[10px] font-bold ${c.status === 'confirmada' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CONFERÊNCIA & PENDÊNCIAS */}
      {activeSubTab === 'conferencia' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-500" />
                <span>Conferência de Extratos & Pendências de Repasse</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Contratos já pagos ao cliente no banco, mas que ainda não tiveram comissão de promotora lançada
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
              {pendenciasConferencia.length} Pendências de Repasse
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Contrato</th>
                  <th className="py-2.5 px-3">Data Pgto Cliente</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Operação</th>
                  <th className="py-2.5 px-3">Banco</th>
                  <th className="py-2.5 px-3">Promotora Esperada</th>
                  <th className="py-2.5 px-3 text-right">Venda (R$)</th>
                  <th className="py-2.5 px-3 text-right text-amber-600 font-bold">Comissão Estimada (4,5%)</th>
                  <th className="py-2.5 px-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {pendenciasConferencia.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Parabéns! Todos os contratos pagos já tiveram comissões confirmadas e conciliadas.
                    </td>
                  </tr>
                ) : (
                  pendenciasConferencia.map((p) => {
                    const est = Math.round(p.valorEmprestimo * 0.045);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono">#{p.numeroContrato}</td>
                        <td className="py-2.5 px-3 tabular-nums">{p.dataPagamentoCliente ? formatDate(p.dataPagamentoCliente) : '-'}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{p.nomeCliente}</td>
                        <td className="py-2.5 px-3">{p.operacao}</td>
                        <td className="py-2.5 px-3">{p.banco}</td>
                        <td className="py-2.5 px-3 font-semibold text-teal-700 dark:text-teal-400">{p.promotora}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(p.valorEmprestimo)}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-amber-600 tabular-nums">
                          {formatCurrency(est)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              setPropostaSelecionada(p);
                              setPromotoraLancamento(p.promotora);
                              setValorComissaoStr(est.toString());
                              setActiveSubTab('promotoras');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px]"
                          >
                            Conciliar Agora
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

      {/* SUB-TAB 3: CONTAS A PAGAR */}
      {activeSubTab === 'contas_pagar' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-500" />
                <span>Contas a Pagar & Despesas Operacionais</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Controle de aluguel, sistemas, internet, energia e despesas gerais da loja
              </p>
            </div>

            <button
              onClick={() => setIsNovaContaModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2A4A] dark:bg-teal-600 hover:bg-[#163E68] text-white font-bold text-xs shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Despesa</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Descrição da Despesa</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3 text-right">Valor (R$)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {contasPagar.map((cp) => (
                  <tr key={cp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{cp.descricao}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {cp.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-3 tabular-nums text-slate-500">{formatDate(cp.vencimento)}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(cp.valor)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cp.status === 'paga' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        cp.status === 'atrasada' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {cp.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {cp.status !== 'paga' && (
                        <button
                          onClick={() => marcarContaPaga(cp.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                        >
                          Marcar Paga
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: FECHAMENTO DE COMISSÕES DAS VENDEDORAS */}
      {activeSubTab === 'fechamento_vendedoras' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <span>Fechamento de Comissões a Pagar às Vendedoras</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cálculo baseado nas regras isoladas em /utils/commissionRules.ts (Comissão sobre taxas, contratos digitados e bônus de metas)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Vendedora</th>
                  <th className="py-2.5 px-3 text-right">Vendas Pagas</th>
                  <th className="py-2.5 px-3 text-right">Taxas Arrecadadas</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-amber-600">Comissão Taxa</th>
                  <th className="py-2.5 px-3 text-right">Bônus Digitação</th>
                  <th className="py-2.5 px-3 text-right">Bônus Cartões</th>
                  <th className="py-2.5 px-3 text-right">Bônus Meta Loja</th>
                  <th className="py-2.5 px-3 text-right font-black text-emerald-600 text-sm">Total a Pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {fechamentoVendedoras.map((f) => (
                  <tr key={f.vendedoraId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{f.vendedoraNome}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(f.totalVendas)}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-amber-600 font-bold">{formatCurrency(f.totalTaxas)}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-amber-600">{formatCurrency(f.comissaoTaxas)}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(f.comissaoDigitacao)}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(f.comissaoCartao)}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-emerald-600">{formatCurrency(f.bonusMeta)}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(f.totalAPagar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: DRE & DEMONSTRATIVO DO RESULTADO DO MÊS */}
      {activeSubTab === 'dre' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 max-w-3xl mx-auto">
          <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Demonstrativo de Resultado do Exercício (DRE Sintético)
            </h2>
            <p className="text-xs text-slate-500">
              Lívia Cred Saúde • Competência {competenceLabel}
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
              <span>(+) RECEITA BRUTA COM TAXAS DE ASSESSORIA</span>
              <span className="tabular-nums">{formatCurrency(totalTaxas)}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
              <span>(+) COMISSÕES RECEBIDAS DAS PROMOTORAS</span>
              <span className="tabular-nums">{formatCurrency(totalComissoesPromotorasConfirmadas)}</span>
            </div>

            <div className="flex items-center justify-between py-2.5 bg-teal-50 dark:bg-teal-950/40 px-3 rounded-xl font-extrabold text-[#0F5C63] dark:text-[#28B0B7] text-sm">
              <span>(=) FATURAMENTO BRUTO TOTAL</span>
              <span className="tabular-nums">{formatCurrency(faturamentoTotal)}</span>
            </div>

            <div className="flex items-center justify-between py-2 text-rose-600 font-semibold">
              <span>(-) Despesas Administrativas & Estrutura (Contas a Pagar)</span>
              <span className="tabular-nums">-{formatCurrency(totalContasPagarMes)}</span>
            </div>

            <div className="flex items-center justify-between py-2 text-rose-600 font-semibold">
              <span>(-) Salários e Encargos Fixos da Equipe</span>
              <span className="tabular-nums">-{formatCurrency(totalSalariosFixos)}</span>
            </div>

            <div className="flex items-center justify-between py-2 text-rose-600 font-semibold">
              <span>(-) Comissões a Pagar às Vendedoras</span>
              <span className="tabular-nums">-{formatCurrency(totalComissoesEquipe)}</span>
            </div>

            <div className="flex items-center justify-between py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 rounded-2xl font-black text-base shadow-sm">
              <span>(=) LUCRO LÍQUIDO DO MÊS</span>
              <span className="tabular-nums">{formatCurrency(lucroLiquidoDRE)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Conta a Pagar */}
      {isNovaContaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cadastrar Conta a Pagar
              </h3>
              <button
                onClick={() => setIsNovaContaModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarContaPagar} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição da Conta / Fornecedor
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel Loja Física, Internet..."
                  value={novaContaDescricao}
                  onChange={(e) => setNovaContaDescricao(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={novaContaCategoria}
                  onChange={(e) => setNovaContaCategoria(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Aluguel">Aluguel</option>
                  <option value="Sistemas & Telefonia">Sistemas & Telefonia</option>
                  <option value="Folha de Pagamento">Folha de Pagamento</option>
                  <option value="Impostos">Impostos</option>
                  <option value="Contabilidade">Contabilidade</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Despesas Gerais">Despesas Gerais</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={novaContaValorStr}
                    onChange={(e) => setNovaContaValorStr(e.target.value)}
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data Vencimento
                  </label>
                  <input
                    type="date"
                    required
                    value={novaContaVencimento}
                    onChange={(e) => setNovaContaVencimento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNovaContaModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-teal-600 text-white font-bold"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
