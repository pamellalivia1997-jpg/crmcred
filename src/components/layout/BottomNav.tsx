import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  BellRing,
  MoreHorizontal,
  Target,
  DollarSign,
  Calculator
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';

interface Props {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMore: () => void;
}

export const BottomNav: React.FC<Props> = ({ currentTab, onSelectTab, onOpenMore }) => {
  const { currentUser } = useAuth();
  const { alertas } = useCRM();

  const isVendedora = currentUser?.role === 'vendedora';
  const isDigitador = currentUser?.role === 'digitador';
  
  // Unread alerts count
  const unreadAlerts = alertas.filter(a => {
    if (isDigitador) {
      return a.tipo === 'portabilidade' && a.liberadoParaDigitador === true && a.status === 'nova';
    }
    if (isVendedora) {
      return a.status === 'nova' && a.vendedoraResponsavel === currentUser?.name;
    }
    return a.status === 'nova';
  }).length;

  const tabs = isDigitador
    ? [
        {
          id: 'digitador_home',
          label: 'Digitação',
          icon: Calculator,
        },
        {
          id: 'propostas',
          label: 'Propostas',
          icon: FileSpreadsheet,
        },
        {
          id: 'alertas',
          label: 'Portabilidade',
          icon: BellRing,
          badge: unreadAlerts > 0 ? unreadAlerts : undefined,
        },
        {
          id: 'mais',
          label: 'Menu',
          icon: MoreHorizontal,
          isAction: true,
        },
      ]
    : [
        {
          id: isVendedora ? 'vendedora_home' : 'dashboard',
          label: isVendedora ? 'Minha Meta' : 'Painel',
          icon: isVendedora ? Target : LayoutDashboard,
        },
        {
          id: 'propostas',
          label: 'Propostas',
          icon: FileSpreadsheet,
        },
        {
          id: 'clientes',
          label: 'Clientes',
          icon: Users,
        },
        {
          id: 'alertas',
          label: 'Alertas',
          icon: BellRing,
          badge: unreadAlerts > 0 ? unreadAlerts : undefined,
        },
        {
          id: 'mais',
          label: 'Mais',
          icon: MoreHorizontal,
          isAction: true,
        },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe shadow-lg">
      <div className={`grid ${tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-5'} h-15`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.isAction) {
                  onOpenMore();
                } else {
                  onSelectTab(tab.id);
                }
              }}
              className={`relative flex flex-col items-center justify-center py-1 transition-colors ${
                isActive
                  ? 'text-[#0F5C63] dark:text-[#28B0B7]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-slate-950 animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold mt-1 tracking-tight ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[#0F5C63] dark:bg-[#28B0B7]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
