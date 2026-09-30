import React from 'react';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<Props> = ({ className = '', size = 'md', showSubtitle = false }) => {
  const iconDimensions = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
    xl: 'w-16 h-16 rounded-2xl',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative ${iconDimensions[size]} shrink-0 overflow-hidden shadow-sm border border-amber-400/30`}>
        <img
          src="/pwa-192x192.png"
          alt="Lívia Cred"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1">
          <span className={`font-extrabold text-[#0B2A4A] dark:text-white tracking-tight ${textSizes[size]}`}>
            Lívia Cred
          </span>
          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded-md">
            Saúde
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[9px] font-bold tracking-widest text-slate-400 dark:text-slate-400 uppercase mt-1">
            Soluções em Crédito
          </span>
        )}
      </div>
    </div>
  );
};
