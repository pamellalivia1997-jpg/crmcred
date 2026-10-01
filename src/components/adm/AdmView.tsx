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
  UploadCloud,
  Calculator,
  UserX,
  UserCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Info
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
  normalizeSellerName
} from '../../utils/formatters';

interface AdmViewProps {
  initialSubTab?: 'metas' | 'feedbacks' | 'importador';
}

interface SellerMonthMeta {
  vendedoraId: string;
  vendedoraNome: string;
  isAtivo: boolean;
  metaVenda: number;
  metaPercentualTaxa: number;
}

export const AdmView: React.FC<AdmViewProps> = ({ initialSubTab = 'metas' }) => {
  const { metas, feedbacks, propostas, saveMeta, saveFeedback, importFullSpreadsheetRows } = useCRM();
  const { allUsers, currentUser, saveUser } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'metas' | 'feedbacks' | 'importador'>(
    initialSubTab === 'feedbacks' || initialSubTab === 'importador' ? initialSubTab : 'metas'
  );

  useEffect(() => {
    if (initialSubTab === 'metas' || initialSubTab === 'feedbacks' || initialSubTab === 'importador') {
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
  const [selectedMesAno, setSelectedMesAno] = useState<string>('2026-09');
  const [totalMetaLojaInput, setTotalMetaLojaInput] = useState<number>(390000);
  const [sellerMetasMap, setSellerMetasMap] = useState<Record<string, SellerMonthMeta>>({});
  const [frozenSellers, setFrozenSellers] = useState<Record<string, boolean>>({});
  const [metasSalvasNotice, setMetasSalvasNotice] = useState(false);

  // Load or initialize metas for selected month
  useEffect(() => {
    const existingForMonth = metas.filter(m => m.mesAno === selectedMesAno);
    const newMap: Record<string, SellerMonthMeta> = {};

    let totalFromExisting = 0;

    sellersList.forEach(s => {
      const found = existingForMonth.find(m => m.vendedoraId === s.id || m.vendedoraNome === s.name);
      if (found) {
        newMap[s.id] = {
          vendedoraId: s.id,
          vendedoraNome: s.name,
          isAtivo: found.isAtivoNoMes !== false && s.status === 'ativo',
          metaVenda: found.metaVenda || 0,
          metaPercentualTaxa: found.metaPercentualTaxa ?? s.monthlyTaxPercentGoal ?? 20
        };
        totalFromExisting += found.metaVenda || 0;
      } else {
        newMap[s.id] = {
          vendedoraId: s.id,
          vendedoraNome: s.name,
          isAtivo: s.status === 'ativo',
          metaVenda: 0,
          metaPercentualTaxa: s.monthlyTaxPercentGoal ?? 20
        };
      }
    });

    if (totalFromExisting > 0) {
      setTotalMetaLojaInput(totalFromExisting);
      setSellerMetasMap(newMap);
    } else {
      // Initialize equal distribution with default 390.000
      const activeCount = Object.values(newMap).filter(item => item.isAtivo).length;
      const initialStoreMeta = 390000;
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

  // Real-time distribution when Total Store Meta changes
  const handleStoreTotalChange = (newTotal: number) => {
    setTotalMetaLojaInput(newTotal);

    const updated = { ...sellerMetasMap };
    const sellers = Object.values(updated);

    // Sum of frozen active sellers
    const frozenActive = sellers.filter(s => s.isAtivo && frozenSellers[s.vendedoraId]);
    const frozenTotal = frozenActive.reduce((sum, s) => sum + s.metaVenda, 0);

    // Eligible active unfrozen sellers
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

  // Distribute equally (manual fallback trigger)
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

    // Inactive get 0
    Object.keys(updated).forEach(k => {
      if (!updated[k].isAtivo) {
        updated[k].metaVenda = 0;
      }
    });

    setSellerMetasMap(updated);
  };

  // Toggle seller active status
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

  // Dynamic automatic distribution when editing a single seller's meta
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

    // Get other active and non-frozen sellers
    const otherUnfrozenActive = sellers.filter(
      s => s.isAtivo && s.vendedoraId !== sellerId && !frozenSellers[s.vendedoraId]
    );

    if (otherUnfrozenActive.length > 0) {
      // Divide difference among other unfrozen active sellers
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

  // Save all configured goals to crmStorage and Firebase
  const handleSaveMonthMetas = () => {
    // 1. Save global store goal for easy reference in dashboard
    saveMeta({
      id: `meta-loja-${selectedMesAno}`,
      vendedoraId: 'loja',
      vendedoraNome: 'Loja (Global)',
      mesAno: selectedMesAno,
      metaVenda: totalMetaLojaInput,
      metaPercentualTaxa: 11.0,
      isAtivoNoMes: true
    });

    // 2. Save individual seller goals
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

      const foundUser = allUsers.find(u => u.id === item.vendedoraId);
      if (foundUser) {
        saveUser({
          ...foundUser,
          monthlySalesGoal: item.metaVenda,
          monthlyTaxPercentGoal: item.metaPercentualTaxa
        });
      }
    });

    setMetasSalvasNotice(true);
    setTimeout(() => setMetasSalvasNotice(false), 3500);
  };

  // Calculate actual sales for selected month
  const actualSalesForSelectedMonth = useMemo(() => {
    const monthProposals = propostas.filter(p => p.dataDigitacao.startsWith(selectedMesAno) && p.status === 'Paga');
    const totalMonthSales = monthProposals.reduce((acc, p) => acc + p.valorEmprestimo, 0);
    
    // Set of registered sales team
    const recognizedTeamSet = new Set(sellersList.map(u => normalizeSellerName(u.name)));

    let outrosTotal = 0;
    let outrosCount = 0;

    monthProposals.forEach(p => {
      const normVendedora = normalizeSellerName(p.vendedora);
      if (!normVendedora || normVendedora === 'Outros' || !recognizedTeamSet.has(normVendedora)) {
        outrosTotal += p.valorEmprestimo;
        outrosCount++;
      }
    });

    return { totalMonthSales, outrosTotal, outrosCount, monthProposals };
  }, [propostas, selectedMesAno, sellersList]);

  // ==========================================
  // 2. FEEDBACKS FORM & STATE
  // ==========================================
  const [fbVendedoraId, setFbVendedoraId] = useState(allUsers.find(u => u.role === 'vendedora')?.id || '');
  const [fbTipo, setFbTipo] = useState<'elogio' | 'melhoria' | 'advertencia' | 'treinamento'>('elogio');
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

  // ==========================================
  // 3. PLANILHA IMPORTER STATE
  // ==========================================
  const [rawSpreadsheetText, setRawSpreadsheetText] = useState('');
  const [isSimulatingImport, setIsSimulatingImport] = useState(false);
  const [fullImportResult, setFullImportResult] = useState<{
    totalRows: number;
    clientsCreated: number;
    clientsUpdated: number;
    proposalsCreated: number;
    commissionsCreated: number;
    cpfsCorrectedCount: number;
  } | null>(null);

  const handleProcessRealSpreadsheet = (textInput?: string) => {
    const textToProcess = textInput || rawSpreadsheetText;
    if (!textToProcess.trim()) {
      alert('Por favor, cole o texto da sua planilha.');
      return;
    }

    setIsSimulatingImport(true);

    setTimeout(() => {
      const lines = textToProcess.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        setIsSimulatingImport(false);
        alert('A planilha precisa conter pelo menos um cabeçalho e linhas de dados.');
        return;
      }

      const separator = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().toUpperCase());

      const parsedRows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(separator);
        if (parts.length < 2) continue;

        const rowObj: any = {};
        headers.forEach((h, idx) => {
          const val = parts[idx] ? parts[idx].trim() : '';
          if (h.includes('DATA/HORA') || h.includes('CARIMBO')) rowObj.carimboDataHora = val;
          else if (h.includes('CPF')) rowObj.cpf = val;
          else if (h.includes('NOME')) rowObj.nomeCliente = val;
          else if (h.includes('DIGITAÇÃO') || h.includes('DIGITACAO')) rowObj.dataDigitacao = val;
          else if (h.includes('PAGAMENTO AO CLIENTE')) rowObj.dataPagamentoCliente = val;
          else if (h.includes('CONVÊNIO') || h.includes('CONVENIO')) rowObj.convenio = val;
          else if (h.includes('OPERAÇÃO') || h.includes('OPERACAO')) rowObj.operacao = val;
          else if (h.includes('BANCO')) rowObj.banco = val;
          else if (h.includes('PROMOTORA')) rowObj.promotora = val;
          else if (h.includes('VALOR DO EMPRÉSTIMO') || h.includes('VALOR DO EMPRESTIMO')) rowObj.valorEmprestimo = val;
          else if (h.includes('VALOR DA TAXA')) rowObj.valorTaxa = val;
          else if (h.includes('CLIENTE PAGOU')) rowObj.clientePagou = val;
          else if (h.includes('TAXA DO') || h.includes('PERCENTUAL')) rowObj.percentualTaxa = val;
          else if (h.includes('VENDEDOR')) rowObj.vendedora = val;
          else if (h.includes('DIGITADOR')) rowObj.digitador = val;
          else if (h.includes('CONTRATO')) rowObj.numeroContrato = val;
          else if (h.includes('STATUS')) rowObj.status = val;
          else if (h.includes('LINK') || h.includes('DRIVE') || h.includes('DOCUMENTO')) rowObj.linkDocumento = val;
          else if (h.includes('COMISSÃO J2') || h.includes('COMISSAO J2')) rowObj.comissaoJ2 = val;
          else if (h.includes('COMISSÃO SEMPRE') || h.includes('COMISSAO SEMPRE')) rowObj.comissaoSempre = val;
          else if (h.includes('COMISSÃO DG') || h.includes('COMISSAO DG')) rowObj.comissaoDG = val;
          else if (h.includes('COMISSÃO GFT') || h.includes('COMISSAO GFT')) rowObj.comissaoGFT = val;
          else if (h.includes('FATURADO')) rowObj.faturado = val;
        });

        if (rowObj.nomeCliente || rowObj.cpf) {
          parsedRows.push(rowObj);
        }
      }

      const res = importFullSpreadsheetRows(parsedRows);
      setFullImportResult(res);
      setIsSimulatingImport(false);
      setRawSpreadsheetText('');
    }, 800);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header & Sub-Tabs */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-600" />
            <span>Painel da Administração & Gestão de Equipe</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento centralizado de metas mensais, feedbacks/PDI e importação de contratos
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
            <span>Metas do Mês</span>
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

          <button
            onClick={() => setActiveSubTab('importador')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'importador'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Importar Planilha Oficial</span>
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
              <span>Metas do mês ({getMonthYearLabel(selectedMesAno)}) salvas e sincronizadas na nuvem com sucesso!</span>
            </div>
          )}

          {/* Controls Bar: 1. Seleciona Mês, 2. Quantidade Ativos, 3. Meta Total Loja */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* 1. Mês selector (Retroativo) */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                1. Mês de Competência (Retroativo)
              </label>
              <input
                type="month"
                value={selectedMesAno}
                onChange={(e) => setSelectedMesAno(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block mt-0.5">
                Competência: {getMonthYearLabel(selectedMesAno)}
              </span>
            </div>

            {/* 2. Vendedores Ativos no Período */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                2. Vendedores Ativos no Período
              </label>
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                <div>
                  <span className="text-base font-black text-purple-900 dark:text-purple-100 tabular-nums">
                    {activeSellersCount} {activeSellersCount === 1 ? 'vendedora ativa' : 'vendedoras ativas'}
                  </span>
                  <p className="text-[10px] text-purple-700 dark:text-purple-300">
                    {sellersList.length - activeSellersCount > 0
                      ? `${sellersList.length - activeSellersCount} de férias / licença no mês`
                      : 'Equipe comercial 100% ativa'}
                  </p>
                </div>
                <UserCheck className="w-5 h-5 text-purple-600 shrink-0" />
              </div>
            </div>

            {/* 3. Valor Total da Meta de Venda da Loja */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                3. Meta Total de Venda da Loja (R$)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={totalMetaLojaInput}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    handleStoreTotalChange(val);
                  }}
                  className="w-full px-3 py-2 text-xs font-black rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 tabular-nums"
                  placeholder="Ex: 390000"
                />
                <button
                  type="button"
                  onClick={() => handleDistributeEqually()}
                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs whitespace-nowrap shadow-xs active:scale-95 transition"
                  title="Distribuir valor igualmente entre os ativos"
                >
                  Distribuir
                </button>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Total da loja: <strong>{formatCurrency(totalMetaLojaInput)}</strong>
              </span>
            </div>
          </div>

          {/* Sellers Distribution Table & Adjustment Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Distribuição Individual das Metas ({getMonthYearLabel(selectedMesAno)})
                </h2>
                <p className="text-xs text-slate-500">
                  Defina quem está ativo no mês ou edite individualmente para abrir o pop-up de redistribuição
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveMonthMetas}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs active:scale-95 transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Salvar Configuração do Mês</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-2.5 px-3">Vendedora</th>
                    <th className="py-2.5 px-3 text-center">Status no Mês</th>
                    <th className="py-2.5 px-3">Meta Individual (R$) & Meta Taxa (%)</th>
                    <th className="py-2.5 px-3 text-right">% do Total da Loja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {sellersList.map((seller) => {
                    const item = sellerMetasMap[seller.id] || {
                      vendedoraId: seller.id,
                      vendedoraNome: seller.name,
                      isAtivo: true,
                      metaVenda: 0,
                      metaPercentualTaxa: seller.monthlyTaxPercentGoal ?? 20
                    };

                    const pctOfStore = totalMetaLojaInput > 0 ? (item.metaVenda / totalMetaLojaInput) * 100 : 0;

                    return (
                      <tr
                        key={seller.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${!item.isAtivo ? 'opacity-60 bg-slate-50/50' : ''}`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold text-xs flex items-center justify-center">
                              {cleanPersonName(seller.name).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                {cleanPersonName(seller.name)}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">{seller.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSellerActive(seller.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                              item.isAtivo
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {item.isAtivo ? 'ATIVO' : 'FÉRIAS/LICENÇA'}
                          </button>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                            <div className="flex items-center gap-1.5 max-w-[140px] shrink-0">
                              <span className="text-[11px] text-slate-400 font-bold">R$</span>
                              <input
                                type="number"
                                value={item.metaVenda}
                                onChange={(e) => {
                                  handleSingleSellerMetaChange(seller.id, e.target.value);
                                }}
                                className="w-full px-2.5 py-1 text-xs font-black rounded-lg border tabular-nums bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-purple-500"
                                title="Meta de Vendas"
                              />
                            </div>

                            <div className="flex items-center gap-1 max-w-[110px] shrink-0">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                value={item.metaPercentualTaxa}
                                onChange={(e) => {
                                  handleSingleSellerTaxPercentChange(seller.id, e.target.value);
                                }}
                                className="w-full px-2 py-1 text-xs font-black rounded-lg border tabular-nums bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-purple-500"
                                title="Meta de Taxa (%)"
                              />
                              <span className="text-[11px] font-bold text-amber-600 whitespace-nowrap">% Taxa</span>
                            </div>

                            <label className="inline-flex items-center gap-1 cursor-pointer text-slate-600 dark:text-slate-300 font-bold select-none whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={Boolean(frozenSellers[seller.id])}
                                onChange={() => {
                                  setFrozenSellers(prev => ({
                                    ...prev,
                                    [seller.id]: !prev[seller.id]
                                  }));
                                }}
                                className="w-3.5 h-3.5 rounded-md border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <span className="text-[10px] tracking-tight">Congelar</span>
                            </label>
                          </div>
                        </td>

                        <td className="py-3 px-3 tabular-nums font-bold text-slate-600 dark:text-slate-400 text-right">
                          {formatPercent(pctOfStore)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Informative Card: Outros */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Contratos em "Outros"
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Contratos importados que não pertencem à equipe atual são agrupados sob a categoria genérica <strong>"Outros"</strong>.
                  </p>
                </div>
              </div>

              {actualSalesForSelectedMonth.outrosCount > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-bold text-xs whitespace-nowrap shrink-0 border border-amber-300">
                  {actualSalesForSelectedMonth.outrosCount} contratos • {formatCurrency(actualSalesForSelectedMonth.outrosTotal)} em "Outros"
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* SUB-TAB 2: FEEDBACKS & PDI */}
      {/* ========================================================================= */}
      {activeSubTab === 'feedbacks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* New Feedback Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Registrar Feedback & PDI
              </h2>
              <p className="text-xs text-slate-500">
                Registro formal de alinhamento com plano de ação e acompanhamento
              </p>
            </div>

            {fbSalvoSucesso && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Feedback registrado com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSaveFeedback} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Atendente Avaliada
                </label>
                <select
                  value={fbVendedoraId}
                  onChange={(e) => setFbVendedoraId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {sellersList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Feedback
                </label>
                <select
                  value={fbTipo}
                  onChange={(e) => setFbTipo(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="elogio">Elogio & Reconhecimento</option>
                  <option value="melhoria">Ponto de Melhoria</option>
                  <option value="treinamento">Treinamento & Capacitação</option>
                  <option value="advertencia">Alinhamento / Advertência</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Texto do Feedback
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva a situação observada e os pontos conversados..."
                  value={fbTexto}
                  onChange={(e) => setFbTexto(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Plano de Ação Acordado
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ações concretas, metas de melhoria e prazos..."
                  value={fbPlanoAcao}
                  onChange={(e) => setFbPlanoAcao(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-all"
              >
                Registrar Feedback Formal
              </button>
            </form>
          </div>

          {/* Feedbacks Timeline */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Histórico de Feedbacks da Equipe ({feedbacks.length})
            </h2>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {feedbacks.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">
                  Nenhum feedback registrado ainda.
                </p>
              ) : (
                feedbacks.map((fb) => (
                  <div key={fb.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {fb.vendedoraNome}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        fb.tipo === 'elogio' ? 'bg-emerald-100 text-emerald-800' :
                        fb.tipo === 'treinamento' ? 'bg-blue-100 text-blue-800' :
                        fb.tipo === 'melhoria' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {fb.tipo.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      "{fb.texto}"
                    </p>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                      <span className="font-bold text-purple-700 dark:text-purple-300 block text-[11px]">Plano de Ação:</span>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">{fb.planoAcao}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Autor: {fb.autorNome}</span>
                      <span>Registrado em: {formatDate(fb.data)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: IMPORTADOR DE PLANILHAS OFICIAIS */}
      {/* ========================================================================= */}
      {activeSubTab === 'importador' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Importador de Planilha de Produção & Contratos</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cole os dados copiados da sua planilha oficial (Excel ou Google Sheets) para sincronizar clientes, contratos e comissões diretamente no sistema.
            </p>
          </div>

          {fullImportResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-black text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Planilha importada com sucesso!</span>
              </div>
              <p>
                Foram processadas <strong>{fullImportResult.totalRows} linhas</strong>: {fullImportResult.clientsCreated} novos clientes criados, {fullImportResult.proposalsCreated} contratos/propostas registrados e {fullImportResult.commissionsCreated} lançamentos de comissões calculados.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Cole aqui as linhas da sua planilha (com cabeçalho):
            </label>
            <textarea
              rows={8}
              placeholder="Cole as colunas com cabeçalho (Carimbo, CPF, Cliente, Operação, Banco, Valor, etc.)..."
              value={rawSpreadsheetText}
              onChange={(e) => setRawSpreadsheetText(e.target.value)}
              className="w-full p-3 text-xs font-mono rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSimulatingImport || !rawSpreadsheetText.trim()}
              onClick={() => handleProcessRealSpreadsheet()}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-md active:scale-95 transition disabled:opacity-50"
            >
              {isSimulatingImport ? 'Processando e Sincronizando...' : 'Processar e Salvar Planilha'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
