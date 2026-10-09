import React, { useState, useMemo, useEffect } from 'react';
import {
  Target,
  MessageSquare,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  History,
  Check,
  X,
  Calculator,
  UserX,
  UserCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Info,
  Share2,
  TrendingUp,
  Layers,
  BarChart3,
  Users
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { MetaVendedora, Feedback, User } from '../../types';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  cleanPersonName,
  getMonthYearLabel,
  normalizeSellerName,
  getLocalDateString
} from '../../utils/formatters';

interface AdmViewProps {
  initialSubTab?: 'metas' | 'feedbacks';
}

interface SellerMonthMeta {
  vendedoraId: string;
  vendedoraNome: string;
  isAtivo: boolean;
  metaVenda: number;
  metaPercentualTaxa: number;
}

export const AdmView: React.FC<AdmViewProps> = ({ initialSubTab = 'metas' }) => {
  const { metas, feedbacks, saveMeta, saveFeedback } = useCRM();
  const { allUsers, currentUser } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'metas' | 'feedbacks'>(
    initialSubTab === 'feedbacks' ? 'feedbacks' : 'metas'
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Only registered sellers (role === 'vendedora') have individual sales goals
  const sellersList = useMemo(() => {
    return allUsers.filter(u => u.role === 'vendedora');
  }, [allUsers]);

  // ==========================================
  // 1. GESTÃO MENSAL DE METAS DA LOJA
  // ==========================================
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMesAno, setSelectedMesAno] = useState<string>(currentMonthStr);
  const [totalMetaLojaInput, setTotalMetaLojaInput] = useState<number>(400000);
  const [sellerMetasMap, setSellerMetasMap] = useState<Record<string, SellerMonthMeta>>({});
  const [frozenSellers, setFrozenSellers] = useState<Record<string, boolean>>({});
  const [metasSalvasNotice, setMetasSalvasNotice] = useState(false);

  // Load or initialize metas for selected month
  useEffect(() => {
    const existingForMonth = metas.filter(m => m.mesAno === selectedMesAno);
    const existingLoja = existingForMonth.find(m => m.vendedoraId === 'loja');
    const newMap: Record<string, SellerMonthMeta> = {};

    let totalFromExisting = 0;

    sellersList.forEach(s => {
      const admissaoMes = s.dataAdmissao ? s.dataAdmissao.trim().substring(0, 7) : '';
      const desativacaoMes = s.dataDesativacao ? s.dataDesativacao.trim().substring(0, 7) : '';
      const isAdmitted = !admissaoMes || selectedMesAno >= admissaoMes;
      const isDeactivated = Boolean(desativacaoMes && selectedMesAno >= desativacaoMes);

      const found = existingForMonth.find(m => m.vendedoraId === s.id || m.vendedoraNome === s.name);
      if (found) {
        const isAtivoVal = found.isAtivoNoMes !== false && !isDeactivated && (isAdmitted || (found.metaVenda || 0) > 0);
        newMap[s.id] = {
          vendedoraId: s.id,
          vendedoraNome: s.name,
          isAtivo: isAtivoVal,
          metaVenda: found.metaVenda || 0,
          metaPercentualTaxa: found.metaPercentualTaxa ?? s.monthlyTaxPercentGoal ?? 20
        };
        if (isAtivoVal) {
          totalFromExisting += found.metaVenda || 0;
        }
      } else {
        const isAtivoVal = isAdmitted && !isDeactivated && s.status === 'ativo';
        newMap[s.id] = {
          vendedoraId: s.id,
          vendedoraNome: s.name,
          isAtivo: isAtivoVal,
          metaVenda: 0,
          metaPercentualTaxa: s.monthlyTaxPercentGoal ?? 20
        };
      }
    });

    const activeCount = Object.values(newMap).filter(item => item.isAtivo).length;

    if (existingForMonth.length > 0) {
      setTotalMetaLojaInput(existingLoja?.metaVenda ?? (existingForMonth.reduce((sum, m) => sum + (m.vendedoraId !== 'loja' ? (m.metaVenda || 0) : 0), 0) || 400000));
      setSellerMetasMap(newMap);
    } else {
      const initialStoreMeta = 400000;
      const share = activeCount > 0 ? Math.round(initialStoreMeta / activeCount) : 0;
      
      Object.keys(newMap).forEach(id => {
        if (newMap[id].isAtivo) {
          newMap[id].metaVenda = share;
        }
      });
      setTotalMetaLojaInput(initialStoreMeta);
      setSellerMetasMap(newMap);
    }
  }, [selectedMesAno, sellersList, metas]);

  const activeSellersCount = useMemo(() => {
    return Object.values(sellerMetasMap).filter(s => s.isAtivo).length;
  }, [sellerMetasMap]);

  const handleStoreTotalChange = (newTotal: number) => {
    setTotalMetaLojaInput(newTotal);

    const updated = { ...sellerMetasMap };
    const sellers = Object.values(updated);

    const frozenActive = sellers.filter(s => s.isAtivo && frozenSellers[s.vendedoraId]);
    const frozenTotal = frozenActive.reduce((sum, s) => sum + s.metaVenda, 0);

    const eligibleSellers = sellers.filter(s => s.isAtivo && !frozenSellers[s.vendedoraId]);

    if (eligibleSellers.length > 0) {
      const remainingToDistribute = Math.max(0, newTotal - frozenTotal);
      const perSeller = Math.round(remainingToDistribute / eligibleSellers.length);

      let runningSum = 0;
      eligibleSellers.forEach((s, idx) => {
        if (idx === eligibleSellers.length - 1) {
          updated[s.vendedoraId].metaVenda = remainingToDistribute - runningSum;
        } else {
          updated[s.vendedoraId].metaVenda = perSeller;
          runningSum += perSeller;
        }
      });
      setSellerMetasMap(updated);
    }
  };

  const handleDistributeEqually = (targetTotal?: number) => {
    const totalToDistribute = targetTotal !== undefined ? targetTotal : totalMetaLojaInput;
    if (activeSellersCount === 0) return;

    const perSeller = Math.round(totalToDistribute / activeSellersCount);
    const updated = { ...sellerMetasMap };

    let runningSum = 0;
    const activeKeys = Object.keys(updated).filter(k => updated[k].isAtivo);

    activeKeys.forEach((key, idx) => {
      if (idx === activeKeys.length - 1) {
        updated[key].metaVenda = totalToDistribute - runningSum;
      } else {
        updated[key].metaVenda = perSeller;
        runningSum += perSeller;
      }
    });

    Object.keys(updated).forEach(k => {
      if (!updated[k].isAtivo) {
        updated[k].metaVenda = 0;
      }
    });

    setSellerMetasMap(updated);
  };

  const handleToggleSellerActive = (sellerId: string) => {
    const current = sellerMetasMap[sellerId];
    if (!current) return;

    const nextIsAtivo = !current.isAtivo;
    const updated = {
      ...sellerMetasMap,
      [sellerId]: {
        ...current,
        isAtivo: nextIsAtivo,
        metaVenda: nextIsAtivo ? current.metaVenda : 0
      }
    };
    setSellerMetasMap(updated);
  };

  const handleSingleSellerMetaChange = (sellerId: string, inputVal: string) => {
    const current = sellerMetasMap[sellerId];
    if (!current) return;

    const newValue = Math.max(0, parseFloat(inputVal) || 0);
    const updated = { ...sellerMetasMap };
    updated[sellerId] = {
      ...updated[sellerId],
      metaVenda: newValue
    };

    const sellers = Object.values(updated);

    const otherUnfrozenActive = sellers.filter(
      s => s.isAtivo && s.vendedoraId !== sellerId && !frozenSellers[s.vendedoraId]
    );

    if (otherUnfrozenActive.length > 0) {
      const otherFrozenActiveSum = sellers
        .filter(s => s.isAtivo && s.vendedoraId !== sellerId && frozenSellers[s.vendedoraId])
        .reduce((sum, s) => sum + s.metaVenda, 0);

      const remainingForOthers = Math.max(0, totalMetaLojaInput - newValue - otherFrozenActiveSum);
      const perSeller = Math.round(remainingForOthers / otherUnfrozenActive.length);

      let runningSum = 0;
      otherUnfrozenActive.forEach((s, idx) => {
        if (idx === otherUnfrozenActive.length - 1) {
          updated[s.vendedoraId].metaVenda = remainingForOthers - runningSum;
        } else {
          updated[s.vendedoraId].metaVenda = perSeller;
          runningSum += perSeller;
        }
      });
      setSellerMetasMap(updated);
    } else {
      const activeSellers = sellers.filter(s => s.isAtivo);
      const newStoreTotal = activeSellers.reduce((sum, s) => sum + s.metaVenda, 0);
      setTotalMetaLojaInput(newStoreTotal);
      setSellerMetasMap(updated);
    }
  };

  const handleSingleSellerTaxPercentChange = (sellerId: string, inputVal: string) => {
    const current = sellerMetasMap[sellerId];
    if (!current) return;
    const val = Math.max(0, parseFloat(inputVal) || 0);
    setSellerMetasMap(prev => ({
      ...prev,
      [sellerId]: {
        ...prev[sellerId],
        metaPercentualTaxa: val
      }
    }));
  };

  const handleSaveMonthMetas = () => {
    saveMeta({
      id: `meta-loja-${selectedMesAno}`,
      vendedoraId: 'loja',
      vendedoraNome: 'Loja (Global)',
      mesAno: selectedMesAno,
      metaVenda: totalMetaLojaInput,
      metaPercentualTaxa: 11.0,
      isAtivoNoMes: true
    });

    Object.values(sellerMetasMap).forEach(item => {
      saveMeta({
        id: `meta-${item.vendedoraId}-${selectedMesAno}`,
        vendedoraId: item.vendedoraId,
        vendedoraNome: item.vendedoraNome,
        mesAno: selectedMesAno,
        metaVenda: item.metaVenda,
        metaPercentualTaxa: item.metaPercentualTaxa,
        isAtivoNoMes: item.isAtivo
      });
    });

    setMetasSalvasNotice(true);
    setTimeout(() => setMetasSalvasNotice(false), 4000);
  };

  // ==========================================
  // 2. FEEDBACKS & PDI
  // ==========================================
  const [fbVendedoraId, setFbVendedoraId] = useState<string>(() => sellersList[0]?.id || '');
  useEffect(() => {
    if (sellersList.length > 0 && !fbVendedoraId) {
      setFbVendedoraId(sellersList[0].id);
    }
  }, [sellersList, fbVendedoraId]);

  const [fbTipo, setFbTipo] = useState<'elogio' | 'melhoria' | 'advertencia' | 'treinamento'>('melhoria');
  const [fbTexto, setFbTexto] = useState('');
  const [fbPlanoAcao, setFbPlanoAcao] = useState('');
  const [fbSalvoSucesso, setFbSalvoSucesso] = useState(false);

  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbTexto.trim() || !fbPlanoAcao.trim()) return;

    const targetUser = allUsers.find(u => u.id === fbVendedoraId);
    saveFeedback({
      id: `fb-${Date.now()}`,
      vendedoraId: fbVendedoraId,
      vendedoraNome: targetUser?.name || 'Vendedora',
      autorId: currentUser?.id || 'adm',
      autorNome: currentUser?.name || 'Administrador',
      data: new Date().toISOString(),
      tipo: fbTipo,
      texto: fbTexto.trim(),
      planoAcao: fbPlanoAcao.trim(),
      status: 'aberto'
    });

    setFbTexto('');
    setFbPlanoAcao('');
    setFbSalvoSucesso(true);
    setTimeout(() => setFbSalvoSucesso(false), 3000);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header & Sub-Tabs */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-600" />
            <span>Gestão de Equipe</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento centralizado de metas e feedbacks/PDI
          </p>
        </div>

        {/* Sub-tabs de Gestão e Metas */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('metas')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'metas'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-purple-600" />
            <span>Metas da Loja</span>
          </button>

          <button
            onClick={() => setActiveSubTab('feedbacks')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'feedbacks'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
            <span>Feedbacks & PDI</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: GESTÃO CENTRALIZADA DE METAS DO MÊS */}
      {/* ========================================================================= */}
      {activeSubTab === 'metas' && (
        <div className="space-y-4">
          {/* Notification */}
          {metasSalvasNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Metas da competência {getMonthYearLabel(selectedMesAno)} gravadas e salvas com sucesso no banco de dados!</span>
            </div>
          )}

          {/* Configuração Principal de Metas da Loja */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <span>Distribuição de Metas de Vendas por Vendedora</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defina a meta global da loja e distribua automaticamente ou individualmente por vendedora para o mês selecionado.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={selectedMesAno}
                  onChange={(e) => setSelectedMesAno(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Global Store Goal Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2">
                <label className="block text-xs font-extrabold text-purple-900 dark:text-purple-300">
                  Meta Global da Loja (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-purple-600">R$</span>
                  <input
                    type="number"
                    step="5000"
                    min="0"
                    value={totalMetaLojaInput}
                    onChange={(e) => handleStoreTotalChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 text-base font-black rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-purple-950 dark:text-white tabular-nums"
                  />
                </div>
                <span className="text-[10px] text-purple-700 dark:text-purple-400 block font-medium">
                  {getMonthYearLabel(selectedMesAno)} • {activeSellersCount} vendedoras ativas
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 block">Soma das Metas Individuais</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
                    {formatCurrency(Object.values(sellerMetasMap).reduce((sum, s) => sum + s.metaVenda, 0))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDistributeEqually()}
                  className="mt-2 py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Distribuir Igualmente entre Ativas</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">Status de Salvamento</span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 block mt-1 font-medium">
                    Pronto para persistir alterações da competência {getMonthYearLabel(selectedMesAno)}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveMonthMetas}
                  className="mt-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Salvar Metas do Mês</span>
                </button>
              </div>
            </div>

            {/* Table of Sellers & Goals */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Detalhamento por Vendedora (Competência {getMonthYearLabel(selectedMesAno)}):
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase text-[10px] font-extrabold">
                      <th className="py-2.5 px-3">Colaboradora / Vendedora</th>
                      <th className="py-2.5 px-3 text-center">Status no Mês</th>
                      <th className="py-2.5 px-3">Meta de Vendas (R$)</th>
                      <th className="py-2.5 px-3">Meta % Taxa Média</th>
                      <th className="py-2.5 px-3 text-right">Fixar na Distribuição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {sellersList.map(seller => {
                      const metaInfo = sellerMetasMap[seller.id] || {
                        vendedoraId: seller.id,
                        vendedoraNome: seller.name,
                        isAtivo: true,
                        metaVenda: 0,
                        metaPercentualTaxa: seller.monthlyTaxPercentGoal ?? 20
                      };
                      const isFrozen = Boolean(frozenSellers[seller.id]);

                      return (
                        <tr key={seller.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${!metaInfo.isAtivo ? 'opacity-50 bg-slate-50/50 dark:bg-slate-900/30' : ''}`}>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs">
                                {cleanPersonName(seller.name).charAt(0)}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {cleanPersonName(seller.name)}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {seller.email} {seller.dataAdmissao ? `• Adm: ${seller.dataAdmissao}` : ''}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSellerActive(seller.id)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 mx-auto ${
                                metaInfo.isAtivo
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {metaInfo.isAtivo ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              <span>{metaInfo.isAtivo ? 'Ativa no Mês' : 'Inativa/Ausente'}</span>
                            </button>
                          </td>

                          <td className="py-3 px-3">
                            <div className="relative max-w-[200px]">
                              <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R$</span>
                              <input
                                type="number"
                                step="1000"
                                min="0"
                                disabled={!metaInfo.isAtivo}
                                value={metaInfo.metaVenda}
                                onChange={(e) => handleSingleSellerMetaChange(seller.id, e.target.value)}
                                className="w-full pl-8 pr-2.5 py-1.5 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-55 tabular-nums"
                              />
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="relative max-w-[130px]">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max="100"
                                disabled={!metaInfo.isAtivo}
                                value={metaInfo.metaPercentualTaxa}
                                onChange={(e) => handleSingleSellerTaxPercentChange(seller.id, e.target.value)}
                                className="w-full pl-2.5 pr-6 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-55 tabular-nums"
                              />
                              <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              disabled={!metaInfo.isAtivo}
                              onClick={() => setFrozenSellers(prev => ({ ...prev, [seller.id]: !prev[seller.id] }))}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                isFrozen
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {isFrozen ? '🔒 Meta Fixada' : '🔓 Dinâmica'}
                            </button>
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
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: FEEDBACKS & PDI */}
      {/* ========================================================================= */}
      {activeSubTab === 'feedbacks' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                  <span>Registro de Feedback & PDI (Plano de Desenvolvimento Individual)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acompanhe orientações, alinhamentos e planos de ação registrados para as vendedoras.
                </p>
              </div>
            </div>

            {fbSalvoSucesso && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Feedback / PDI registrado com sucesso para a colaboradora!</span>
              </div>
            )}

            <form onSubmit={handleSaveFeedback} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Colaboradora / Vendedora:
                  </label>
                  <select
                    value={fbVendedoraId}
                    onChange={(e) => setFbVendedoraId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    {sellersList.map(s => (
                      <option key={s.id} value={s.id}>{cleanPersonName(s.name)} ({s.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Registro:
                  </label>
                  <select
                    value={fbTipo}
                    onChange={(e) => setFbTipo(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="melhoria">Ponto de Melhoria</option>
                    <option value="elogio">Elogio & Reconhecimento</option>
                    <option value="advertencia">Advertência / Alinhamento</option>
                    <option value="treinamento">Treinamento & Reciclagem</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações / Feedback Detalhado:
                </label>
                <textarea
                  rows={3}
                  value={fbTexto}
                  onChange={(e) => setFbTexto(e.target.value)}
                  placeholder="Descreva o contexto, pontos alinhados ou elogio..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Plano de Ação Acordado:
                </label>
                <textarea
                  rows={2}
                  value={fbPlanoAcao}
                  onChange={(e) => setFbPlanoAcao(e.target.value)}
                  placeholder="Quais serão os próximos passos ou metas acordadas..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-xs active:scale-95 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Registrar Feedback & PDI</span>
                </button>
              </div>
            </form>

            {/* Histórico de Feedbacks */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Histórico Recente de Registros:
              </h3>
              <div className="space-y-2">
                {feedbacks.slice(0, 10).map((fb) => (
                  <div key={fb.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {cleanPersonName(fb.vendedoraNome)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          fb.tipo === 'elogio' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          fb.tipo === 'treinamento' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {fb.tipo}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(fb.data)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      {fb.texto}
                    </p>
                    {fb.planoAcao && (
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                        <strong>Plano de Ação:</strong> {fb.planoAcao}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Registrado por: {fb.autorNome}</span>
                      <span className="text-emerald-600 font-bold">Status: {fb.status}</span>
                    </div>
                  </div>
                ))}
                {feedbacks.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum feedback ou PDI registrado até o momento.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
