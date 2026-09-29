import React from 'react';
import {
  LayoutDashboard,
  Target,
  FileSpreadsheet,
  Users,
  BellRing,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  UserCheck,
  UserPlus,
  ShieldAlert,
  PlusCircle,
  FileCheck2,
  UploadCloud,
  Calculator,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';

interface Props {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenNovaProposta: () => void;
}

export const Sidebar: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onOpenNovaProposta
}) => {
  const { currentUser, canAccessFinancial, canManageTeam } = useAuth();
  const { alertas } = useCRM();

  const isVendedora = currentUser?.role === 'vendedora';
  const isDigitador = currentUser?.role === 'digitador';
  const unreadAlerts = alertas.filter(a => {
    if (isDigitador) {
      return a.tipo === 'portabilidade' && a.liberadoParaDigitador === true && a.status === 'nova';
    }
    if (isVendedora) {
      return a.status === 'nova' && a.vendedoraResponsavel === currentUser?.name;
    }
    return a.status === 'nova';
  }).length;

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    onCloseMobile();
  };

  const navItemClass = (active: boolean) =>
    `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
      active
        ? 'bg-[#0F5C63] text-white shadow-sm'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-3.5 space-y-4">
      <div className="space-y-4">
        {/* Quick New Proposal CTA */}
        <button
          onClick={() => {
            onCloseMobile();
            onOpenNovaProposta();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          <span>{isDigitador ? 'Nova Digitação / Simulação' : 'Nova Proposta'}</span>
        </button>

        {/* Section: Operacional */}
        <div className="space-y-1">
          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {isDigitador ? 'Área da Digitadora' : 'Operacional'}
          </p>

          {isDigitador ? (
            <button
              onClick={() => handleNavClick('digitador_home')}
              className={navItemClass(currentTab === 'digitador_home')}
            >
              <div className="flex items-center gap-2.5">
                <Calculator className="w-4 h-4" />
                <span>Painel da Digitadora</span>
              </div>
            </button>
          ) : isVendedora ? (
            <button
              onClick={() => handleNavClick('vendedora_home')}
              className={navItemClass(currentTab === 'vendedora_home')}
            >
              <div className="flex items-center gap-2.5">
                <Target className="w-4 h-4" />
                <span>Minha Meta & Home</span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => handleNavClick('dashboard')}
              className={navItemClass(currentTab === 'dashboard')}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Painel Gerencial</span>
              </div>
            </button>
          )}

          <button
            onClick={() => handleNavClick('propostas')}
            className={navItemClass(currentTab === 'propostas')}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isDigitador ? 'Minhas Propostas Digitadas' : 'Funil de Propostas'}</span>
            </div>
          </button>

          {!isDigitador && (
            <button
              onClick={() => handleNavClick('clientes')}
              className={navItemClass(currentTab === 'clientes')}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Clientes & Timeline</span>
              </div>
            </button>
          )}

          <button
            onClick={() => handleNavClick('alertas')}
            className={navItemClass(currentTab === 'alertas')}
          >
            <div className="flex items-center gap-2.5">
              <BellRing className="w-4 h-4" />
              <span>{isDigitador ? 'Leads Portabilidade (ADM)' : 'Oportunidades & Alertas'}</span>
            </div>
            {unreadAlerts > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-extrabold text-slate-950">
                {unreadAlerts}
              </span>
            )}
          </button>
        </div>

        {/* Section: Gestão & Relatórios (Proprietária / ADM) */}
        {!isVendedora && !isDigitador && (
          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Gestão & Relatórios
            </p>

            <button
              onClick={() => handleNavClick('relatorios')}
              className={navItemClass(currentTab === 'relatorios')}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Acompanhamento Semanal</span>
              </div>
            </button>

            {canManageTeam() && (
              <>
                <button
                  onClick={() => handleNavClick('adm_usuarios')}
                  className={navItemClass(currentTab === 'adm_usuarios')}
                >
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4" />
                    <span>Cadastro de Usuários</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('adm')}
                  className={navItemClass(currentTab === 'adm')}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4" />
                    <span>Painel ADM & Metas</span>
                  </div>
                </button>
              </>
            )}
          </div>
        )}

        {/* Section: Financeiro & Controladoria (Proprietária / Financeiro) */}
        {canAccessFinancial() && (
          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Controladoria & Finanças
            </p>

            <button
              onClick={() => handleNavClick('financeiro')}
              className={navItemClass(currentTab === 'financeiro')}
            >
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4" />
                <span>Comissões Promotoras</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('contas_pagar')}
              className={navItemClass(currentTab === 'contas_pagar')}
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4" />
                <span>Contas a Pagar</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('fechamento_vendedoras')}
              className={navItemClass(currentTab === 'fechamento_vendedoras')}
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4" />
                <span>Comissões a Pagar</span>
              </div>
            </button>
          </div>
        )}

        {/* Section: Auditoria & Segurança (Gerencial) */}
        {!isVendedora && (
          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Conformidade
            </p>

            <button
              onClick={() => handleNavClick('auditoria')}
              className={navItemClass(currentTab === 'auditoria')}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4" />
                <span>Auditoria LGPD</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* User Status Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-2">
          <span>Versão PWA v1.0.4</span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] sticky top-14 sm:top-16 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide over) */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          <div className="relative flex flex-col w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Menu de Navegação
              </span>
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
