import React from 'react';
import { validateCPF, cleanDigits } from '../../utils/formatters';

interface Props {
  cpf: string | undefined | null;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Indicador discreto de CPF inválido.
 * Exibe um círculo vermelho com ponto de exclamação (!) e tooltip "CPF inválido".
 * Não bloqueia ações ou formulários.
 */
export const CPFValidationBadge: React.FC<Props> = ({ cpf, className = '', size = 'sm' }) => {
  const digits = cleanDigits(cpf);

  // Se estiver vazio, não exibe o alerta
  if (!digits || digits.length === 0) {
    return null;
  }

  // Verifica se o CPF é válido segundo o algoritmo oficial da Receita Federal
  const isValid = validateCPF(cpf || '');

  // Se o CPF for válido, não exibe nenhum aviso
  if (isValid) {
    return null;
  }

  const dimensionClasses = size === 'md' ? 'w-4 h-4 text-[10px]' : 'w-3.5 h-3.5 text-[9px]';

  return (
    <span
      className={`relative group inline-flex items-center justify-center align-middle ${className}`}
    >
      <span
        title="CPF inválido"
        aria-label="CPF inválido"
        className={`${dimensionClasses} inline-flex items-center justify-center rounded-full bg-rose-500 text-white font-black leading-none cursor-help shadow-xs select-none hover:scale-110 active:scale-95 transition-transform`}
      >
        !
      </span>

      {/* Tooltip discreto no hover */}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold text-white bg-slate-900/95 rounded-md shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
        CPF inválido
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
      </span>
    </span>
  );
};
