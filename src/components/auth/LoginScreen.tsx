import React, { useState } from 'react';
import { ShieldCheck, Lock, User as UserIcon, ArrowRight, Sparkles, KeyRound, Info, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface Props {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const { login, switchUser, allUsers } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showDemoProfiles, setShowDemoProfiles] = useState(false);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = login(username, password);
    if (success) {
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setError('Usuário/e-mail ou senha incorretos. Verifique suas credenciais de acesso.');
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    const user = allUsers.find(u => u.role === role);
    if (user) {
      switchUser(user.id);
      if (onLoginSuccess) onLoginSuccess();
    }
  };

  const demoProfiles = [
    {
      role: 'proprietaria' as UserRole,
      title: 'Gerencial',
      name: 'Lívia',
      desc: 'Visão completa: faturamento, lucro líquido, comissões, ranking e despesas',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
      btnColor: 'from-[#0B2A4A] to-[#0F5C63] text-white hover:opacity-95',
    },
    {
      role: 'adm' as UserRole,
      title: 'ADM',
      name: 'Pamella',
      desc: 'Mesmos poderes gerenciais: metas, feedbacks, gestão de logins das vendedoras',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
      btnColor: 'from-purple-800 to-indigo-900 text-white hover:opacity-95',
    },
    {
      role: 'financeiro' as UserRole,
      title: 'Financeiro',
      name: 'Carlos Eduardo',
      desc: 'Mesmos poderes gerenciais: comissões de promotoras, extratos e contas a pagar',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
      btnColor: 'from-blue-800 to-cyan-900 text-white hover:opacity-95',
    },
    {
      role: 'vendedora' as UserRole,
      title: 'Vendedora',
      name: 'Hellen Vasconcelos',
      desc: 'Área restrita: digitação, consulta por CPF, metas próprias (sem dados gerenciais)',
      badgeColor: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950 dark:text-teal-300',
      btnColor: 'from-[#0F5C63] to-[#1B8A8F] text-white hover:opacity-95',
    },
    {
      role: 'digitador' as UserRole,
      title: 'Digitadora',
      name: 'Ana Paula',
      desc: 'Área de digitação rápida e simulações (sem metas ou carteira geral)',
      badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300',
      btnColor: 'from-cyan-700 to-teal-800 text-white hover:opacity-95',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-5">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandLogo size="lg" showSubtitle={true} />
          </div>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Plataforma centralizada de crédito consignado para Lívia Cred Saúde.
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4">
          
          <div className="text-center pb-2">
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              Acesso ao Sistema
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Entre com suas credenciais para continuar
            </p>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold animate-in fade-in">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Login ou E-mail
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Digite seu usuário ou e-mail"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0B2A4A] to-[#0F5C63] hover:from-[#0d345c] hover:to-[#146b73] text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Acessar Plataforma</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Accordion */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDemoProfiles(!showDemoProfiles)}
              className="w-full flex items-center justify-between py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Demonstração rápida (Entrar com 1 clique)
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400">
                {showDemoProfiles ? 'Ocultar' : 'Ver perfis'}
              </span>
            </button>

            {showDemoProfiles && (
              <div className="grid grid-cols-1 gap-2 pt-3 animate-in fade-in duration-200">
                {demoProfiles.map((p) => (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleQuickLogin(p.role)}
                    className={`flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r ${p.btnColor} text-left transition-all active:scale-[0.98] shadow-xs`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-white tracking-wider">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-semibold text-amber-300">
                          ({p.title})
                        </span>
                      </div>
                      <p className="text-[10px] text-white/80 line-clamp-1 mt-0.5">
                        {p.desc}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-white/90 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center pt-1">
            Gestão de acessos e usuários administrada pelo painel de administração da equipe.
          </p>
        </div>

        {/* Security & Copyright Footer */}
        <div className="text-center space-y-1 text-[11px] text-slate-500">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ambiente Seguro • Lívia Cred Saúde CRM</span>
          </p>
          <p>© 2026 Todos os direitos reservados.</p>
        </div>

      </div>
    </div>
  );
};
