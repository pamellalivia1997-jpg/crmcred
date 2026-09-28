import React from 'react';
import brandIconImg from '../../assets/images/brand_icon_livia_1790638054463.jpg';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<Props> = ({ className = '', size = 'md', showSubtitle = true }) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative ${iconSizes[size]} shrink-0 rounded-xl overflow-hidden shadow-sm border border-amber-400/40 bg-gradient-to-br from-[#0B2A4A] to-[#0F5C63] p-0.5`}>
        <img
          src={brandIconImg}
          alt="Lívia Cred Saúde"
          className="w-full h-full object-cover rounded-[10px]"
          onError={(e) => {
            // Fallback SVG if image not available
            e.currentTarget.style.display = 'none';
          }}
        />
        <svg
          className="w-full h-full text-amber-400 p-1 hidden"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v4" />
          <path d="M10 10h4" />
        </svg>
      </div>

      <div className="flex flex-col leading-tight min-w-0">
        <span className={`${titleSizes[size]} font-extrabold tracking-tight text-slate-900 dark:text-white truncate`}>
          LÍVIA <span className="text-[#0F5C63] dark:text-[#28B0B7]">CRED</span><span className="text-[#0B2A4A] dark:text-amber-400">SAÚDE</span>
        </span>
        {showSubtitle && (
          <span className="text-[10px] font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase -mt-0.5">
            CONSIGNADO & CRÉDITO
          </span>
        )}
      </div>
    </div>
  );
};
