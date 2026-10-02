
import { crmStorage } from '../../services/crmStorage';
import { useAuth } from '../../context/AuthContext';

export const BackupButton: React.FC = () => {
  const { currentUser } = useAuth();
  
  if (currentUser?.email !== 'geovanne.arcelino@gmail.com') return null;

  const downloadBackup = () => {
    const data = crmStorage.getStore();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_crm_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button 
      onClick={downloadBackup}
      className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold"
    >
      Baixar Backup dos Dados
    </button>
  );
};
