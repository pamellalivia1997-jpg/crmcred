import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { executeControladoriaSyncWithBackup } from '../../services/controladoriaSyncService';

/**
 * DiagnosticTool / SystemHealthIndicator
 * Discreet internal system status diagnostic tool with restricted access for geovanne.arcelino@gmail.com.
 */
export const SystemHealthIndicator: React.FC = () => {
  const { currentUser } = useAuth();
  const { propostas, comissoesPromotoras, saveComissaoPromotoraBatch, refreshSheetExpenses } = useCRM();
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticStatus, setDiagnosticStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastResultMessage, setLastResultMessage] = useState<string | null>(null);

  // Strict email check obfuscated with Base64 ('geovanne.arcelino@gmail.com')
  const allowedUserEmail = atob('Z2VvdmFubmUuYXJjZWxpbm9AZ21haWwuY29t');
  if (!currentUser?.email || currentUser.email.toLowerCase().trim() !== allowedUserEmail) {
    return null;
  }

  const handleRunDiagnostic = async () => {
    if (isRunningDiagnostic) return;
    setIsRunningDiagnostic(true);
    setDiagnosticStatus('idle');
    setLastResultMessage(null);

    try {
      // 1. Refresh sheet expenses
      await refreshSheetExpenses();

      // 2. Perform safe sync with backup
      const result = await executeControladoriaSyncWithBackup(
        propostas,
        comissoesPromotoras,
        saveComissaoPromotoraBatch
      );

      setLastResultMessage(result.mensagem);
      setDiagnosticStatus('success');
      alert(result.mensagem);
      setTimeout(() => {
        setDiagnosticStatus('idle');
        setLastResultMessage(null);
      }, 8000);
    } catch (err: any) {
      console.error('System health diagnostic encountered an error:', err);
      const errMsg = `Erro na sincronização: ${err?.message || 'Falha de conexão com a planilha'}. Nenhum dado foi alterado.`;
      setLastResultMessage(errMsg);
      setDiagnosticStatus('error');
      alert(errMsg);
      setTimeout(() => {
        setDiagnosticStatus('idle');
        setLastResultMessage(null);
      }, 8000);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleRunDiagnostic}
        disabled={isRunningDiagnostic}
        title={lastResultMessage || "Sincronizador Oculto da Controladoria (Apenas para geovanne.arcelino@gmail.com)"}
        className="inline-flex items-center justify-center w-3 h-3 rounded-full transition-all focus:outline-none opacity-50 hover:opacity-100 cursor-pointer"
        style={{
          backgroundColor:
            diagnosticStatus === 'success'
              ? '#10B981'
              : diagnosticStatus === 'error'
              ? '#EF4444'
              : isRunningDiagnostic
              ? '#F59E0B'
              : '#6B7280'
        }}
      />
    </div>
  );
};
