import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  X,
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
  Filter,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole } from '../../types';
import { cleanPersonName } from '../../utils/formatters';

export const UsuariosView: React.FC = () => {
  const { allUsers, currentUser, saveUser, approveUser, deleteUser } = useAuth();

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formRole, setFormRole] = useState<UserRole>('vendedora');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'ativo' | 'inativo'>('ativo');

  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [userRoleFilter, setUserRoleFilter] = useState<'todos' | UserRole>('todos');
  const [selectedLinkUser, setSelectedLinkUser] = useState<Record<string, string>>({});
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSuccessMessage, setUserSuccessMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleOpenNewUser = () => {
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('123');
    setFormShowPassword(false);
    setFormRole('vendedora');
    setFormPhone('');
    setFormStatus('ativo');
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(user.password || '123');
    setFormShowPassword(false);
    setFormRole(user.role);
    setFormPhone(user.phone || '');
    setFormStatus(user.status);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const targetId = editingUserId || `user-${Date.now()}`;
    let finalPassword = formPassword.trim() || '123';

    const updatedUser: User = {
      id: targetId,
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      password: finalPassword,
      role: formRole,
      phone: formPhone.trim(),
      status: formStatus
    };

    saveUser(updatedUser);

    setUserSuccessMessage(
      editingUserId
        ? `Usuário "${formName.trim()}" atualizado com sucesso!`
        : `Novo usuário "${formName.trim()}" criado com sucesso!`
    );

    setTimeout(() => {
      setUserSuccessMessage(null);
    }, 3500);

    setIsUserModalOpen(false);
  };

  const roleLabels: Record<UserRole, string> = {
    proprietaria: 'Gerencial (Proprietária)',
    adm: 'Administrador (ADM)',
    financeiro: 'Financeiro / Controladoria',
    vendedora: 'Vendedora (Comercial)',
    digitador: 'Digitador(a) Operacional'
  };

  const roleBadges: Record<UserRole, string> = {
    proprietaria: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200',
    adm: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200',
    financeiro: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200',
    vendedora: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200',
    digitador: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200'
  };

  const filteredUsers = allUsers.filter(u => {
    if (userRoleFilter !== 'todos' && u.role !== userRoleFilter) return false;
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      return matchName || matchEmail;
    }
    return true;
  });

  const pendingApprovalUsers = allUsers.filter(u => u.status === 'inativo');

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            <span>Cadastro & Gestão de Usuários</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento de acessos, credenciais, cargos e aprovação de logins da equipe.
          </p>
        </div>

        <button
          onClick={handleOpenNewUser}
          className="flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Success Notification */}
      {userSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{userSuccessMessage}</span>
        </div>
      )}

      {/* Pending Approval Section */}
      {pendingApprovalUsers.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                Cadastros Pendentes de Aprovação ({pendingApprovalUsers.length})
              </h2>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Novos usuários registrados via Conta Google que aguardam autorização do ADM para acessar a plataforma.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {pendingApprovalUsers.map((pending) => (
              <div
                key={pending.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {pending.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 uppercase">
                      Pendente
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{pending.email}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={selectedLinkUser[pending.id] || pending.role || 'vendedora'}
                    onChange={(e) => setSelectedLinkUser({ ...selectedLinkUser, [pending.id]: e.target.value })}
                    className="py-1 px-2 text-[11px] font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    <option value="vendedora">Vendedora</option>
                    <option value="adm">ADM</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="digitador">Digitador(a)</option>
                  </select>

                  <button
                    onClick={() => {
                      const roleToSet = (selectedLinkUser[pending.id] as UserRole) || pending.role || 'vendedora';
                      approveUser(pending.id, roleToSet);
                      setUserSuccessMessage(`Usuário "${pending.name}" ativado com sucesso como ${roleLabels[roleToSet]}!`);
                      setTimeout(() => setUserSuccessMessage(null), 3500);
                    }}
                    className="py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aprovar</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Deseja recusar e excluir a solicitação de ${pending.name}?`)) {
                        deleteUser(pending.id);
                      }
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                    title="Recusar cadastro"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(['todos', 'vendedora', 'digitador', 'financeiro', 'adm', 'proprietaria'] as const).map((r) => {
            const roleNameMap: Record<string, string> = {
              todos: 'Todos',
              vendedora: 'Vendedoras',
              digitador: 'Digitadoras',
              financeiro: 'Financeiro',
              adm: 'ADM',
              proprietaria: 'Gerencial'
            };
            const isSelected = userRoleFilter === r;
            return (
              <button
                key={r}
                onClick={() => setUserRoleFilter(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#0B2A4A] dark:bg-[#1B8A8F] text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {roleNameMap[r]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider">
                <th className="py-3 px-4">Usuário / Colaborador</th>
                <th className="py-3 px-3">Cargo / Perfil</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Telefone</th>
                <th className="py-3 px-3">Senha de Acesso</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    Nenhum usuário encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isVisiblePass = showPasswordMap[user.id];
                  const isMasterUser = user.name === 'Lívia' || user.id === currentUser?.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0B2A4A] to-[#0F5C63] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {cleanPersonName(user.name).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {cleanPersonName(user.name)}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleBadges[user.role]}`}>
                          {roleLabels[user.role]}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            user.status === 'ativo'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'ativo' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          {user.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {user.phone || '-'}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                            {isVisiblePass ? user.password || '123' : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPasswordMap({ ...showPasswordMap, [user.id]: !isVisiblePass })}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title={isVisiblePass ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {isVisiblePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Editar dados cadastrais"
                          >
                            <Edit3 className="w-4 h-4 text-teal-600" />
                          </button>

                          {!isMasterUser && (
                            <button
                              onClick={() => {
                                if (confirmDeleteId === user.id) {
                                  deleteUser(user.id);
                                  setConfirmDeleteId(null);
                                  setUserSuccessMessage(`Usuário "${user.name}" excluído.`);
                                  setTimeout(() => setUserSuccessMessage(null), 3000);
                                } else {
                                  setConfirmDeleteId(user.id);
                                  setTimeout(() => setConfirmDeleteId(null), 4000);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition ${
                                confirmDeleteId === user.id
                                  ? 'bg-rose-600 text-white animate-pulse'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              }`}
                              title={confirmDeleteId === user.id ? 'Clique para confirmar exclusão' : 'Excluir usuário'}
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Modal: Cadastro e Edição de Usuário (LIMPO - SEM SEÇÃO DE METAS INDIVIDUAIS) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {editingUserId ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do colaborador"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail de Acesso *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="email@empresa.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={formShowPassword ? 'text' : 'password'}
                    placeholder="Senha de acesso (Padrão: 123)"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium font-mono"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cargo / Nível de Permissão *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                  >
                    <option value="vendedora">Vendedora (Comercial)</option>
                    <option value="digitador">Digitador(a) Operacional</option>
                    <option value="financeiro">Financeiro / Controladoria</option>
                    <option value="adm">Administrador (ADM)</option>
                    <option value="proprietaria">Gerencial (Proprietária)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status da Conta *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'ativo' | 'inativo')}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                  >
                    <option value="ativo">Ativo (Acesso Liberado)</option>
                    <option value="inativo">Inativo / Bloqueado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Telefone / WhatsApp <span className="font-normal text-slate-400 text-[10px]">(opcional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="(81) 98888-7777"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-extrabold shadow-sm active:scale-95 transition"
                >
                  {editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
