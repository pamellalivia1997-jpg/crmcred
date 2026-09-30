import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, X, CheckCircle2, Monitor, Apple, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface Props {
  className?: string;
  variant?: 'primary' | 'subtle' | 'compact';
}

export const PWAInstallButton: React.FC<Props> = ({ className = '', variant = 'subtle' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 3000);
        return;
      }
    }
    // If not directly installable via one-click or on iOS, open the modern guide modal
    setShowModal(true);
  };

  if (justInstalled) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalado com sucesso!</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="Instalar App no Celular ou Computador"
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 shadow-xs ${
          variant === 'primary'
            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
            : variant === 'compact'
            ? 'p-2 text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-800 border border-teal-600/30'
            : 'bg-teal-600/10 hover:bg-teal-600/20 text-teal-900 dark:text-teal-200 border border-teal-600/30'
        } ${className}`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden xs:inline sm:inline">Instalar App</span>
        <span className="xs:hidden sm:hidden">Instalar</span>
      </button>

      {/* Modern Centered Install Modal rendered via Portal directly to body */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
            <div
              className="w-full max-w-md my-auto rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0B2A4A] to-[#0F5C63] text-white flex items-center justify-center font-black text-sm shadow-md shadow-teal-900/20">
                    LC
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                      Instalar Lívia Cred CRM
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Acesso rápido, seguro e em tela cheia
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Direct Install Button if supported */}
              {isInstallable && (
                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-teal-950 dark:text-teal-200">
                      Instalação Rápida Detectada
                    </p>
                    <p className="text-[11px] text-teal-700 dark:text-teal-400">
                      Seu navegador suporta instalação com 1 clique.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await install();
                      if (ok) {
                        setShowModal(false);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] active:scale-95 text-white font-bold text-xs shadow-xs shrink-0 transition"
                  >
                    Instalar Agora
                  </button>
                </div>
              )}

              {/* Instructions Cards */}
              <div className="space-y-2.5 text-xs">
                {/* Android / Chrome */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                    <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>No Celular (Android / Chrome)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                    Toque no menu <strong>(⋮)</strong> no canto superior direito do Chrome e escolha <strong className="text-teal-700 dark:text-teal-300">"Instalar aplicativo"</strong> ou <strong className="text-teal-700 dark:text-teal-300">"Adicionar à tela inicial"</strong>.
                  </p>
                </div>

                {/* iPhone / iPad (Safari) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                    <Apple className="w-4 h-4 text-slate-900 dark:text-white" />
                    <span>No iPhone / iPad (Safari)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                    Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima na barra inferior) e depois em <strong className="text-teal-700 dark:text-teal-300">"Adicionar à Tela de Início"</strong>.
                  </p>
                </div>

                {/* Computador */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                    <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>No Computador (Chrome / Edge)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                    Clique no ícone de instalação <strong>(+)</strong> ou computador na barra de endereços (URL) no topo do navegador.
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full rounded-2xl bg-[#0F5C63] hover:bg-[#1B8A8F] active:scale-98 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-900/10 transition-all text-center"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
