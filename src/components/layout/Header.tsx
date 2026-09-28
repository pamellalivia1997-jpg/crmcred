import React, { useState } from 'react';
import {
  Bell,
  Sun,
  Moon,
  ChevronDown,
  UserCheck,
  RotateCcw,
  ShieldCheck,
  Menu,
  Sparkles,
  LogOut
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { cleanPersonName } from '../../utils/formatters';

interface Props {
  onToggleSidebar?: () => void;
  onOpenAlerts?: () => void;
  onNavigate?: (tab: string) => void;
}

export const Header: React.FC<Props> = ({ onToggleSidebar, onOpenAlerts, onNavigate }) => {
  const { currentUser, allUsers, switchUser, logout, isManager, theme, toggleTheme } = useAuth();
  const { alertas, resetAllData } = useCRM();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Active unread alerts count
  const unreadAlertsCount = alertas.filter(a => {
    if (currentUser?.role === 'vendedora') {
      return a.status === 'nova' && a.vendedoraResponsavel === currentUser.name;
    }
    return a.status === 'nova';
  }).length;

  const roleLabels = {
    proprietaria: 'Gerencial',
    adm: 'ADM',
    financeiro: 'Financeiro',
    vendedora: 'Vendedora'
  };

  const roleBadges = {
    proprietaria: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
    adm: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
    financeiro: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
    vendedora: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300',
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        
        {/* Left: Mobile Menu Trigger + Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => onNavigate && onNavigate(currentUser?.role === 'vendedora' ? 'vendedora_home' : 'dashboard')}
            className="cursor-pointer"
          >
            <BrandLogo size="sm" showSubtitle={false} className="sm:hidden" />
            <BrandLogo size="md" showSubtitle={true} className="hidden sm:flex" />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* PWA Install Button */}
          <PWAInstallButton variant="subtle" className="hidden sm:flex" />

          {/* Quick Profile Switcher (Primary tool for demonstration!) */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 py-1 px-2 sm:px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700 transition text-left"
              title="Trocar perfil de demonstração"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#0B2A4A] to-[#0F5C63] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                {cleanPersonName(currentUser?.name).slice(0, 2).toUpperCase() || 'LV'}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-none truncate max-w-[120px]">
                  {cleanPersonName(currentUser?.name)}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                  {currentUser ? roleLabels[currentUser.role] : ''}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 ml-0.5" />
            </button>

            {/* Profile Switcher Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {isManager ? (
                    <>
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Acesso Gerencial • Trocar Perfil
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Alterne a visão de demonstração:
                        </p>
                      </div>

                      <div className="space-y-1 max-h-64 overflow-y-auto py-1">
                        {allUsers.map((user) => {
                          const isSelected = user.id === currentUser?.id;
                          const displayName = cleanPersonName(user.name);
                          return (
                            <button
                              key={user.id}
                              onClick={() => {
                                switchUser(user.id);
                                setShowUserMenu(false);
                                if (onNavigate) {
                                  onNavigate(user.role === 'vendedora' ? 'vendedora_home' : 'dashboard');
                                }
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                                isSelected
                                  ? 'bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                                  {displayName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {displayName}
                                  </p>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                    {roleLabels[user.role]}
                                  </p>
                                </div>
                              </div>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${roleBadges[user.role]}`}>
                                {user.role === 'proprietaria' ? 'Gerencial' : user.role}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2">
                        <button
                          onClick={() => {
                            if (confirm('Deseja restaurar todos os dados fictícios originais de apresentação?')) {
                              resetAllData();
                              setShowUserMenu(false);
                            }
                          }}
                          className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar demo</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            logout();
                          }}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Desconectar</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-teal-600 dark:text-teal-400">
                          Sessão da Vendedora
                        </span>
                        <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {cleanPersonName(currentUser?.name)}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {currentUser?.email}
                        </p>
                      </div>

                      <p className="text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
                        Área operacional restrita. Informações gerenciais são visíveis exclusivamente para Lívia, ADM e Financeiro.
                      </p>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-xs transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair / Trocar de Usuário</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Notifications Bell */}
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Ver Oportunidades & Alertas"
            aria-label="Alertas e Oportunidades"
          >
            <Bell className="w-5 h-5" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-slate-950 shadow-sm animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>

          {/* Direct Logout Button */}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Sair do Sistema"
            aria-label="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>

        </div>
      </div>
    </header>
  );
};
