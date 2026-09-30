import React from 'react';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<Props> = ({ className = '', size = 'md', showSubtitle = true }) => {
  const iconSizes = {
    sm: 'h-8 w-auto',
    md: 'h-10 w-auto',
    lg: 'h-16 w-auto',
    xl: 'h-24 w-auto',
  };

  return (
    <div className={`flex items-center select-none ${className}`}>
      <div className={`relative ${iconSizes[size]} shrink-0`}>
        <img
          src="/logo.png"
          alt="Lívia Cred Saúde"
          className="h-full w-auto object-contain"
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );
};
