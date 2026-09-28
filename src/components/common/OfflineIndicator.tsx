import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:right-auto md:left-6 z-50 flex items-center justify-between gap-3 rounded-xl bg-amber-500/95 dark:bg-amber-600/95 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-xl backdrop-blur-xs border border-amber-300">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 animate-pulse text-slate-950" />
        <span>Modo Offline Ativo — Exibindo dados locais seguros em cache.</span>
      </div>
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-ping" />
    </div>
  );
};
