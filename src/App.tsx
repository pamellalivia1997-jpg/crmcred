import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { NovaPropostaModal } from './components/propostas/NovaPropostaModal';
import { LoginScreen } from './components/auth/LoginScreen';

// Screens
import { ProprietariaDashboard } from './components/dashboard/ProprietariaDashboard';
import { VendedoraHome } from './components/vendedora/VendedoraHome';
import { DigitadorHome } from './components/digitador/DigitadorHome';
import { PropostasView } from './components/propostas/PropostasView';
import { ClientesView } from './components/clientes/ClientesView';
import { AlertasView } from './components/alertas/AlertasView';
import { RelatoriosSemanalMensal } from './components/relatorios/RelatoriosSemanalMensal';
import { AdmView } from './components/adm/AdmView';
import { UsuariosView } from './components/adm/UsuariosView';
import { FinanceiroView } from './components/financeiro/FinanceiroView';
import { ComissoesPagarView } from './components/financeiro/ComissoesPagarView';
import { AuditoriaView } from './components/auditoria/AuditoriaView';
import { Cliente, AlertaOportunidade } from './types';

const MainApp: React.FC = () => {
  const { currentUser } = useAuth();

  // Navigation state
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (currentUser?.role === 'vendedora') return 'vendedora_home';
    if (currentUser?.role === 'digitador') return 'digitador_home';
    return 'dashboard';
  });
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isNovaPropostaOpen, setIsNovaPropostaOpen] = useState(false);
  const [preselectedCliente, setPreselectedCliente] = useState<Cliente | null>(null);

  // If user changes and current tab is not accessible, adjust default
  React.useEffect(() => {
    if (currentUser?.role === 'vendedora') {
      const forbiddenForVendedora = ['dashboard', 'financeiro', 'contas_pagar', 'adm', 'adm_usuarios', 'relatorios', 'fechamento_vendedoras', 'auditoria', 'digitador_home', 'comissoes_pagar'];
      if (forbiddenForVendedora.includes(currentTab)) {
        setCurrentTab('vendedora_home');
      }
    } else if (currentUser?.role === 'digitador') {
      const allowedForDigitador = ['digitador_home', 'propostas', 'alertas'];
      if (!allowedForDigitador.includes(currentTab)) {
        setCurrentTab('digitador_home');
      }
    } else if (currentUser && (currentTab === 'vendedora_home' || currentTab === 'digitador_home')) {
      setCurrentTab('dashboard');
    }
  }, [currentUser, currentTab]);

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={() => {}} />;
  }

  const handleNovaPropostaParaCliente = (cliente: Cliente) => {
    setPreselectedCliente(cliente);
    setIsNovaPropostaOpen(true);
  };

  const handleConverterAlerta = (alerta: AlertaOportunidade) => {
    setPreselectedCliente({
      id: alerta.clienteCpf,
      cpf: alerta.clienteCpf,
      nome: alerta.clienteNome,
      telefone: alerta.clienteTelefone,
      email: '',
      cidade: 'Igarassu',
      dataNascimento: '',
      convenioPrincipal: 'INSS',
      observacoes: `Convertido a partir de oportunidade de ${alerta.tipo}: ${alerta.motivo}`,
      vendedoraResponsavel: alerta.vendedoraResponsavel,
      dataCriacao: new Date().toISOString().split('T')[0]
    });
    setIsNovaPropostaOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Navigation Bar */}
      <Header
        onToggleSidebar={() => setIsSidebarOpenMobile(true)}
        onOpenAlerts={() => setCurrentTab('alertas')}
        onNavigate={(tab) => setCurrentTab(tab)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Collapsible / Responsive Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          isOpenMobile={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
          onOpenNovaProposta={() => {
            setPreselectedCliente(null);
            setIsNovaPropostaOpen(true);
          }}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-3 sm:p-6 min-w-0 overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <ProprietariaDashboard
              onNavigateToPropostas={() => setCurrentTab('propostas')}
              onNavigateToClientes={() => setCurrentTab('clientes')}
              onNavigateToAlertas={() => setCurrentTab('alertas')}
            />
          )}

          {currentTab === 'vendedora_home' && (
            <VendedoraHome
              onOpenNovaProposta={() => {
                setPreselectedCliente(null);
                setIsNovaPropostaOpen(true);
              }}
              onNavigateToClientes={() => setCurrentTab('clientes')}
              onNavigateToAlertas={() => setCurrentTab('alertas')}
              onNavigateToPropostas={() => setCurrentTab('propostas')}
            />
          )}

          {currentTab === 'digitador_home' && (
            <DigitadorHome
              onOpenNovaProposta={(cliente) => {
                setPreselectedCliente(cliente || null);
                setIsNovaPropostaOpen(true);
              }}
              onNavigateToPropostas={() => setCurrentTab('propostas')}
              onNavigateToAlertas={() => setCurrentTab('alertas')}
            />
          )}

          {currentTab === 'propostas' && <PropostasView />}

          {currentTab === 'clientes' && (
            <ClientesView
              onNovaPropostaParaCliente={handleNovaPropostaParaCliente}
            />
          )}

          {currentTab === 'alertas' && (
            <AlertasView
              onConverterEmProposta={handleConverterAlerta}
            />
          )}

          {currentTab === 'relatorios' && <RelatoriosSemanalMensal />}

          {currentTab === 'adm' && <AdmView initialSubTab="metas" />}
          {currentTab === 'adm_usuarios' && <UsuariosView />}

          {(currentTab === 'financeiro' || currentTab === 'contas_pagar' || currentTab === 'fechamento_vendedoras') && (
            <FinanceiroView />
          )}

          {currentTab === 'comissoes_pagar' && <ComissoesPagarView />}

          {currentTab === 'auditoria' && <AuditoriaView />}
        </main>
      </div>

      {/* Mobile-First Bottom Nav (Optimized for one-thumb reach) */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenMore={() => setIsSidebarOpenMobile(true)}
      />

      {/* Universal New Proposal Modal */}
      <NovaPropostaModal
        isOpen={isNovaPropostaOpen}
        onClose={() => {
          setIsNovaPropostaOpen(false);
          setPreselectedCliente(null);
        }}
        preselectedCliente={preselectedCliente}
      />

      {/* Connectivity & Offline Banner */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CRMProvider>
        <MainApp />
      </CRMProvider>
    </AuthProvider>
  );
}
