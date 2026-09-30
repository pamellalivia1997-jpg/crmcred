import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Monitor } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface Props {
  className?: string;
  variant?: 'primary' | 'subtle' | 'compact';
}

export const PWAInstallButton: React.FC<Props> = ({ className = '', variant = 'subtle' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGeneralGuide, setShowGeneralGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (isInstallable) {
      const success = await install();
      if (success) {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 3000);
      }
      return;
    }

    // Se o navegador ainda não disparou o evento nativo (ou exige acionamento via menu), exibe instruções amigáveis
    setShowGeneralGuide(true);
  };

  if (justInstalled) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
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
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
          variant === 'primary'
            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs'
            : variant === 'compact'
            ? 'p-1.5 text-teal-800 hover:bg-teal-50 border border-teal-600/30'
            : 'bg-teal-600/10 hover:bg-teal-600/20 text-teal-800 border border-teal-600/30'
        } ${className}`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden xs:inline sm:inline">Instalar App</span>
        <span className="xs:hidden sm:hidden">Instalar</span>
      </button>

      {/* Guia para iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                  LC
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Instalar no iPhone / iPad</h3>
                  <p className="text-[11px] text-slate-500">Lívia Cred Saúde CRM</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-[11px]">
                  1
                </span>
                <p>
                  No navegador Safari, toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima na barra inferior).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-[11px]">
                  2
                </span>
                <p>
                  Role as opções para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-[11px]">
                  3
                </span>
                <p>
                  Toque em <strong>Adicionar</strong> no canto superior direito. O app abrirá em tela cheia como um aplicativo oficial.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Guia para Android / Chrome / Computador quando não disparou prompt automático */}
      {showGeneralGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                  LC
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Como Instalar o Aplicativo</h3>
                  <p className="text-[11px] text-slate-500">Lívia Cred Saúde CRM</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGeneralGuide(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                  <span>No Celular (Android / Chrome):</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito do Chrome e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Monitor className="w-3.5 h-3.5 text-blue-600" />
                  <span>No Computador (Chrome / Edge):</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Clique no ícone de instalação <strong>(+)</strong> ou computador no canto direito da barra de endereços (URL).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGeneralGuide(false)}
              className="mt-5 w-full rounded-xl bg-teal-600 py-2.5 text-xs font-semibold text-white hover:bg-teal-700 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
