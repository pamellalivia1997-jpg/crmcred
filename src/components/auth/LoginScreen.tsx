import React, { useState } from 'react';
import { ShieldCheck, Lock, User as UserIcon, ArrowRight, Info } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const { login, loginWithGoogle } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingNotice, setPendingNotice] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');
    setPendingNotice('');
    const res = await loginWithGoogle();
    setIsGoogleLoading(false);
    if (res.success) {
      if (onLoginSuccess) onLoginSuccess();
    } else if (res.pendingApproval) {
      setPendingNotice(res.message || 'Cadastro realizado! Seu acesso está pendente de aprovação por um Administrador (ADM).');
    } else {
      setError(res.message || 'Não foi possível conectar com o Firebase Auth Google. Tente novamente.');
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPendingNotice('');

    const res = login(username, password);
    if (res.success) {
      if (onLoginSuccess) onLoginSuccess();
    } else if (res.pendingApproval) {
      setPendingNotice(res.message || 'Seu cadastro está pendente de aprovação por um Administrador.');
    } else {
      setError(res.message || 'Usuário/e-mail ou senha incorretos. Verifique suas credenciais de acesso.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-5">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex flex-col items-center justify-center">
            <BrandLogo size="xl" showSubtitle={false} />
            <span className="inline-block mt-2 px-3.5 py-1 rounded-full bg-[#0B2A4A]/10 text-[#0B2A4A] text-xs font-black tracking-widest uppercase shadow-2xs">
              SOLUÇÕES EM CRÉDITO
            </span>
          </div>
        </div>

        {/* Main Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xl space-y-4">
          
          <div className="text-center pb-2">
            <h1 className="text-lg font-black text-slate-900">
              Acesso ao Sistema
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Entre com suas credenciais para continuar
            </p>
          </div>

          {/* Pending approval notice */}
          {pendingNotice && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold leading-snug space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-amber-700">
                <Info className="w-4 h-4 shrink-0" />
                <span className="uppercase text-[10px] tracking-wider font-extrabold">Aguardando Liberação do ADM</span>
              </div>
              <p className="font-semibold text-slate-700">{pendingNotice}</p>
            </div>
          )}

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold animate-in fade-in">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Login ou E-mail
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Digite seu usuário ou e-mail"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
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

          {/* Google Auth Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{isGoogleLoading ? 'Autenticando...' : 'Entrar com Google'}</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 text-center pt-2">
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
