import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Target,
  MessageSquare,
  Users,
  Settings,
  UploadCloud,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Check,
  X,
  UserPlus,
  Edit3,
  Trash2,
  KeyRound,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { User, MetaVendedora, Feedback, UserRole } from '../../types';
import { formatCurrency, formatPercent, formatDate, cleanPersonName } from '../../utils/formatters';

export const AdmView: React.FC = () => {
  const { metas, feedbacks, propostas, saveMeta, saveFeedback } = useCRM();
  const { allUsers, currentUser, saveUser, deleteUser } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'metas' | 'feedbacks' | 'usuarios' | 'importador' | 'parametros'>('metas');

  // Metas form state
  const [selectedVendedoraId, setSelectedVendedoraId] = useState(allUsers.find(u => u.role === 'vendedora')?.id || '');
  const [metaVendaStr, setMetaVendaStr] = useState('85000');
  const [metaTaxaStr, setMetaTaxaStr] = useState('11.0');
  const [metaSalvaSucesso, setMetaSalvaSucesso] = useState(false);

  // Feedback form state
  const [fbVendedoraId, setFbVendedoraId] = useState(allUsers.find(u => u.role === 'vendedora')?.id || '');
  const [fbTipo, setFbTipo] = useState<'elogio' | 'melhoria' | 'advertencia' | 'treinamento'>('elogio');
  const [fbTexto, setFbTexto] = useState('');
  const [fbPlanoAcao, setFbPlanoAcao] = useState('');
  const [fbSalvoSucesso, setFbSalvoSucesso] = useState(false);

  // User Management State (Gerencial cria, cadastra e altera logins das vendedoras)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('123');
  const [formRole, setFormRole] = useState<UserRole>('vendedora');
  const [formPhone, setFormPhone] = useState('(81) 98000-0000');
  const [formStatus, setFormStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [formSalesGoal, setFormSalesGoal] = useState('80000');
  const [formTaxGoal, setFormTaxGoal] = useState('11.0');
  const [formSalaryCost, setFormSalaryCost] = useState('2200');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Spreadsheet importer simulated state
  const [isSimulatingImport, setIsSimulatingImport] = useState(false);
  const [importReport, setImportReport] = useState<{ totalLinhas: number; clientesCriados: number; propostasCriadas: number; duplicadosIgnorados: number } | null>(null);

  // Sellers
  const sellers = useMemo(() => allUsers.filter(u => u.role === 'vendedora'), [allUsers]);

  const handleOpenNewUser = () => {
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('123');
    setFormRole('vendedora');
    setFormPhone('(81) 98000-0000');
    setFormStatus('ativo');
    setFormSalesGoal('80000');
    setFormTaxGoal('11.0');
    setFormSalaryCost('2200');
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(user.password || '123');
    setFormRole(user.role);
    setFormPhone(user.phone || '');
    setFormStatus(user.status);
    setFormSalesGoal(user.monthlySalesGoal.toString());
    setFormTaxGoal(user.monthlyTaxPercentGoal.toString());
    setFormSalaryCost(user.baseSalaryCost.toString());
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const targetId = editingUserId || `user-${Date.now()}`;
    const updatedUser: User = {
      id: targetId,
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      password: formPassword.trim() || '123',
      role: formRole,
      phone: formPhone.trim(),
      status: formStatus,
      monthlySalesGoal: parseFloat(formSalesGoal) || 0,
      monthlyTaxPercentGoal: parseFloat(formTaxGoal) || 0,
      baseSalaryCost: parseFloat(formSalaryCost) || 0,
    };

    saveUser(updatedUser);

    // Also sync or create monthly goal if seller
    if (formRole === 'vendedora') {
      saveMeta({
        id: `meta-${targetId}-2026-09`,
        vendedoraId: targetId,
        vendedoraNome: formName.trim(),
        mesAno: '2026-09',
        metaVenda: parseFloat(formSalesGoal) || 75000,
        metaPercentualTaxa: parseFloat(formTaxGoal) || 10.0,
      });
    }

    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (user: User) => {
    if (user.role === 'proprietaria') {
      alert('Não é permitido excluir o usuário principal da Lívia.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o login de ${user.name}?`)) {
      deleteUser(user.id);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Handle Meta Submit
  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    const vendedora = allUsers.find(u => u.id === selectedVendedoraId);
    if (!vendedora) return;

    const novaMeta: MetaVendedora = {
      id: `meta-${selectedVendedoraId}-2026-09`,
      vendedoraId: selectedVendedoraId,
      vendedoraNome: vendedora.name,
      mesAno: '2026-09',
      metaVenda: parseFloat(metaVendaStr) || 75000,
      metaPercentualTaxa: parseFloat(metaTaxaStr) || 10.0
    };

    saveMeta(novaMeta);
    setMetaSalvaSucesso(true);
    setTimeout(() => setMetaSalvaSucesso(false), 2500);
  };

  // Handle Feedback Submit
  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    const vendedora = allUsers.find(u => u.id === fbVendedoraId);
    if (!vendedora || !fbTexto.trim()) return;

    const novoFb: Feedback = {
      id: `fb-${Date.now()}`,
      vendedoraId: fbVendedoraId,
      vendedoraNome: vendedora.name,
      autorId: currentUser?.id || 'adm',
      autorNome: currentUser?.name || 'Pamella',
      data: new Date().toISOString().split('T')[0],
      tipo: fbTipo,
      texto: fbTexto.trim(),
      planoAcao: fbPlanoAcao.trim(),
      status: 'em_andamento'
    };

    saveFeedback(novoFb);
    setFbTexto('');
    setFbPlanoAcao('');
    setFbSalvoSucesso(true);
    setTimeout(() => setFbSalvoSucesso(false), 2500);
  };

  // Simulate Spreadsheet Import (replaces Google Forms & Sheets)
  const handleSimulateImport = () => {
    setIsSimulatingImport(true);
    setImportReport(null);

    setTimeout(() => {
      setIsSimulatingImport(false);
      setImportReport({
        totalLinhas: 48,
        clientesCriados: 12,
        propostasCriadas: 48,
        duplicadosIgnorados: 3
      });
    }, 1200);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-purple-600" />
            <span>Painel da Administração & Gestão de Equipe</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Definição de metas, alinhamento de feedbacks, usuários e importação de planilhas antigas
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('metas')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeSubTab === 'metas'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Metas do Mês
          </button>
          <button
            onClick={() => setActiveSubTab('feedbacks')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeSubTab === 'feedbacks'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Feedbacks & PDI
          </button>
          <button
            onClick={() => setActiveSubTab('usuarios')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeSubTab === 'usuarios'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Vendedoras & Logins
          </button>
          <button
            onClick={() => setActiveSubTab('importador')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeSubTab === 'importador'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Importador Planilhas
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: METAS */}
      {activeSubTab === 'metas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Form to define goals */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Definir Metas Mensais
              </h2>
              <p className="text-xs text-slate-500">
                Competência Setembro/2026
              </p>
            </div>

            {metaSalvaSucesso && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Meta atualizada com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSaveMeta} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selecione a Atendente
                </label>
                <select
                  value={selectedVendedoraId}
                  onChange={(e) => setSelectedVendedoraId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta de Venda em R$ (Empréstimo Contratado)
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={metaVendaStr}
                  onChange={(e) => setMetaVendaStr(e.target.value)}
                  className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta de % Médio de Taxa de Assessoria (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={metaTaxaStr}
                  onChange={(e) => setMetaTaxaStr(e.target.value)}
                  className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-sm transition-all"
              >
                Salvar Meta da Vendedora
              </button>
            </form>
          </div>

          {/* Current Metas List & Performance */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Acompanhamento de Metas • Setembro/2026
            </h2>

            <div className="space-y-3">
              {metas.map((m) => {
                const vendedorProps = propostas.filter(
                  p => p.vendedora === m.vendedoraNome && p.dataDigitacao.startsWith('2026-09') && p.status === 'Paga'
                );
                const realizadoVenda = vendedorProps.reduce((acc, p) => acc + p.valorEmprestimo, 0);
                const realizadoTaxa = vendedorProps.reduce((acc, p) => acc + p.valorTaxa, 0);
                const percentualTaxaRealizado = realizadoVenda > 0 ? (realizadoTaxa / realizadoVenda) * 100 : 0;
                const atingimento = m.metaVenda > 0 ? (realizadoVenda / m.metaVenda) * 100 : 0;

                return (
                  <div key={m.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{m.vendedoraNome}</span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatPercent(atingimento)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          atingimento >= 100 ? 'bg-emerald-500' : 'bg-teal-600'
                        }`}
                        style={{ width: `${Math.min(100, atingimento)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Realizado: <strong>{formatCurrency(realizadoVenda)}</strong> de {formatCurrency(m.metaVenda)}</span>
                      <span>Taxa: <strong className="text-amber-600">{formatPercent(percentualTaxaRealizado)}</strong> (meta {m.metaPercentualTaxa}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FEEDBACKS */}
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
                  {sellers.map((s) => (
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
              {feedbacks.map((fb) => (
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
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: USUÁRIOS E LOGINS DAS VENDEDORAS */}
      {activeSubTab === 'usuarios' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>Gestão de Logins das Vendedoras & Equipe</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                O Gerencial cria, cadastra e altera os logins e senhas das vendedoras. As vendedoras não veem informações gerenciais.
              </p>
            </div>

            <button
              onClick={handleOpenNewUser}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Nova Vendedora / Login</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Nome da Vendedora</th>
                  <th className="py-2.5 px-3">Login / E-mail</th>
                  <th className="py-2.5 px-3">Senha de Acesso</th>
                  <th className="py-2.5 px-3">Perfil</th>
                  <th className="py-2.5 px-3">Meta Venda</th>
                  <th className="py-2.5 px-3">Meta Taxa</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {allUsers.map((u) => {
                  const isPassVisible = showPasswordMap[u.id];
                  const passwordDisplay = u.password || '123';
                  const isManagerUser = u.role === 'proprietaria';

                  const displayName = cleanPersonName(u.name);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-extrabold text-[10px]">
                            {displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{displayName}</span>
                        </div>
                        {u.phone && <span className="text-[10px] text-slate-400 block pl-8">{u.phone}</span>}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        {u.email}
                      </td>

                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs">
                          <KeyRound className="w-3 h-3 text-amber-500" />
                          <span>{isPassVisible ? passwordDisplay : '••••••'}</span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
                            title={isPassVisible ? 'Ocultar senha' : 'Exibir senha'}
                          >
                            {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`capitalize px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          u.role === 'vendedora'
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                            : u.role === 'proprietaria'
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300'
                        }`}>
                          {u.role === 'proprietaria' ? 'Gerencial' : u.role}
                        </span>
                      </td>

                      <td className="py-3 px-3 tabular-nums font-semibold">
                        {u.monthlySalesGoal > 0 ? formatCurrency(u.monthlySalesGoal) : '-'}
                      </td>

                      <td className="py-3 px-3 tabular-nums text-slate-600 dark:text-slate-400">
                        {u.monthlyTaxPercentGoal > 0 ? `${u.monthlyTaxPercentGoal}%` : '-'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ativo'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-teal-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Editar Login / Senha"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          {!isManagerUser && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modal: Cadastrar ou Editar Vendedora / Login */}
          {isUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-teal-600" />
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {editingUserId ? 'Alterar Cadastro / Login' : 'Cadastrar Nova Vendedora'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsUserModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Amanda Silva"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Login / E-mail de Acesso
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="vendedora@livia..."
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Senha de Acesso
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 123"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Perfil de Acesso
                      </label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="vendedora">Vendedora (Operacional)</option>
                        <option value="adm">ADM (Gestão Equipe)</option>
                        <option value="financeiro">Financeiro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Status do Usuário
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="ativo">Ativo (Acesso liberado)</option>
                        <option value="inativo">Inativo (Bloqueado)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="(81) 98765-4321"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Meta de Venda Mensal (R$)
                      </label>
                      <input
                        type="number"
                        placeholder="80000"
                        value={formSalesGoal}
                        onChange={(e) => setFormSalesGoal(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Meta % de Taxa Mínima
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="11.0"
                        value={formTaxGoal}
                        onChange={(e) => setFormTaxGoal(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsUserModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold shadow-md transition-all active:scale-95"
                    >
                      {editingUserId ? 'Salvar Alterações' : 'Cadastrar Vendedora'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: IMPORTADOR DE PLANILHAS (Substitui Google Forms & Sheets) */}
      {activeSubTab === 'importador' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-teal-600" />
              <span>Importador de Planilhas Antigas & Respostas do Google Forms</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Elimine definitivamente as planilhas do Excel e formulários do Google subindo arquivos .CSV ou .XLSX com agrupamento automático por CPF
            </p>
          </div>

          <div className="p-8 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-center space-y-3">
            <UploadCloud className="w-12 h-12 text-teal-600 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Arraste sua planilha ou clique para selecionar
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Compatível com colunas: Data, CPF, Nome, Convênio, Operação, Banco, Promotora, Venda, Taxa, Vendedora.
              </p>
            </div>

            <button
              onClick={handleSimulateImport}
              disabled={isSimulatingImport}
              className="px-5 py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isSimulatingImport ? 'Processando e mapeando colunas...' : 'Carregar Planilha de Exemplo (Demonstração)'}
            </button>
          </div>

          {importReport && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Planilha processada com 100% de sucesso!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-slate-700 dark:text-slate-300">
                <div>Total de Linhas: <strong>{importReport.totalLinhas}</strong></div>
                <div>Clientes Novos: <strong>{importReport.clientesCriados}</strong></div>
                <div>Propostas Criadas: <strong>{importReport.propostasCriadas}</strong></div>
                <div>Duplicados Unificados: <strong>{importReport.duplicadosIgnorados}</strong></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
