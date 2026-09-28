import React from 'react';
import { ShieldCheck, Lock, FileText, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LGPDModal: React.FC = () => {
  const { acceptedLGPD, acceptLGPD, currentUser } = useAuth();

  if (acceptedLGPD) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-300">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300 shrink-0">
            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Governança de Dados & LGPD
            </h2>
            <p className="text-xs text-slate-500">
              Lívia Cred Saúde • Política de Sigilo Bancário & Auditoria
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-72 overflow-y-auto pr-1">
          <p>
            Bem-vindo(a) ao <strong>Lívia Cred Saúde CRM</strong>. Em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong> e as normas de sigilo bancário do Banco Central do Brasil, informamos:
          </p>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Trilha de Auditoria Ativa:</strong> Todas as consultas de CPF, visualizações de extratos, propostas e alterações cadastrais são registradas com data, hora e identificação do usuário.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Finalidade Exclusiva:</strong> Os dados de aposentados, pensionistas e servidores só podem ser utilizados para simulações e formalizações autorizadas pelo cliente.
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Ao continuar, você ({currentUser?.name || 'Usuário'}) declara ter ciência de que o compartilhamento indevido de senhas ou dados sensíveis de clientes é passível de responsabilização legal e administrativa.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={acceptLGPD}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Li e Concordo com os Termos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
