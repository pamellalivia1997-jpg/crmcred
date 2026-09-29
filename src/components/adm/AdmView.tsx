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
  EyeOff,
  Search,
  Lock,
  Mail,
  Phone,
  UserCog,
  Filter
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { User, MetaVendedora, Feedback, UserRole } from '../../types';
import { formatCurrency, formatPercent, formatDate, cleanPersonName } from '../../utils/formatters';

interface AdmViewProps {
  initialSubTab?: 'usuarios' | 'metas' | 'feedbacks' | 'importador';
}

export const AdmView: React.FC<AdmViewProps> = ({ initialSubTab = 'usuarios' }) => {
  const { metas, feedbacks, propostas, saveMeta, saveFeedback } = useCRM();
  const { allUsers, currentUser, saveUser, deleteUser } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'usuarios' | 'metas' | 'feedbacks' | 'importador'>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

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

  // User Management State (Cadastro e Edição de Usuários para os ADMs)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formRole, setFormRole] = useState<UserRole>('vendedora');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [formSalesGoal, setFormSalesGoal] = useState('80000');
  const [formTaxGoal, setFormTaxGoal] = useState('11.0');
  const [formSalaryCost, setFormSalaryCost] = useState('2200');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [userRoleFilter, setUserRoleFilter] = useState<'todos' | UserRole>('todos');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSuccessMessage, setUserSuccessMessage] = useState<string | null>(null);

  // Spreadsheet importer simulated state
  const [isSimulatingImport, setIsSimulatingImport] = useState(false);
  const [importReport, setImportReport] = useState<{ totalLinhas: number; clientesCriados: number; propostasCriadas: number; duplicadosIgnorados: number } | null>(null);

  // Sellers
  const sellers = useMemo(() => allUsers.filter(u => u.role === 'vendedora'), [allUsers]);

  // Filtered users for ADM view
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchRole = userRoleFilter === 'todos' || u.role === userRoleFilter;
      const q = userSearchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q));
      return matchRole && matchSearch;
    });
  }, [allUsers, userRoleFilter, userSearchQuery]);

  const handleOpenNewUser = () => {
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormShowPassword(false);
    setFormRole('vendedora');
    setFormPhone('');
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
    setFormPassword(user.password || '');
    setFormShowPassword(false);
    setFormRole(user.role);
    setFormPhone(user.phone || '');
    setFormStatus(user.status);
    setFormSalesGoal(user.monthlySalesGoal ? user.monthlySalesGoal.toString() : '0');
    setFormTaxGoal(user.monthlyTaxPercentGoal ? user.monthlyTaxPercentGoal.toString() : '0');
    setFormSalaryCost(user.baseSalaryCost ? user.baseSalaryCost.toString() : '0');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const targetId = editingUserId || `user-${Date.now()}`;
    let finalPassword = formPassword.trim();
    if (!finalPassword) {
      if (editingUserId) {
        const existing = allUsers.find(u => u.id === editingUserId);
        finalPassword = existing?.password || '123';
      } else {
        finalPassword = '123';
      }
    }

    const updatedUser: User = {
      id: targetId,
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      password: finalPassword,
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

    setUserSuccessMessage(
      editingUserId
        ? `Usuário "${formName.trim()}" atualizado com sucesso!`
        : `Novo usuário "${formName.trim()}" cadastrado com sucesso!`
    );
    setTimeout(() => setUserSuccessMessage(null), 4000);

    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (user: User) => {
    if (user.role === 'proprietaria') {
      alert('Não é permitido excluir o usuário principal da Lívia.');
      return;
    }
    if (currentUser?.id === user.id) {
      alert('Você não pode excluir o usuário que está atualmente logado.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o cadastro e login de "${user.name}"?`)) {
      deleteUser(user.id);
      setUserSuccessMessage(`Usuário "${user.name}" removido com sucesso.`);
      setTimeout(() => setUserSuccessMessage(null), 4000);
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
            onClick={() => setActiveSubTab('usuarios')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'usuarios'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-600" />
            <span>Cadastro de Usuários</span>
          </button>
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
            <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
            <span>Importador Planilhas</span>
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

      {/* SUB-TAB: CADASTRO E GESTÃO DE USUÁRIOS PARA OS ADMS */}
      {activeSubTab === 'usuarios' && (
        <div className="space-y-4">
          {/* Success Banner */}
          {userSuccessMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{userSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setUserSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Total de Usuários</span>
              <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5 block">
                {allUsers.length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/40 shadow-xs">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block">Administradores (ADMs)</span>
              <span className="text-xl font-black text-purple-900 dark:text-purple-200 tabular-nums mt-0.5 block">
                {allUsers.filter(u => u.role === 'adm').length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-teal-200/60 dark:border-teal-900/40 shadow-xs">
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 block">Vendedoras</span>
              <span className="text-xl font-black text-teal-900 dark:text-teal-200 tabular-nums mt-0.5 block">
                {allUsers.filter(u => u.role === 'vendedora').length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/40 shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block">Gerencial & Financeiro</span>
              <span className="text-xl font-black text-blue-900 dark:text-blue-200 tabular-nums mt-0.5 block">
                {allUsers.filter(u => u.role === 'proprietaria' || u.role === 'financeiro').length}
              </span>
            </div>
          </div>

          {/* Main User Management Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            
            {/* Header + CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  <span>Cadastro e Gestão de Usuários</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Administradores e Gerência podem cadastrar novos acessos, editar dados, redefinir senhas e alterar permissões de toda a equipe.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenNewUser}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Cadastrar Novo Usuário</span>
              </button>
            </div>

            {/* Filter Bar & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nome, login ou telefone..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {userSearchQuery && (
                  <button
                    onClick={() => setUserSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('todos')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'todos'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Todos ({allUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('adm')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'adm'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                  }`}
                >
                  ADMs
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('vendedora')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'vendedora'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100'
                  }`}
                >
                  Vendedoras
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('financeiro')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'financeiro'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                  }`}
                >
                  Financeiro
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('proprietaria')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'proprietaria'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                  }`}
                >
                  Gerencial
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('digitador')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'digitador'
                      ? 'bg-cyan-700 text-white shadow-xs'
                      : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100'
                  }`}
                >
                  Digitadoras ({allUsers.filter(u => u.role === 'digitador').length})
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Colaborador / Nome</th>
                    <th className="py-2.5 px-3">Perfil / Cargo</th>
                    <th className="py-2.5 px-3">Login / E-mail</th>
                    <th className="py-2.5 px-3">Senha de Acesso</th>
                    <th className="py-2.5 px-3">Telefone</th>
                    <th className="py-2.5 px-3">Meta Individual</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        Nenhum usuário encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isPassVisible = showPasswordMap[u.id];
                      const passwordDisplay = u.password || '••••••';
                      const isCurrentUser = currentUser?.id === u.id;
                      const displayName = cleanPersonName(u.name);

                      return (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[10px] shrink-0 ${
                                u.role === 'adm'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200'
                                  : u.role === 'proprietaria'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                                  : u.role === 'financeiro'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                                  : 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200'
                              }`}>
                                {displayName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="block truncate">{displayName}</span>
                                {isCurrentUser && (
                                  <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400">
                                    (Seu Usuário Atual)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide ${
                              u.role === 'adm'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : u.role === 'proprietaria'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : u.role === 'financeiro'
                                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                            }`}>
                              {u.role === 'adm'
                                ? 'ADM'
                                : u.role === 'proprietaria'
                                ? 'Gerencial'
                                : u.role === 'financeiro'
                                ? 'Financeiro'
                                : 'Vendedora'}
                            </span>
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

                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            {u.phone || '-'}
                          </td>

                          <td className="py-3 px-3 tabular-nums font-semibold">
                            {u.monthlySalesGoal > 0 ? (
                              <div>
                                <span>{formatCurrency(u.monthlySalesGoal)}</span>
                                {u.monthlyTaxPercentGoal > 0 && (
                                  <span className="text-[10px] text-slate-400 block font-normal">
                                    Taxa: {u.monthlyTaxPercentGoal}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'ativo'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditUser(u)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-teal-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors flex items-center gap-1 font-semibold"
                                title="Editar Cadastro e Permissões"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-[11px]">Editar</span>
                              </button>
                              
                              {u.role !== 'proprietaria' && !isCurrentUser && (
                                <button
                                  type="button"
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal: Cadastrar ou Editar Usuário */}
          {isUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 my-8">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600">
                      {editingUserId ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        {editingUserId ? 'Editar Usuário & Acesso' : 'Cadastrar Novo Usuário'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {editingUserId
                          ? 'Altere os dados cadastrais, cargo, login ou redefina a senha'
                          : 'Preencha os dados e credenciais para liberar o acesso ao sistema'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Amanda Silva Vasconcelos"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Perfil de Acesso / Cargo *
                      </label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="adm">ADM (Administrador - Gestão e Usuários)</option>
                        <option value="vendedora">Vendedora (Operacional - Propostas)</option>
                        <option value="digitador">Digitador(a) (Simulações e Portabilidade Autorizada)</option>
                        <option value="financeiro">Financeiro (Controladoria e Comissões)</option>
                        <option value="proprietaria">Gerencial (Diretoria / Geral)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Status do Usuário *
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as 'ativo' | 'inativo')}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="ativo">Ativo (Acesso Liberado)</option>
                        <option value="inativo">Inativo (Acesso Bloqueado)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Login ou E-mail de Acesso *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: amanda@liviacred.com"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Senha de Acesso {editingUserId && <span className="font-normal text-slate-400 text-[10px]">(opcional)</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={formShowPassword ? 'text' : 'password'}
                          placeholder={editingUserId ? 'Manter senha atual' : 'Digite a senha do usuário'}
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => setFormShowPassword(!formShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {formShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: (81) 98765-4321"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Operational and Goals Section (for Sellers and Team) */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Metas & Parâmetros Individuais
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Meta de Venda (R$)
                        </label>
                        <input
                          type="number"
                          placeholder="80000"
                          value={formSalesGoal}
                          onChange={(e) => setFormSalesGoal(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Meta de Taxa (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="11.0"
                          value={formTaxGoal}
                          onChange={(e) => setFormTaxGoal(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Custo Base (R$)
                        </label>
                        <input
                          type="number"
                          placeholder="2200"
                          value={formSalaryCost}
                          onChange={(e) => setFormSalaryCost(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsUserModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold shadow-md transition-all active:scale-95"
                    >
                      {editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
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
