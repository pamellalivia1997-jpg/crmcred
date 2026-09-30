import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Share2,
  Copy,
  Check,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Receipt,
  Download
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Operacao, Promotora } from '../../types';

export const RelatoriosSemanalMensal: React.FC = () => {
  const { propostas, metas, contasPagar, comissoesPromotoras } = useCRM();
  const { allUsers } = useAuth();

  const [activeTab, setActiveTab] = useState<'semanal' | 'faturamento'>('semanal');
  const [copiado, setCopiado] = useState(false);

  const reps = ['Hellen Vasconcelos', 'Loja Igarassu (Balcão)', 'Taciana Silva', 'Lucélia Ramos', 'Pamella'];
  const operacoesDestaque: Operacao[] = ['FGTS', 'Portabilidade', 'Refin', 'Margem', 'Conta de Energia Elétrica/Luz', 'Cartão Novo'];

  // Current month proposals (2026-09)
  const currentMonthPaidPropostas = useMemo(() => {
    return propostas.filter(p => p.dataDigitacao.startsWith('2026-09') && p.status === 'Paga');
  }, [propostas]);

  // Matrix: Operacao x Vendedora (Vendas e % de taxa)
  const matrixData = useMemo(() => {
    const list = reps.map(repName => {
      const repProps = currentMonthPaidPropostas.filter(p => p.vendedora === repName);
      const totalVendaRep = repProps.reduce((acc, p) => acc + p.valorEmprestimo, 0);
      const totalTaxaRep = repProps.reduce((acc, p) => acc + p.valorTaxa, 0);
      const percentTaxaGeral = totalVendaRep > 0 ? (totalTaxaRep / totalVendaRep) * 100 : 0;

      const userMeta = metas.find(m => m.vendedoraNome === repName && m.mesAno === '2026-09')?.metaVenda || 75000;
      const atingimento = userMeta > 0 ? (totalVendaRep / userMeta) * 100 : 0;
      const quantoFalta = Math.max(0, userMeta - totalVendaRep);

      // By operation
      const opsBreakdown: Record<string, { venda: number; taxa: number; percent: number }> = {};
      operacoesDestaque.forEach(op => {
        const ops = repProps.filter(p => p.operacao === op);
        const venda = ops.reduce((acc, p) => acc + p.valorEmprestimo, 0);
        const taxa = ops.reduce((acc, p) => acc + p.valorTaxa, 0);
        const percent = venda > 0 ? (taxa / venda) * 100 : 0;
        opsBreakdown[op] = { venda, taxa, percent };
      });

      return {
        repName,
        totalVendaRep,
        totalTaxaRep,
        percentTaxaGeral,
        userMeta,
        atingimento,
        quantoFalta,
        opsBreakdown
      };
    });

    // Check sales of ex-collaborators or unmapped reps
    const outrosProps = currentMonthPaidPropostas.filter(p => !reps.includes(p.vendedora));
    if (outrosProps.length > 0) {
      const totalVendaRep = outrosProps.reduce((acc, p) => acc + p.valorEmprestimo, 0);
      const totalTaxaRep = outrosProps.reduce((acc, p) => acc + p.valorTaxa, 0);
      const percentTaxaGeral = totalVendaRep > 0 ? (totalTaxaRep / totalVendaRep) * 100 : 0;
      const opsBreakdown: Record<string, { venda: number; taxa: number; percent: number }> = {};
      operacoesDestaque.forEach(op => {
        const ops = outrosProps.filter(p => p.operacao === op);
        const venda = ops.reduce((acc, p) => acc + p.valorEmprestimo, 0);
        const taxa = ops.reduce((acc, p) => acc + p.valorTaxa, 0);
        const percent = venda > 0 ? (taxa / venda) * 100 : 0;
        opsBreakdown[op] = { venda, taxa, percent };
      });
      list.push({
        repName: 'Outros',
        totalVendaRep,
        totalTaxaRep,
        percentTaxaGeral,
        userMeta: 0,
        atingimento: 100,
        quantoFalta: 0,
        opsBreakdown
      });
    }

    return list;
  }, [currentMonthPaidPropostas, metas]);

  // Total sums of matrix
  const totalGeralVendas = matrixData.reduce((acc, r) => acc + r.totalVendaRep, 0);
  const totalGeralTaxas = matrixData.reduce((acc, r) => acc + r.totalTaxaRep, 0);
  const totalGeralMeta = matrixData.reduce((acc, r) => acc + r.userMeta, 0);
  const totalGeralAtingimento = totalGeralMeta > 0 ? (totalGeralVendas / totalGeralMeta) * 100 : 0;
  const totalGeralFalta = Math.max(0, totalGeralMeta - totalGeralVendas);

  // Análise do Faturamento: Por vendedora (pagos, taxas, comissão por promotora, taxa + comissão, custo, rentabilidade)
  const faturamentoPorVendedora = useMemo(() => {
    return matrixData.map(rep => {
      const isOutros = rep.repName.includes('Outros');
      const user = allUsers.find(u => u.name === rep.repName);
      const custo = isOutros ? 0 : (user?.baseSalaryCost || 2200);
      const comissaoPromotoraEst = Math.round(rep.totalVendaRep * 0.045);
      const taxaMaisComissao = rep.totalTaxaRep + comissaoPromotoraEst;
      const rentabilidade = taxaMaisComissao - custo;

      return {
        ...rep,
        custo,
        comissaoPromotoraEst,
        taxaMaisComissao,
        rentabilidade
      };
    });
  }, [matrixData, allUsers]);

  // Promotoras received amounts
  const promotorasRecebidos = useMemo(() => {
    const map = new Map<Promotora, number>();
    comissoesPromotoras
      .filter(c => c.dataRecebimento.startsWith('2026-09') && c.status === 'confirmada')
      .forEach(c => {
        map.set(c.promotora, (map.get(c.promotora) || 0) + c.valorRecebido);
      });
    return Array.from(map.entries()).map(([promotora, valor]) => ({ promotora, valor }));
  }, [comissoesPromotoras]);

  const totalComissoesPromotorasMes = promotorasRecebidos.reduce((acc, p) => acc + p.valor, 0);
  const totalFaturamentoMes = totalGeralTaxas + totalComissoesPromotorasMes;
  const totalDespesasMes = contasPagar
    .filter(c => c.vencimento.startsWith('2026-09'))
    .reduce((acc, c) => acc + c.valor, 0) + 13500;
  const lucroLiquidoMes = totalFaturamentoMes - totalDespesasMes;

  const exportTextWeekly = () => {
    return `📊 *ANÁLISE DE VENDAS E ACOMPANHAMENTO SEMANAL*
🏢 *Lívia Cred Saúde • Setembro/2026*

💰 *Total Realizado:* ${formatCurrency(totalGeralVendas)}
🎯 *Meta Loja:* ${formatCurrency(totalGeralMeta)} (${formatPercent(totalGeralAtingimento)})
⏳ *Faltam:* ${formatCurrency(totalGeralFalta)}
🏷️ *Taxas Líquidas:* ${formatCurrency(totalGeralTaxas)} (${formatPercent((totalGeralTaxas / totalGeralVendas) * 100)})

👩‍💼 *POR VENDEDORA:*
${matrixData.map(r => `• *${r.repName}:* ${formatCurrency(r.totalVendaRep)} | Taxa: ${formatPercent(r.percentTaxaGeral)} | Atingimento: ${formatPercent(r.atingimento)}`).join('\n')}

_Relatório oficial gerado via Lívia Cred Saúde CRM_`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportTextWeekly());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#0F5C63]" />
            <span>Relatórios Gerenciais</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Demonstrativos semanais e mensais formatados para apresentação e diretoria
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Selector */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('semanal')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'semanal'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Acompanhamento Semanal
            </button>
            <button
              onClick={() => setActiveTab('faturamento')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'faturamento'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Análise do Faturamento
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white text-xs font-bold shadow-xs transition-colors"
            title="Copiar texto para WhatsApp"
          >
            {copiado ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiado ? 'Copiado!' : 'Copiar p/ WhatsApp'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
            title="Imprimir ou Salvar PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeTab === 'semanal' ? (
        /* TAB 1: Análise de Vendas e Acompanhamento Semanal */
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Total Realizado</span>
              <p className="text-xl font-extrabold text-[#0B2A4A] dark:text-white tabular-nums mt-0.5">
                {formatCurrency(totalGeralVendas)}
              </p>
              <p className="text-[11px] text-slate-400">Empréstimos pagos</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Meta Global</span>
              <p className="text-xl font-extrabold text-slate-800 dark:text-white tabular-nums mt-0.5">
                {formatCurrency(totalGeralMeta)}
              </p>
              <p className="text-[11px] text-teal-600 font-bold tabular-nums">
                {formatPercent(totalGeralAtingimento)} atingido
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Quanto Falta</span>
              <p className="text-xl font-extrabold text-amber-600 tabular-nums mt-0.5">
                {formatCurrency(totalGeralFalta)}
              </p>
              <p className="text-[11px] text-slate-400">Até o fim do mês</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Taxas Arrecadadas</span>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                {formatCurrency(totalGeralTaxas)}
              </p>
              <p className="text-[11px] text-slate-400">
                {formatPercent((totalGeralTaxas / totalGeralVendas) * 100)} de média
              </p>
            </div>
          </div>

          {/* Matrix Table: Operação x Vendedora */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Análise de Vendas por Operação × Vendedora
              </h2>
              <p className="text-xs text-slate-500">
                Valores de venda contratada e percentual de taxa de assessoria gerado
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Vendedora</th>
                    {operacoesDestaque.map(op => (
                      <th key={op} className="py-3 px-2 text-right">{op}</th>
                    ))}
                    <th className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">Total Venda</th>
                    <th className="py-3 px-3 text-right font-bold text-amber-600">% Taxa</th>
                    <th className="py-3 px-3 text-right">Meta</th>
                    <th className="py-3 px-3 text-right font-bold text-emerald-600">Atingimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {matrixData.map((row) => (
                    <tr key={row.repName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {row.repName}
                      </td>

                      {operacoesDestaque.map(op => {
                        const cell = row.opsBreakdown[op];
                        return (
                          <td key={op} className="py-3 px-2 text-right tabular-nums whitespace-nowrap">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {cell.venda > 0 ? formatCurrency(cell.venda) : '-'}
                            </span>
                            {cell.venda > 0 && (
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                {formatPercent(cell.percent)}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 text-right font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        {formatCurrency(row.totalVendaRep)}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                        {formatPercent(row.percentTaxaGeral)}
                      </td>

                      <td className="py-3 px-3 text-right tabular-nums text-slate-500 whitespace-nowrap">
                        {formatCurrency(row.userMeta)}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black ${
                          row.atingimento >= 100
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : row.atingimento >= 80
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {formatPercent(row.atingimento)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-white">
                    <td className="py-3 px-3 uppercase text-[11px]">Totais Gerais</td>
                    {operacoesDestaque.map(op => {
                      const totalOp = matrixData.reduce((acc, r) => acc + (r.opsBreakdown[op]?.venda || 0), 0);
                      return (
                        <td key={op} className="py-3 px-2 text-right tabular-nums">
                          {formatCurrency(totalOp)}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-right tabular-nums font-black text-sm text-[#0F5C63] dark:text-[#28B0B7]">
                      {formatCurrency(totalGeralVendas)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {formatPercent((totalGeralTaxas / totalGeralVendas) * 100)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatCurrency(totalGeralMeta)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-black">
                      {formatPercent(totalGeralAtingimento)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: Análise do Faturamento e DRE */
        <div className="space-y-4">
          {/* Executive Results Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Faturamento Bruto Consolidado</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                {formatCurrency(totalFaturamentoMes)}
              </p>
              <p className="text-[11px] text-teal-600">Taxas + Comissões Promotoras</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Despesas & Custos do Mês</span>
              <p className="text-2xl font-black text-rose-600 tabular-nums mt-0.5">
                {formatCurrency(totalDespesasMes)}
              </p>
              <p className="text-[11px] text-slate-400">Estrutura + Salários Fixos</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-4 rounded-2xl shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Lucro Líquido do Mês</span>
              <p className="text-2xl font-black tabular-nums mt-0.5">
                {formatCurrency(lucroLiquidoMes)}
              </p>
              <p className="text-[11px] text-emerald-100">
                Margem Líquida: {formatPercent((lucroLiquidoMes / totalFaturamentoMes) * 100)}
              </p>
            </div>
          </div>

          {/* Table: Análise de Faturamento por Vendedora */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Faturamento & Rentabilidade por Vendedora
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Demonstrativo detalhado de pagamentos, taxas, comissões recebidas, custos e rentabilidade individual
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Vendedora</th>
                    <th className="py-2.5 px-3 text-right">Contratos Pagos</th>
                    <th className="py-2.5 px-3 text-right">Taxas (R$)</th>
                    <th className="py-2.5 px-3 text-right">Comissões Promotoras</th>
                    <th className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-white">Taxa + Comissão</th>
                    <th className="py-2.5 px-3 text-right text-rose-500">Custo Fixo</th>
                    <th className="py-2.5 px-3 text-right font-black text-emerald-600">Rentabilidade Líquida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {faturamentoPorVendedora.map((rep) => (
                    <tr key={rep.repName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{rep.repName}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(rep.totalVendaRep)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-amber-600 dark:text-amber-400 font-bold">{formatCurrency(rep.totalTaxaRep)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-blue-600">{formatCurrency(rep.comissaoPromotoraEst)}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-extrabold text-slate-900 dark:text-white">{formatCurrency(rep.taxaMaisComissao)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-rose-500">-{formatCurrency(rep.custo)}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(rep.rentabilidade)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Promotoras Breakdown Detail */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Repasses Recebidos das Promotoras no Período
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Comissões de esteiras bancárias lançadas pelo setor financeiro
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {promotorasRecebidos.map(p => (
                <div key={p.promotora} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{p.promotora}</p>
                  <p className="text-base font-extrabold text-teal-700 dark:text-teal-400 tabular-nums mt-1">
                    {formatCurrency(p.valor)}
                  </p>
                  <p className="text-[10px] text-slate-400">Extratos confirmados</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
