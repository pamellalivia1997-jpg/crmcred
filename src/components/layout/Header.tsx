import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  LogOut,
  Trash2,
  X,
  Cloud,
  CloudUpload,
  Download,
  Upload,
  Loader2,
  Check
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
  const { currentUser, allUsers, switchUser, logout, isManager } = useAuth();
  const {
    alertas,
    clearAllTestData,
    uploadLocalStoreToFirestore,
    exportStoreAsJSON,
    importStoreFromJSON,
    refreshFromFirestore,
    propostas
  } = useCRM();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await uploadLocalStoreToFirestore();
      setSyncNotice(res.message);
      setTimeout(() => setSyncNotice(null), 6000);
    } catch (e: any) {
      setSyncNotice(`Erro na sincronização: ${e.message}`);
      setTimeout(() => setSyncNotice(null), 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const json = exportStoreAsJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liviacred_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSyncNotice('Backup JSON baixado com sucesso!');
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (e: any) {
      setSyncNotice(`Erro ao exportar: ${e.message}`);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setIsSyncing(true);
        const res = await importStoreFromJSON(content);
        setSyncNotice(res.message);
        setTimeout(() => setSyncNotice(null), 6000);
        setIsSyncing(false);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Active unread alerts count
  const unreadAlertsCount = alertas.filter(a => {
    if (currentUser?.role === 'digitador') {
      return a.status === 'nova' && a.tipo === 'portabilidade' && a.liberadoParaDigitador;
    }
    if (currentUser?.role === 'vendedora') {
      return a.status === 'nova' && a.vendedoraResponsavel === currentUser.name;
    }
    return a.status === 'nova';
  }).length;

  const roleLabels: Record<string, string> = {
    proprietaria: 'Gerencial',
    adm: 'ADM',
    financeiro: 'Financeiro',
    vendedora: 'Vendedora',
    digitador: 'Digitador(a)'
  };

  const roleBadges: Record<string, string> = {
    proprietaria: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
    adm: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
    financeiro: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
    vendedora: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300',
    digitador: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300'
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
            className="cursor-pointer shrink-0 flex items-center"
          >
            <BrandLogo size="sm" showSubtitle={false} className="sm:hidden" />
            <BrandLogo size="md" showSubtitle={true} className="hidden sm:flex" />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
          
          {/* PWA Install Button */}
          <PWAInstallButton variant="subtle" className="flex" />

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
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-none truncate max-w-[80px] sm:max-w-[120px]">
                  {cleanPersonName(currentUser?.name)}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                  {currentUser ? roleLabels[currentUser.role] : ''}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 ml-0.5" />
            </button>

            {/* Profile Switcher Dropdown (Compact, contained within mobile and desktop viewport) */}
            {showUserMenu && typeof document !== 'undefined' && createPortal(
              <div className="fixed inset-0 z-50 pointer-events-auto">
                {/* Click-outside backdrop */}
                <div
                  className="fixed inset-0 bg-black/25 dark:bg-black/45 backdrop-blur-2xs transition-opacity animate-in fade-in duration-150"
                  onClick={() => setShowUserMenu(false)}
                />

                {/* Compact Profile Switcher Dropdown anchored neatly to top-right */}
                <div className="fixed top-14 right-2 sm:right-6 w-64 sm:w-72 max-w-[calc(100vw-20px)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[70vh]">
                  {isManager ? (
                    <>
                      <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Acesso Gerencial
                          </p>
                          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                            Alternar Perfil
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowUserMenu(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          aria-label="Fechar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1 overflow-y-auto py-1.5 max-h-48 sm:max-h-56 scrollbar-thin">
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
                                  if (user.role === 'vendedora') {
                                    onNavigate('vendedora_home');
                                  } else if (user.role === 'digitador') {
                                    onNavigate('digitador_home');
                                  } else {
                                    onNavigate('dashboard');
                                  }
                                }
                              }}
                              className={`w-full flex items-center justify-between p-1.5 sm:p-2 rounded-xl text-left transition-colors ${
                                isSelected
                                  ? 'bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[9px] text-slate-700 dark:text-slate-300 shrink-0">
                                  {displayName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {displayName}
                                  </p>
                                  <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate font-mono">
                                    {user.email}
                                  </p>
                                </div>
                              </div>

                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${roleBadges[user.role] || 'bg-slate-100 text-slate-700'}`}>
                                {user.role === 'proprietaria' ? 'Gerencial' : user.role}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Backup Offline Options */}
                      <div className="pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 space-y-1 px-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowUserMenu(false);
                              handleExportBackup();
                            }}
                            className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200/60 dark:border-slate-700"
                            title="Exportar arquivo .json completo"
                          >
                            <Download className="w-3 h-3 text-slate-500" />
                            <span>Exportar Backup</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.click();
                            }}
                            className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200/60 dark:border-slate-700"
                            title="Restaurar arquivo .json de backup"
                          >
                            <Upload className="w-3 h-3 text-slate-500" />
                            <span>Restaurar</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-1">
                        {currentUser?.role === 'financeiro' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm('Deseja realmente zerar todo o banco de dados (funil, clientes e controladoria)? Esta ação apagará permanentemente todos os registros da nuvem.')) {
                                await clearAllTestData();
                                setShowUserMenu(false);
                              }
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline py-0.5"
                            title="Zerar todo o banco de dados da nuvem"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Zerar Banco</span>
                          </button>
                        ) : <div />}

                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            logout();
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline py-0.5"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Sair</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-1 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`text-[9px] font-bold uppercase ${
                            currentUser?.role === 'digitador'
                              ? 'text-cyan-600 dark:text-cyan-400'
                              : 'text-teal-600 dark:text-teal-400'
                          }`}>
                            {currentUser?.role === 'digitador' ? 'Sessão da Digitadora' : 'Sessão da Vendedora'}
                          </span>
                          <p className="font-extrabold text-xs text-slate-900 dark:text-white mt-0.5">
                            {cleanPersonName(currentUser?.name)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {currentUser?.email}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowUserMenu(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-1.5 leading-snug">
                        {currentUser?.role === 'digitador'
                          ? 'Perfil de digitação rápida e simulações. Propostas próprias e leads autorizados por ADM.'
                          : 'Área operacional restrita de vendas.'}
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-xs transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair / Trocar de Usuário</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>,
              document.body
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

          {/* Direct Logout Button - Hidden on Mobile */}
          <button
            onClick={logout}
            className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Sair do Sistema"
            aria-label="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>

        </div>
      </div>

      {/* Cloud Sync & Backup Toast Notification */}
      {syncNotice && (
        <div className="fixed top-16 right-4 z-50 max-w-md bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <span>{syncNotice}</span>
          <button onClick={() => setSyncNotice(null)} className="text-slate-400 hover:text-white p-0.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hidden input for restoring JSON backup */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportBackup}
        accept=".json"
        className="hidden"
      />
    </header>
  );
};
