import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, X, CheckCircle2, Monitor, Apple, Sparkles, Share, PlusSquare, MoreVertical } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface Props {
  className?: string;
  variant?: 'primary' | 'subtle' | 'compact';
}

type DeviceTab = 'android' | 'ios' | 'pc';

export const PWAInstallButton: React.FC<Props> = ({ className = '', variant = 'subtle' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<DeviceTab>(isIOS ? 'ios' : 'android');

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
    // If not directly installable via one-click prompt, open device guide modal
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

      {/* Modern, Compact, Clean Modal */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setShowModal(false)}
          >
            <div
              className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0F5C63] text-white flex items-center justify-center font-black text-sm shadow-md">
                    LC
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        Instalar Lívia Cred
                      </h3>
                      <span className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 px-1.5 py-0.5 rounded-md font-bold">
                        App
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Acesso rápido na tela inicial sem barras do navegador
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

              {/* Direct 1-Click Install Banner if browser supports */}
              {isInstallable && (
                <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Instalação Direta</span>
                    </p>
                    <p className="text-[11px] text-teal-700 dark:text-teal-400 truncate">
                      Pronto para instalar em 1 clique
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await install();
                      if (ok) setShowModal(false);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] active:scale-95 text-white font-bold text-xs shadow-xs shrink-0 transition"
                  >
                    Instalar Agora
                  </button>
                </div>
              )}

              {/* Device Tabs */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'android'
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'ios'
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5" />
                  <span>iPhone / iPad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pc')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'pc'
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Computador</span>
                </button>
              </div>

              {/* Device Instructions Content */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                {activeTab === 'android' && (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Toque no menu <strong>três pontinhos (⋮)</strong> no canto superior do navegador Chrome.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Selecione <strong className="text-teal-700 dark:text-teal-300">"Instalar aplicativo"</strong> ou <strong className="text-teal-700 dark:text-teal-300">"Adicionar à tela inicial"</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'ios' && (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Abra no <strong>Safari</strong> e toque no botão de <strong>Compartilhar</strong> (ícone com quadrado e seta para cima).
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Role a lista para baixo e toque em <strong className="text-teal-700 dark:text-teal-300">"Adicionar à Tela de Início"</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'pc' && (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        No Chrome ou Edge, clique no ícone de <strong>Instalar (+)</strong> ao lado da barra de endereço no topo.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Confirme em <strong>"Instalar"</strong> para abrir o CRM como um programa dedicado na sua barra de tarefas.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Close CTA */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full rounded-2xl bg-[#0F5C63] hover:bg-[#1B8A8F] active:scale-98 py-2.5 text-xs font-bold text-white shadow-md transition-all text-center"
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
