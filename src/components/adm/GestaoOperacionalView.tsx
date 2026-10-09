import React, { useState, useMemo, useEffect } from 'react';
import {
  Share2,
  BarChart3,
  CheckCircle2,
  Layers,
  Calculator,
  Users
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { AlertaOportunidade, MetaDigitador } from '../../types';
import {
  formatPercent,
  getMonthYearLabel,
  cleanPersonName,
  getLocalDateString
} from '../../utils/formatters';

export const GestaoOperacionalView: React.FC = () => {
  const { metas, propostas, alertas, saveAlerta } = useCRM();
  const { allUsers, currentUser } = useAuth();

  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMesAno, setSelectedMesAno] = useState<string>(currentMonthStr);

  const digitadoresList = useMemo(() => {
    return allUsers.filter(u => u.role === 'digitador' && u.status === 'ativo' && !u.isDeactivated);
  }, [allUsers]);

  const [selectedDigitadorId, setSelectedDigitadorId] = useState<string>(() => digitadoresList[0]?.id || '');
  useEffect(() => {
    if (digitadoresList.length > 0 && !selectedDigitadorId) {
      setSelectedDigitadorId(digitadoresList[0].id);
    }
  }, [digitadoresList, selectedDigitadorId]);

  const [distMesAno, setDistMesAno] = useState<string>(selectedMesAno);
  const [qtdPortabilidade, setQtdPortabilidade] = useState<number>(20);
  const [qtdRefin, setQtdRefin] = useState<number>(15);
  const [qtdIndicacao, setQtdIndicacao] = useState<number>(10);
  const [qtdAniversario, setQtdAniversario] = useState<number>(10);
  const [qtdMisto, setQtdMisto] = useState<number>(10);
  const [distribuicaoNotice, setDistribuicaoNotice] = useState<string | null>(null);

  const [metasDigitadorasList, setMetasDigitadorasList] = useState<MetaDigitador[]>(() => {
    try {
      const raw = localStorage.getItem('liviacred_metas_digitadora');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  const totalLeadsADistribuir = qtdPortabilidade + qtdRefin + qtdIndicacao + qtdAniversario + qtdMisto;

  const handleDistribuirLeads = (e: React.FormEvent) => {
    e.preventDefault();
    const targetDigitador = allUsers.find(u => u.id === selectedDigitadorId) || digitadoresList[0];
    if (!targetDigitador) return;

    if (totalLeadsADistribuir <= 0) {
      return;
    }

    const digitadorNome = cleanPersonName(targetDigitador.name);
    const todayStr = getLocalDateString();

    const plan = [
      { tipoKey: 'portabilidade', tipoLead: 'portabilidade', count: qtdPortabilidade, label: 'Portabilidade' },
      { tipoKey: 'refin', tipoLead: 'refin', count: qtdRefin, label: 'Refinanciamento' },
      { tipoKey: 'cartao_credito', tipoLead: 'indicacao', count: qtdIndicacao, label: 'Indicação' },
      { tipoKey: 'aniversario', tipoLead: 'aniversario', count: qtdAniversario, label: 'Saque Aniversário' },
      { tipoKey: 'reativacao', tipoLead: 'misto', count: qtdMisto, label: 'Misto / Reativação' },
    ];

    plan.forEach(p => {
      let assigned = 0;
      alertas.forEach(a => {
        if (assigned >= p.count) return;
        if (a.tipo === p.tipoKey && !a.liberadoParaDigitador) {
          saveAlerta({
            ...a,
            liberadoParaDigitador: true,
            liberadoPor: currentUser?.name || 'Administrador',
            dataLiberacao: todayStr,
            digitadorDestino: digitadorNome,
            tipoLeadDistribuido: p.tipoLead
          });
          assigned++;
        }
      });
    });

    const newMeta: MetaDigitador = {
      id: `meta-dig-${selectedDigitadorId}-${distMesAno}`,
      digitadorId: selectedDigitadorId,
      digitadorNome: digitadorNome,
      mesAno: distMesAno,
      leadsDistribuidos: totalLeadsADistribuir,
      leadsTratados: 0,
      leadsConvertidos: 0,
      taxaAproveitamento: 0,
      dataDistribuicao: todayStr,
      detalhePorTipo: {
        portabilidade: qtdPortabilidade,
        refin: qtdRefin,
        indicacao: qtdIndicacao,
        aniversario: qtdAniversario,
        misto: qtdMisto
      }
    };

    const updatedMetas = [newMeta, ...metasDigitadorasList.filter(m => m.id !== newMeta.id)];
    setMetasDigitadorasList(updatedMetas);
    try {
      localStorage.setItem('liviacred_metas_digitadora', JSON.stringify(updatedMetas));
    } catch {}

    setDistribuicaoNotice(`Sucesso! ${totalLeadsADistribuir} leads distribuídos para ${digitadorNome} na competência ${getMonthYearLabel(distMesAno)}. Metas gravadas no painel gerencial!`);
    setTimeout(() => setDistribuicaoNotice(null), 5000);
  };

  const digitadoraMetrics = useMemo(() => {
    const targetDigitador = allUsers.find(u => u.id === selectedDigitadorId) || digitadoresList[0];
    const digName = targetDigitador ? cleanPersonName(targetDigitador.name) : 'Ana Paula';

    const distributedLeads = alertas.filter(a =>
      a.liberadoParaDigitador === true &&
      (a.digitadorDestino ? a.digitadorDestino.toLowerCase().includes(digName.toLowerCase().split(' ')[0]) : true) &&
      (a.dataLiberacao || a.dataCriacao).startsWith(distMesAno)
    );

    const propsDigitador = propostas.filter(p =>
      p.digitador && p.digitador.toLowerCase().includes(digName.toLowerCase().split(' ')[0]) &&
      (p.dataDigitacao || '').startsWith(distMesAno)
    );

    const tratadasCount = propsDigitador.length;
    const convertidasCount = propsDigitador.filter(p => p.status === 'Paga').length;
    const totalDist = Math.max(distributedLeads.length, totalLeadsADistribuir);
    const aproveitamento = tratadasCount > 0 ? (convertidasCount / tratadasCount) * 100 : (totalDist > 0 ? (convertidasCount / totalDist) * 100 : 0);

    const tipos = [
      {
        tipo: 'Portabilidade',
        distribuidos: distributedLeads.filter(l => l.tipo === 'portabilidade' || l.tipoLeadDistribuido === 'portabilidade').length || qtdPortabilidade,
        tratados: propsDigitador.filter(p => p.operacao === 'Portabilidade' || p.operacao === 'Refin da Port').length,
        convertidos: propsDigitador.filter(p => (p.operacao === 'Portabilidade' || p.operacao === 'Refin da Port') && p.status === 'Paga').length,
      },
      {
        tipo: 'Refinanciamento',
        distribuidos: distributedLeads.filter(l => l.tipo === 'refin' || l.tipoLeadDistribuido === 'refin').length || qtdRefin,
        tratados: propsDigitador.filter(p => p.operacao === 'Refin').length,
        convertidos: propsDigitador.filter(p => p.operacao === 'Refin' && p.status === 'Paga').length,
      },
      {
        tipo: 'Indicação',
        distribuidos: distributedLeads.filter(l => l.tipo === 'cartao_credito' || l.tipoLeadDistribuido === 'indicacao').length || qtdIndicacao,
        tratados: propsDigitador.filter(p => p.operacao === 'Cartão de Crédito' || p.operacao === 'Cartão Novo').length,
        convertidos: propsDigitador.filter(p => (p.operacao === 'Cartão de Crédito' || p.operacao === 'Cartão Novo') && p.status === 'Paga').length,
      },
      {
        tipo: 'Saque Aniversário (FGTS)',
        distribuidos: distributedLeads.filter(l => l.tipo === 'aniversario' || l.tipoLeadDistribuido === 'aniversario').length || qtdAniversario,
        tratados: propsDigitador.filter(p => p.operacao === 'FGTS').length,
        convertidos: propsDigitador.filter(p => p.operacao === 'FGTS' && p.status === 'Paga').length,
      },
      {
        tipo: 'Misto / Reativação',
        distribuidos: distributedLeads.filter(l => l.tipoLeadDistribuido === 'misto' || l.tipo === 'reativacao').length || qtdMisto,
        tratados: propsDigitador.filter(p => p.operacao !== 'Portabilidade' && p.operacao !== 'Refin da Port' && p.operacao !== 'Refin' && p.operacao !== 'Cartão de Crédito' && p.operacao !== 'Cartão Novo' && p.operacao !== 'FGTS').length,
        convertidos: propsDigitador.filter(p => p.operacao !== 'Portabilidade' && p.operacao !== 'Refin da Port' && p.operacao !== 'Refin' && p.operacao !== 'Cartão de Crédito' && p.operacao !== 'Cartão Novo' && p.operacao !== 'FGTS' && p.status === 'Paga').length,
      }
    ];

    return {
      digName,
      totalDist,
      tratadasCount,
      convertidasCount,
      aproveitamento,
      tipos
    };
  }, [allUsers, selectedDigitadorId, digitadoresList, alertas, propostas, distMesAno, totalLeadsADistribuir, qtdPortabilidade, qtdRefin, qtdIndicacao, qtdAniversario, qtdMisto]);

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Share2 className="w-6 h-6 text-teal-600" />
            <span>Gestão Operacional & Metas da Digitadora</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribuição centralizada de oportunidades e acompanhamento de desempenho da digitadora.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Notification */}
        {distribuicaoNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{distribuicaoNotice}</span>
          </div>
        )}

        {/* 1. Ferramenta de Distribuição de Oportunidades & Metas */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-teal-600" />
                <span>Distribuição de Oportunidades & Metas da Digitadora</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina os volumes de leads liberados por tipo e registre as metas de conversão da digitadora para o período.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="month"
                value={distMesAno}
                onChange={(e) => setDistMesAno(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <form onSubmit={handleDistribuirLeads} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selecionar Digitadora Responsável:
                </label>
                <select
                  value={selectedDigitadorId}
                  onChange={(e) => setSelectedDigitadorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                >
                  {digitadoresList.map(d => (
                    <option key={d.id} value={d.id}>{cleanPersonName(d.name)} ({d.email})</option>
                  ))}
                  {digitadoresList.length === 0 && (
                    <option value="">Nenhuma digitadora cadastrada (Cadastre no Menu de Usuários)</option>
                  )}
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 block">Total a Distribuir:</span>
                  <span className="text-lg font-black text-teal-900 dark:text-white">
                    {totalLeadsADistribuir} Leads
                  </span>
                </div>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs active:scale-95 transition flex items-center gap-1.5 shrink-0"
                >
                  <Share2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Distribuir e Salvar Meta</span>
                </button>
              </div>
            </div>

            {/* Campos de Quantidade por Tipo */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                Deseja distribuir para a digitadora:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Portabilidade */}
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Leads de Portabilidade
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={qtdPortabilidade}
                      onChange={(e) => setQtdPortabilidade(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2.5 py-1 text-sm font-black rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Contratos Port</span>
                  </div>
                </div>

                {/* Refinanciamento */}
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Leads de Refin
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={qtdRefin}
                      onChange={(e) => setQtdRefin(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2.5 py-1 text-sm font-black rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Refinanciamentos</span>
                  </div>
                </div>

                {/* Indicação */}
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Leads de Indicação
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={qtdIndicacao}
                      onChange={(e) => setQtdIndicacao(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2.5 py-1 text-sm font-black rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Indicações e Cartão</span>
                  </div>
                </div>

                {/* Saque Aniversário / FGTS */}
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Leads de Aniversário
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={qtdAniversario}
                      onChange={(e) => setQtdAniversario(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2.5 py-1 text-sm font-black rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Saque Aniversário</span>
                  </div>
                </div>

                {/* Misto / Reativação */}
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Leads Mistos / Outros
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={qtdMisto}
                      onChange={(e) => setQtdMisto(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2.5 py-1 text-sm font-black rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Carteira Mista</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* 2. Painel Gerencial de Desempenho & Metas da Digitadora */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <span>Painel Gerencial de Desempenho da Digitadora</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhamento de conversão, leads tratados e aproveitamento de <strong>{digitadoraMetrics.digName}</strong> em {getMonthYearLabel(distMesAno)}.
              </p>
            </div>

            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              Competência: {getMonthYearLabel(distMesAno)}
            </span>
          </div>

          {/* 4 KPIs de Alto Nível para a Gerência */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <span className="text-xs font-bold text-slate-500">Leads Distribuídos (Meta)</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {digitadoraMetrics.totalDist}
              </p>
              <span className="text-[11px] text-slate-400">Total liberado no período</span>
            </div>

            <div className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-800 space-y-1">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Leads Tratados</span>
              <p className="text-2xl font-black text-blue-800 dark:text-blue-300 tabular-nums">
                {digitadoraMetrics.tratadasCount}
              </p>
              <span className="text-[11px] text-blue-600">Simulações & propostas digitadas</span>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800 space-y-1">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Convertidos com Sucesso</span>
              <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 tabular-nums">
                {digitadoraMetrics.convertidasCount}
              </p>
              <span className="text-[11px] text-emerald-600">Contratos formalizados e pagos</span>
            </div>

            <div className="bg-purple-50/60 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-800 space-y-1">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Taxa de Aproveitamento</span>
              <p className="text-2xl font-black text-purple-800 dark:text-purple-300 tabular-nums">
                {formatPercent(digitadoraMetrics.aproveitamento)}
              </p>
              <span className="text-[11px] text-purple-600">Conversão real no período</span>
            </div>
          </div>

          {/* Barra Visual de Aproveitamento */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 dark:from-slate-800/80 dark:via-slate-800 dark:to-slate-800/60 border border-indigo-200/80 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 dark:text-slate-200">
              <span>Eficiência & Aproveitamento Operacional</span>
              <span className="text-purple-700 dark:text-purple-300 font-mono">
                {digitadoraMetrics.convertidasCount} de {digitadoraMetrics.tratadasCount || digitadoraMetrics.totalDist} convertidos ({formatPercent(digitadoraMetrics.aproveitamento)})
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(2, digitadoraMetrics.aproveitamento))}%` }}
              />
            </div>
          </div>

          {/* Tabela Detalhada de Aproveitamento por Tipo de Lead */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Detalhamento de Aproveitamento por Modalidade:
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase text-[10px] font-extrabold">
                    <th className="py-2.5 px-3">Modalidade de Oportunidade</th>
                    <th className="py-2.5 px-3 text-center">Leads Distribuídos</th>
                    <th className="py-2.5 px-3 text-center">Leads Tratados</th>
                    <th className="py-2.5 px-3 text-center">Convertidos (Pagos)</th>
                    <th className="py-2.5 px-3 text-right">Aproveitamento (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {digitadoraMetrics.tipos.map((item) => {
                    const taxa = item.tratados > 0 ? (item.convertidos / item.tratados) * 100 : (item.distribuidos > 0 ? (item.convertidos / item.distribuidos) * 100 : 0);

                    return (
                      <tr key={item.tipo} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.tipo}</span>
                        </td>
                        <td className="py-3 px-3 text-center tabular-nums text-slate-700 dark:text-slate-300 font-bold">
                          {item.distribuidos}
                        </td>
                        <td className="py-3 px-3 text-center tabular-nums text-blue-600 font-bold">
                          {item.tratados}
                        </td>
                        <td className="py-3 px-3 text-center tabular-nums text-emerald-600 font-bold">
                          {item.convertidos}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black tabular-nums ${
                            taxa >= 50 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            taxa >= 25 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {formatPercent(taxa)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
