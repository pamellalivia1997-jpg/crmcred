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
  X,
  Zap,
  Cloud,
  Activity,
  Share2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { firebaseUsageTracker, FirebaseUsageStats } from '../../services/firebaseUsageTracker';

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
  const { alertas, propostas, clientes, comissoesPromotoras, auditLogs } = useCRM();

  // Real-time Firebase Firestore request tracking stats
  const [fbStats, setFbStats] = React.useState<FirebaseUsageStats>(() => firebaseUsageTracker.getStats());

  React.useEffect(() => {
    return firebaseUsageTracker.subscribe(() => {
      setFbStats(firebaseUsageTracker.getStats());
    });
  }, []);

  // Calculation of Firebase Firestore storage usage (free-tier 1GB baseline)
  const storageMetrics = React.useMemo(() => {
    try {
      const dataPayload = JSON.stringify({ propostas, clientes, comissoesPromotoras, auditLogs, alertas });
      const rawBytes = new Blob([dataPayload]).size + (propostas.length * 1200) + 1048576; // Base cloud collection indexes overhead
      const mb = rawBytes / (1024 * 1024);
      const maxGb = 1.0;
      const percentage = Math.min(100, Math.max(0.2, (mb / (maxGb * 1024)) * 100));
      return {
        usedMb: mb < 1 ? Number(mb.toFixed(2)) : Number(mb.toFixed(1)),
        maxGb,
        percentage: Number(percentage.toFixed(1))
      };
    } catch (e) {
      return { usedMb: 1.4, maxGb: 1.0, percentage: 0.1 };
    }
  }, [propostas, clientes, comissoesPromotoras, auditLogs, alertas]);

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

        {/* Section: Gestão & Relatórios (Proprietária / ADM) */}
        {!isVendedora && !isDigitador && (
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Gestão e Relatórios
            </p>

            <button
              onClick={() => handleNavClick('dashboard')}
              className={navItemClass(currentTab === 'dashboard')}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Painel de Gestão</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('relatorios')}
              className={navItemClass(currentTab === 'relatorios')}
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4" />
                <span>Painel Financeiro</span>
              </div>
            </button>

            {canAccessFinancial() && (
              <button
                onClick={() => handleNavClick('financeiro')}
                className={navItemClass(currentTab === 'financeiro')}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4" />
                  <span>Controladoria</span>
                </div>
              </button>
            )}

            {(canAccessFinancial() || canManageTeam()) && (
              <button
                onClick={() => handleNavClick('comissoes_pagar')}
                className={navItemClass(currentTab === 'comissoes_pagar')}
              >
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4" />
                  <span>Comissões a Pagar</span>
                </div>
              </button>
            )}

            {canManageTeam() && (
              <>
                <button
                  onClick={() => handleNavClick('adm')}
                  className={navItemClass(currentTab === 'adm')}
                >
                  <div className="flex items-center gap-2.5">
                    <Target className="w-4 h-4" />
                    <span>Gestão de Equipe</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('adm_usuarios')}
                  className={navItemClass(currentTab === 'adm_usuarios')}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4" />
                    <span>Cadastro de Usuários</span>
                  </div>
                </button>
              </>
            )}
          </div>
        )}

        {/* Section: Operacional */}
        <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
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
          ) : null}

          <button
            onClick={() => handleNavClick('propostas')}
            className={navItemClass(currentTab === 'propostas')}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Funil de Propostas</span>
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
              <span>Oportunidades & Alertas</span>
            </div>
            {unreadAlerts > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-extrabold text-slate-950">
                {unreadAlerts}
              </span>
            )}
          </button>
          
          {isDigitador && (
            <button
              onClick={() => handleNavClick('gestao_operacional')}
              className={navItemClass(currentTab === 'gestao_operacional')}
            >
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4" />
                <span>Gestão operacional</span>
              </div>
            </button>
          )}
        </div>



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

      {/* Cloud Storage Indicator (Discreet & Simple) */}
      <div className="pt-2.5 pb-1 px-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
            <Cloud className="w-3 h-3 text-teal-600 dark:text-teal-400" />
            Nuvem Segura
          </span>
          <span className="font-mono text-[9px] text-slate-400">
            {storageMetrics.usedMb} MB / {storageMetrics.maxGb} GB ({storageMetrics.percentage}%)
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 dark:bg-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(2, storageMetrics.percentage)}%` }}
            title={`Armazenamento em Nuvem: ${storageMetrics.usedMb} MB de 1 GB`}
          />
        </div>
      </div>

      {/* Real-time Firebase Requests Meter (Ultra-Discreet) */}
      <div className="pt-2 pb-1 px-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
            <Activity className="w-3 h-3 text-cyan-600 dark:text-cyan-400 animate-pulse" />
            <span>Capacidade de Uso Diário</span>
          </span>
          <span className="font-mono text-[9px] text-slate-400">
            {fbStats.reqPerMinute} req/min
          </span>
        </div>

        {/* Mini Bars for Writes (Envio) and Reads (Recebimento) */}
        <div className="space-y-1">
          {/* Envio / Gravações */}
          <div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono leading-none mb-0.5">
              <span>Envio (Gravações)</span>
              <span>{fbStats.writesToday} / 20k ({fbStats.writesQuotaPercent}%)</span>
            </div>
            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, fbStats.writesQuotaPercent)}%` }}
                title={`Envio diário: ${fbStats.writesToday} operações de gravação`}
              />
            </div>
          </div>

          {/* Recebimento / Leituras */}
          <div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono leading-none mb-0.5">
              <span>Recebimento (Leituras)</span>
              <span>{fbStats.readsToday} / 50k ({fbStats.readsQuotaPercent}%)</span>
            </div>
            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, fbStats.readsQuotaPercent)}%` }}
                title={`Recebimento diário: ${fbStats.readsToday} operações de leitura`}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
          <span>Tempo real • Diário</span>
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping inline-block" />
            Ativo
          </span>
        </div>
      </div>

      {/* User Status Footer */}
      <div className="pt-2 pb-1 border-t border-slate-100/80 dark:border-slate-800/60">
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
