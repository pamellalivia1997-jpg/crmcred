import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  FileCheck2,
  CheckCircle2,
  Search,
  History,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Trash2,
  Loader2
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, formatCPF } from '../../utils/formatters';
import { normalizeDateToISO } from '../../utils/dashboardCalculations';
import { Proposta } from '../../types';
import { processControladoriaGoogleSheets, executeControladoriaSyncWithBackup } from '../../services/controladoriaSyncService';
import { SmartFilter } from '../common/SmartFilter';

export const FinanceiroView: React.FC = () => {
  const {
    propostas,
    comissoesPromotoras,
    saveProposta,
    saveComissaoPromotora,
    saveComissaoPromotoraBatch,
    deleteComissaoPromotora,
    clearControladoriaData,
    dataInicioPersonalizada,
    setDataInicioPersonalizada,
    dataFimPersonalizada,
    setDataFimPersonalizada
  } = useCRM();
  const { currentUser, canAccessFinancial } = useAuth();

  const isFinanceiro = Boolean(currentUser && currentUser.role === 'financeiro');

  const [activeTab, setActiveTab] = useState<'pendentes' | 'conciliados'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContrato, setSelectedContrato] = useState<Proposta | null>(null);
  const [valorRecebidoInput, setValorRecebidoInput] = useState('');
  const [dataRecebimentoInput, setDataRecebimentoInput] = useState('');
  const [sucessoNotice, setSucessoNotice] = useState<string | null>(null);
  const [erroNotice, setErroNotice] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterPromotora, setFilterPromotora] = useState('todas');
  const [isClearControladoriaModalOpen, setIsClearControladoriaModalOpen] = useState(false);
  const [isClearingControladoria, setIsClearingControladoria] = useState(false);

  // Column specific filters for Pendentes
  const [filterPendContrato, setFilterPendContrato] = useState('');
  const [filterPendCliente, setFilterPendCliente] = useState('');
  const [filterPendPromotora, setFilterPendPromotora] = useState('todas');
  const [filterPendBanco, setFilterPendBanco] = useState('todos');
  const [filterPendOperacao, setFilterPendOperacao] = useState('todas');

  const hasFinancialAccess = canAccessFinancial();

  // Set of proposal IDs with confirmed commission repasse (strictly linked by direct proposal field or legacy comissoesPromotoras)
  const confirmedPropostaIds = useMemo(() => {
    const setIds = new Set<string>();
    propostas.forEach(p => {
      if (p.valorRepasse && p.valorRepasse > 0) {
        setIds.add(p.id);
      }
    });
    (comissoesPromotoras || [])
      .filter(c => c.status === 'confirmada' && c.valorRecebido > 0 && c.propostaId)
      .forEach(c => {
        setIds.add(c.propostaId);
      });
    return setIds;
  }, [propostas, comissoesPromotoras]);

  const bancosList = useMemo(() => Array.from(new Set(propostas.map(p => p.banco).filter(Boolean))), [propostas]);
  const operacoesList = useMemo(() => Array.from(new Set(propostas.map(p => p.operacao).filter(Boolean))), [propostas]);

  // Contratos EXCLUSIVAMENTE SEM repasse de comissão da promotora, excluindo Assessoria
  const contratosPendentesRepasse = useMemo(() => {
    return propostas
      .filter(p => p.status === 'Paga')
      .filter(p => {
        const hasCommission = (p.valorRepasse && p.valorRepasse > 0) || confirmedPropostaIds.has(p.id);
        return !hasCommission;
      })
      .filter(p => {
        const promUpper = (p.promotora || '').toUpperCase().trim();
        return promUpper !== 'ASSESSORIA' && !promUpper.includes('ASSESSORIA');
      })
      .filter(p => {
        // Period filter
        const pDate = normalizeDateToISO(p.dataPagamentoCliente || p.dataDigitacao || '');
        if (dataInicioPersonalizada && pDate && pDate < dataInicioPersonalizada) return false;
        if (dataFimPersonalizada && pDate && pDate > dataFimPersonalizada) return false;

        const term = searchTerm.toLowerCase().trim();
        const cleanTerm = term.replace(/\D/g, '');
        const matchSearch =
          !term ||
          p.nomeCliente.toLowerCase().includes(term) ||
          p.numeroContrato.toLowerCase().includes(term) ||
          p.promotora.toLowerCase().includes(term) ||
          p.banco.toLowerCase().includes(term) ||
          (cleanTerm && p.cpf.replace(/\D/g, '').includes(cleanTerm));

        const matchPromotora = filterPromotora === 'todas' || p.promotora === filterPromotora;
        const matchPendPromotora = filterPendPromotora === 'todas' || p.promotora === filterPendPromotora;
        const matchPendBanco = filterPendBanco === 'todos' || p.banco === filterPendBanco;
        const matchPendOperacao = filterPendOperacao === 'todas' || p.operacao === filterPendOperacao;
        const matchPendContrato = !filterPendContrato || p.numeroContrato.toLowerCase().includes(filterPendContrato.toLowerCase());
        const matchPendCliente = !filterPendCliente || p.nomeCliente.toLowerCase().includes(filterPendCliente.toLowerCase()) || p.cpf.includes(filterPendCliente.replace(/\D/g, ''));

        return matchSearch && matchPromotora && matchPendPromotora && matchPendBanco && matchPendOperacao && matchPendContrato && matchPendCliente;
      })
      .sort((a, b) => {
        const dateA = a.dataPagamentoCliente || a.dataDigitacao || '';
        const dateB = b.dataPagamentoCliente || b.dataDigitacao || '';
        return dateB.localeCompare(dateA);
      });
  }, [propostas, confirmedPropostaIds, searchTerm, filterPromotora, filterPendPromotora, filterPendBanco, filterPendOperacao, filterPendContrato, filterPendCliente, dataInicioPersonalizada, dataFimPersonalizada]);

  // Histórico de Repasses Conciliados (Entidade Única - Vínculo direto às propostas)
  const repassesConciliados = useMemo(() => {
    const directRepasses = propostas
      .filter(p => (p.valorRepasse && p.valorRepasse > 0))
      .map(p => ({
        id: `rep-${p.id}`,
        propostaId: p.id,
        numeroContrato: p.numeroContrato || '',
        clienteNome: p.nomeCliente,
        promotora: p.promotoraRepasse || p.promotora || 'J2 Promotora',
        valorRecebido: Number(p.valorRepasse || 0),
        dataRecebimento: p.dataRecebimentoRepasse || p.dataPagamentoCliente || p.dataDigitacao || '',
        tipo: p.tipoRepasse || ('fixo' as const),
        percentualAplicado: p.percentualRepasse || 0,
        status: p.statusRepasse || ('confirmada' as const),
        observacao: p.observacaoRepasse || 'Repasse conciliado diretamente no contrato.'
      }));

    const seenPropIds = new Set(directRepasses.map(r => r.propostaId));
    const legacyComs = (comissoesPromotoras || []).filter(c => !seenPropIds.has(c.propostaId));
    const combined = [...directRepasses, ...legacyComs];

    return combined
      .filter(c => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;
        return (
          c.clienteNome.toLowerCase().includes(term) ||
          c.numeroContrato.toLowerCase().includes(term) ||
          c.promotora.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => (b.dataRecebimento || '').localeCompare(a.dataRecebimento || ''));
  }, [propostas, comissoesPromotoras, searchTerm]);

  const totalVolumePendente = contratosPendentesRepasse.reduce((acc, p) => acc + p.valorEmprestimo, 0);
  const totalComissoesRecebidas = repassesConciliados.reduce((acc, c) => acc + c.valorRecebido, 0);

  const promotorasList = useMemo(() => {
    return Array.from(new Set(propostas.map(p => p.promotora).filter(Boolean)));
  }, [propostas]);

  // Automated Google Sheets Sync Handler with Safe Backup and Merge
  const handleGoogleSheetsSync = async () => {
    try {
      setIsSyncing(true);
      setErroNotice(null);
      setSucessoNotice(null);

      const result = await executeControladoriaSyncWithBackup(
        propostas,
        comissoesPromotoras,
        saveComissaoPromotoraBatch
      );

      setSucessoNotice(result.mensagem);
      setTimeout(() => setSucessoNotice(null), 8000);
    } catch (err: any) {
      console.error('Erro na sincronização da Controladoria:', err);
      setErroNotice(`Falha na sincronização: ${err.message || 'Erro de leitura da planilha'}. Nenhum dado foi alterado.`);
      setTimeout(() => setErroNotice(null), 8000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmarRepasseManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContrato) return;
    const valor = parseFloat(valorRecebidoInput) || 0;
    const dataRec = dataRecebimentoInput || new Date().toISOString().split('T')[0];

    const updatedProp: Proposta = {
      ...selectedContrato,
      valorRepasse: valor,
      dataRecebimentoRepasse: dataRec,
      statusRepasse: 'confirmada',
      promotoraRepasse: selectedContrato.promotora,
      updatedAt: new Date().toISOString()
    };

    saveProposta(updatedProp);

    saveComissaoPromotora({
      id: `com-prom-${Date.now()}`,
      propostaId: selectedContrato.id,
      numeroContrato: selectedContrato.numeroContrato,
      clienteNome: selectedContrato.nomeCliente,
      promotora: selectedContrato.promotora,
      valorRecebido: valor,
      dataRecebimento: dataRec,
      tipo: 'fixo',
      status: 'confirmada',
      observacao: 'Repasse confirmado manualmente via Controladoria.'
    });

    setSucessoNotice(`Repasse de ${formatCurrency(valor)} do contrato #${selectedContrato.numeroContrato} salvo na nuvem com sucesso!`);
    setSelectedContrato(null);
    setValorRecebidoInput('');
    setDataRecebimentoInput('');
    setTimeout(() => setSucessoNotice(null), 4000);
  };

  const handleExcluirRepasseProposta = (p: Proposta) => {
    if (!window.confirm(`Deseja realmente excluir o repasse do contrato #${p.numeroContrato || p.id} (${p.nomeCliente})?`)) {
      return;
    }

    const updatedProp: Proposta = {
      ...p,
      valorRepasse: 0,
      dataRecebimentoRepasse: '',
      statusRepasse: 'pendente',
      promotoraRepasse: '' as any,
      updatedAt: new Date().toISOString()
    };

    saveProposta(updatedProp);
    deleteComissaoPromotora(`com-${p.id}`);
    deleteComissaoPromotora(p.id);

    setSucessoNotice(`Repasse do contrato #${p.numeroContrato || p.id} excluído e atualizado na nuvem com sucesso!`);
    setTimeout(() => setSucessoNotice(null), 4000);
  };

  const handleExcluirRepassePropostaId = (propostaId: string, valor: number, clienteNome: string) => {
    if (!window.confirm(`Deseja realmente excluir o repasse de ${formatCurrency(valor)} do cliente ${clienteNome}?`)) {
      return;
    }

    const matchingProp = propostas.find(p => p.id === propostaId);
    if (matchingProp) {
      const updatedProp: Proposta = {
        ...matchingProp,
        valorRepasse: 0,
        dataRecebimentoRepasse: '',
        statusRepasse: 'pendente',
        promotoraRepasse: '' as any,
        updatedAt: new Date().toISOString()
      };
      saveProposta(updatedProp);
    }

    deleteComissaoPromotora(propostaId);
    deleteComissaoPromotora(`com-${propostaId}`);

    setSucessoNotice(`Repasse de ${clienteNome} excluído e atualizado na nuvem com sucesso!`);
    setTimeout(() => setSucessoNotice(null), 4000);
  };

  const renderMoney = (amount: number) => {
    if (!hasFinancialAccess) return '••••••';
    return formatCurrency(amount);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            <span>Controladoria</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sincronização de extratos e conciliação de repasses
          </p>
        </div>

        {/* Action Buttons: Google Sheets Sync & Zerar Controladoria (Exclusivo Perfil Financeiro) */}
        {isFinanceiro && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleGoogleSheetsSync}
              disabled={isSyncing}
              title="Sincronizar Extratos Google Sheets"
              className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-200 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsClearControladoriaModalOpen(true)}
              title="Zerar Controladoria"
              className="p-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-200" />
            </button>
          </div>
        )}
      </div>

      {/* Notice Banners */}
      {sucessoNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sucessoNotice}</span>
        </div>
      )}

      {erroNotice && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{erroNotice}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`px-4 py-2 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 ${
            activeTab === 'pendentes'
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Contratos Sem Repasse ({contratosPendentesRepasse.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('conciliados')}
          className={`px-4 py-2 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 ${
            activeTab === 'conciliados'
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Histórico de Repasses Conciliados ({comissoesPromotoras.length})</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Contratos Aguardando Repasse</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
            {contratosPendentesRepasse.length} contratos
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Volume em aberto: {renderMoney(totalVolumePendente)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Repasses Já Conciliados</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            {renderMoney(totalComissoesRecebidas)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Total de {comissoesPromotoras.length} contratos baixados
          </p>
        </div>
      </div>

      {/* Filter Bar with Period Filter & Promotora */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, CPF, contrato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        {/* Period Selector */}
        <div className="flex-1 w-full max-w-xl">
          <SmartFilter
            dataInicio={dataInicioPersonalizada}
            dataFim={dataFimPersonalizada}
            onChangeRange={(range) => {
              setDataInicioPersonalizada(range.dataInicio);
              setDataFimPersonalizada(range.dataFim);
            }}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterPromotora}
            onChange={(e) => setFilterPromotora(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="todas">Promotora: Todas</option>
            {promotorasList.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: Contratos Sem Repasse */}
      {activeTab === 'pendentes' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span>Contratos com Repasse de Comissão Pendente</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Contratos pagos sem vinculação de repasse de comissão da promotora
              </p>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 self-start sm:self-auto">
              {contratosPendentesRepasse.length} Pendências
            </span>
          </div>

          {/* Column Filters Bar for Pendentes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs pt-1 pb-2 border-b border-slate-100 dark:border-slate-800">
            <input
              type="text"
              placeholder="Filtrar Contrato..."
              value={filterPendContrato}
              onChange={(e) => setFilterPendContrato(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="Filtrar Cliente / CPF..."
              value={filterPendCliente}
              onChange={(e) => setFilterPendCliente(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <select
              value={filterPendPromotora}
              onChange={(e) => setFilterPendPromotora(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="todas">Promotora: Todas</option>
              {promotorasList.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={filterPendBanco}
              onChange={(e) => setFilterPendBanco(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="todos">Banco: Todos</option>
              {bancosList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              value={filterPendOperacao}
              onChange={(e) => setFilterPendOperacao(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="todos">Operação: Todas</option>
              {operacoesList.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Contrato</th>
                  <th className="py-2.5 px-3">Cliente / CPF</th>
                  <th className="py-2.5 px-3">Promotora</th>
                  <th className="py-2.5 px-3">Banco / Operação</th>
                  <th className="py-2.5 px-3 text-right">Valor Venda (R$)</th>
                  <th className="py-2.5 px-3 text-center">Data Pagamento</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {contratosPendentesRepasse.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                        Nenhum contrato com repasse pendente!
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Todos os contratos pagos já tiveram seus repasses de comissão conciliados.
                      </p>
                    </td>
                  </tr>
                ) : (
                  contratosPendentesRepasse.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                        #{p.numeroContrato}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">{p.nomeCliente}</p>
                        <p className="font-mono text-[10px] text-slate-400">{p.cpf ? formatCPF(p.cpf) : '—'}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{p.promotora}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">{p.banco}</p>
                        <p className="text-[10px] text-slate-400">{p.operacao}</p>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white tabular-nums">
                        {renderMoney(p.valorEmprestimo)}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-slate-600 dark:text-slate-400">
                        {p.dataPagamentoCliente ? formatDate(p.dataPagamentoCliente) : formatDate(p.dataDigitacao)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isFinanceiro ? (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => {
                                setSelectedContrato(p);
                                setValorRecebidoInput('');
                                setDataRecebimentoInput(new Date().toISOString().split('T')[0]);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
                              title="Lançar repasse recebido da promotora"
                            >
                              Lançar Repasse
                            </button>
                            <button
                              onClick={() => handleExcluirRepasseProposta(p)}
                              className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
                              title="Excluir repasse deste contrato"
                            >
                              Excluir Repasse
                            </button>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Pendente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Histórico de Repasses Conciliados */}
      {activeTab === 'conciliados' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <span>Histórico de Repasses Conciliados</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Extratos recebidos e comissões vinculadas às produções
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {repassesConciliados.length} Repasses Registrados
              </span>
              {isFinanceiro && repassesConciliados.length > 0 && (
                <button
                  onClick={() => setIsClearControladoriaModalOpen(true)}
                  className="px-3 py-1 text-xs font-bold rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Apagar todos os repasses e comissões da Controladoria"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Repasses</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Contrato</th>
                  <th className="py-2.5 px-3">Data Recebimento</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Promotora</th>
                  <th className="py-2.5 px-3 text-right">Valor Repassado (R$)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  {isFinanceiro && <th className="py-2.5 px-3 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {repassesConciliados.length === 0 ? (
                  <tr>
                    <td colSpan={isFinanceiro ? 7 : 6} className="py-12 text-center text-slate-400">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 stroke-1" />
                      <p className="font-semibold text-slate-600 dark:text-slate-400">Nenhum repasse registrado ainda</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isFinanceiro ? 'Clique em "Sincronizar Extratos Google Sheets" para buscar as comissões das promotoras.' : 'Aguardando conciliação do setor financeiro.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  repassesConciliados.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-500">#{c.numeroContrato}</td>
                      <td className="py-2.5 px-3 tabular-nums">{c.dataRecebimento ? formatDate(c.dataRecebimento) : '—'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{c.clienteNome}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{c.promotora}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {renderMoney(c.valorRecebido)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      {isFinanceiro && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleExcluirRepassePropostaId(c.propostaId || c.id, c.valorRecebido, c.clienteNome)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Excluir este repasse"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Commission Launch Modal (Exclusivo Perfil Financeiro) */}
      {isFinanceiro && selectedContrato && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Confirmar Repasse de Comissão
            </h3>
            <p className="text-xs text-slate-500">
              Contrato #{selectedContrato.numeroContrato} • {selectedContrato.nomeCliente} • Promotora: {selectedContrato.promotora}
            </p>

            <form onSubmit={handleConfirmarRepasseManual} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Valor Recebido no Extrato (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={valorRecebidoInput}
                  onChange={(e) => setValorRecebidoInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Data de Recebimento
                </label>
                <input
                  type="date"
                  value={dataRecebimentoInput}
                  onChange={(e) => setDataRecebimentoInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedContrato(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Confirmar Repasse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear Controladoria Modal (Exclusivo Perfil Financeiro) */}
      {isFinanceiro && isClearControladoriaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Zerar Controladoria?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Deseja realmente zerar a controladoria? Esta ação apagará todos os registros de <strong>comissões de promotoras e repasses confirmados</strong> na nuvem.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                disabled={isClearingControladoria}
                onClick={() => setIsClearControladoriaModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                disabled={isClearingControladoria}
                onClick={async () => {
                  try {
                    setIsClearingControladoria(true);
                    await clearControladoriaData();
                    setIsClearControladoriaModalOpen(false);
                    setSucessoNotice('Controladoria zerada com sucesso!');
                    setTimeout(() => setSucessoNotice(null), 3000);
                  } catch (err: any) {
                    setErroNotice(`Erro ao zerar: ${err.message}`);
                  } finally {
                    setIsClearingControladoria(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isClearingControladoria ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Zerando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Zerar</span>
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
