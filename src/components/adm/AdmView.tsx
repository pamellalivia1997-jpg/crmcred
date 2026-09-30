import React, { useState, useMemo } from 'react';
import { VanguardIntegration } from '../vanguard/VanguardIntegration';
import {
  UserCheck,
  Target,
  MessageSquare,
  Users,
  Settings,
  UploadCloud,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Check,
  X,
  UserPlus,
  Edit3,
  Trash2,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Search,
  Lock,
  Mail,
  Phone,
  UserCog,
  Filter,
  Zap,
  Sparkles
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { User, MetaVendedora, Feedback, UserRole } from '../../types';
import { formatCurrency, formatPercent, formatDate, cleanPersonName } from '../../utils/formatters';

interface AdmViewProps {
  initialSubTab?: 'usuarios' | 'metas' | 'feedbacks' | 'importador' | 'vanguard';
}

export const AdmView: React.FC<AdmViewProps> = ({ initialSubTab = 'vanguard' }) => {
  const { metas, feedbacks, propostas, saveMeta, saveFeedback, importFullSpreadsheetRows } = useCRM();
  const { allUsers, currentUser, saveUser, approveUser, deleteUser } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'usuarios' | 'metas' | 'feedbacks' | 'importador' | 'vanguard'>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Metas form state
  const [selectedVendedoraId, setSelectedVendedoraId] = useState(allUsers.find(u => u.role === 'vendedora')?.id || '');
  const [metaVendaStr, setMetaVendaStr] = useState('85000');
  const [metaTaxaStr, setMetaTaxaStr] = useState('11.0');
  const [metaSalvaSucesso, setMetaSalvaSucesso] = useState(false);

  // Feedback form state
  const [fbVendedoraId, setFbVendedoraId] = useState(allUsers.find(u => u.role === 'vendedora')?.id || '');
  const [fbTipo, setFbTipo] = useState<'elogio' | 'melhoria' | 'advertencia' | 'treinamento'>('elogio');
  const [fbTexto, setFbTexto] = useState('');
  const [fbPlanoAcao, setFbPlanoAcao] = useState('');
  const [fbSalvoSucesso, setFbSalvoSucesso] = useState(false);

  // User Management State (Cadastro e Edição de Usuários para os ADMs)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formRole, setFormRole] = useState<UserRole>('vendedora');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [formSalesGoal, setFormSalesGoal] = useState('80000');
  const [formTaxGoal, setFormTaxGoal] = useState('11.0');
  const [formSalaryCost, setFormSalaryCost] = useState('2200');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [userRoleFilter, setUserRoleFilter] = useState<'todos' | UserRole>('todos');
  const [selectedLinkUser, setSelectedLinkUser] = useState<Record<string, string>>({});
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSuccessMessage, setUserSuccessMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Spreadsheet importer state
  const [rawSpreadsheetText, setRawSpreadsheetText] = useState('');
  const [isSimulatingImport, setIsSimulatingImport] = useState(false);
  const [importReport, setImportReport] = useState<any>(null);
  const [fullImportResult, setFullImportResult] = useState<{
    totalRows: number;
    clientsCreated: number;
    clientsUpdated: number;
    proposalsCreated: number;
    commissionsCreated: number;
    cpfsCorrectedCount: number;
  } | null>(null);

  const sampleSpreadsheetText = `Carimbo de data/hora\tCPF DO CLIENTE\tNOME DO CLIENTE\tDATA DA DIGITAÇÃO\tDATA DO PAGAMENTO AO CLIENTE\tCONVÊNIO\tOPERAÇÃO\tBANCO\tPROMOTORA\tVALOR DO EMPRÉSTIMO\tVALOR DA TAXA\tCLIENTE PAGOU\tTaxa do\tVENDEDOR\tDIGITADOR\tNº DO CONTRATO\tSTATUS DO\tCOMISSÃO J2\tCOMISSÃO SEMPRE\tCOMISSÃO dg\tCOMISSÃO gft\tFATURADO
12/03/2026 18:04:11\t298.046.474-00\tMARCIA VIEIRA\t12/03/2026\t12/03/2026\tINSS\tASSESSORIA\tASSESSORIA\tASSESSORIA\t0,00\t200,00\tSIM\t\tHELLEN\tHELLEN\t0\tPAGO\t\t\t\t\t0
12/03/2026 18:00:07\t428.687.424-91\tSAMUEL HENRIQUE\t12/03/2026\t12/03/2026\tINSS\tREFIN\tC6\tJ2 PROMOTORA\t2.957,02\t\t\t\tHELLEN\tHELLEN\t977526573\tPAGO\t177,42\t\t\t\t177,42
12/03/2026 17:55:28\t428.687.424-91\tSAMUEL HENRIQUE\t12/03/2026\t12/03/2026\tINSS\tMARGEM\tDAYCOVAL\tJ2 PROMOTORA\t1.029,73\t\t\t\tHELLEN\tHELLEN\t830381469\tPAGO\t66,97\t\t\t\t66,97
12/03/2026 17:51:53\t428.687.424-91\tSAMUEL HENRIQUE\t12/03/2026\t12/03/2026\tINSS\tMARGEM\tC6\tJ2 PROMOTORA\t4.464,13\t\t\t\tHELLEN\tHELLEN\t977526682\tPAGO\t292,4\t\t\t\t292,4
12/03/2026 17:39:22\t428.687.424-91\tSAMUEL HENRIQUE\t12/03/2026\t12/03/2026\tINSS\tREFIN\tDIGIO\tJ2 PROMOTORA\t4.258,38\t3.800,00\tSIM\t\tHELLEN\tHELLEN\t403831066\tPAGO\t78,78\t\t\t\t78,78
12/03/2026 10:10:37\t966.145.254-85\tALEXANDRO FERREIRA\t12/03/2026\t11/03/2026\tCARTÃO\tCARTÃO DE CRÉDITO\tCARTÃO DE BENEFÍCIO\tSEMPRE PROMOTORA\t480,00\t\t20%\tLOJA IGARASSU\tHELLEN\t0\tPAGO\t\t\t\t\t0
12/03/2026 10:07:47\t7412-7859\tADRIANO JACINTO\t12/03/2026\t11/03/2026\tCARTÃO\tCARTÃO DE CRÉDITO\tCARTÃO DE BENEFÍCIO\tSEMPRE PROMOTORA\t120,00\t\t20%\tHELLEN\tHELLEN\t0\tPAGO\t\t\t\t\t0
12/03/2026 10:06:06\t046.228.724-63\tALDENIA MARIA\t11/03/2026\t11/03/2026\tCARTÃO\tCARTÃO DE CRÉDITO\tCARTÃO DE BENEFÍCIO\tSEMPRE PROMOTORA\t120,00\t\t20%\tLOJA IGARASSU\tHELLEN\t0\tPAGO\t\t4\t\t\t4
12/03/2026 09:59:03\t178.148.968-55\tMARINA CAETANO\t11/03/2026\t11/03/2026\tCARTÃO\tCARTÃO DE CRÉDITO\tCARTÃO DE BENEFÍCIO\tSEMPRE PROMOTORA\t480,00\t\t20%\tLOJA IGARASSU\tHELLEN\t0\tPAGO\t\t16\t\t\t16
12/03/2026 09:54:34\t931.254.147-88\tSIMONE\t10/03/2026\t10/03/2026\tCARTÃO\tCARTÃO DE CRÉDITO\tCARTÃO DE BENEFÍCIO\tSEMPRE PROMOTORA\t992,40\t\t20%\tHELLEN\tHELLEN\t0\tPAGO\t\t33,08\t\t\t33,08
11/03/2026 17:14:27\t065.584.694-80\tCASSIA ROBERTA\t11/03/2026\t11/03/2026\tCREFAZ\tCONTA DE LUZ\tCREFAZ\tJ2 PROMOTORA\t1.500,00\t\t\t\tHELLEN\tHELLEN\t1066256967\tPAGO\t180\t\t\t\t180
11/03/2026 17:12:02\t039.597.544-18\tFABIO ROBERTO\t11/03/2026\t11/03/2026\tCAIXA EC FGTS\tFGTS\tICRED\tJ2 PROMOTORA\t414,65\t144,00\tSIM\t\tHELLEN\tHELLEN\t4aac4fe6-f129-436\tPAGO\t\t\t\t\t0
08/01/2026 17:07:19\t184.854.484-72\tHILDEBRANDO\t05/01/2026\t05/01/2026\tINSS\tMARGEM\tC6\tJ2 PROMOTORA\t1.621,91\t267,00\tSIM\t\tTACIANA\tTACIANA\t975023133\tPAGO\t29,19\t\t\t\t29,19
08/01/2026 17:01:59\t069.194.254-40\tSANDOVAL PEREIRA\t05/01/2026\t05/01/2026\tCAIXA EC FGTS\tFGTS\tICRED\tJ2 PROMOTORA\t363,82\t50,00\tSIM\t\tTACIANA\tTACIANA\t48850ba9-264f-46\tPAGO\t47,3\t\t\t\t47,3`;

  const handleProcessRealSpreadsheet = (textInput?: string) => {
    const textToProcess = textInput || rawSpreadsheetText;
    if (!textToProcess.trim()) {
      alert('Por favor, cole o texto da sua planilha ou clique para carregar o modelo oficial.');
      return;
    }

    const lines = textToProcess.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedRows: any[] = [];

    lines.forEach((line) => {
      // Ignore header line
      if (/Carimbo|CPF|NOME DO CLIENTE/i.test(line) && parsedRows.length === 0) return;

      const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
      const p = line.split(delimiter).map(col => col.trim().replace(/^"|"$/g, ''));

      if (p.length >= 3) {
        parsedRows.push({
          carimboDataHora: p[0] || '',
          cpf: p[1] || '',
          nomeCliente: p[2] || 'Cliente Importado',
          dataDigitacao: p[3] || '',
          dataPagamentoCliente: p[4] || '',
          convenio: p[5] || 'INSS',
          operacao: p[6] || 'Margin',
          banco: p[7] || 'Daycoval',
          promotora: p[8] || 'J2 Promotora',
          valorEmprestimo: p[9] || 0,
          valorTaxa: p[10] || 0,
          clientePagou: p[11] || '',
          percentualTaxa: p[12] || 0,
          vendedora: p[13] || 'Hellen Vasconcelos',
          digitador: p[14] || 'Hellen Vasconcelos',
          numeroContrato: p[15] || '0',
          status: p[16] || 'PAGO',
          comissaoJ2: p[17] || 0,
          comissaoSempre: p[18] || 0,
          comissaoDG: p[19] || 0,
          comissaoGFT: p[20] || 0,
          faturado: p[21] || 0
        });
      }
    });

    if (parsedRows.length === 0) {
      alert('Nenhuma linha de contrato reconhecida. Verifique o formato do texto colado.');
      return;
    }

    const report = importFullSpreadsheetRows(parsedRows);
    setFullImportResult(report);
  };

  // Sellers
  const sellers = useMemo(() => allUsers.filter(u => u.role === 'vendedora'), [allUsers]);

  // Filtered users for ADM view
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchRole = userRoleFilter === 'todos' || u.role === userRoleFilter;
      const q = userSearchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q));
      return matchRole && matchSearch;
    });
  }, [allUsers, userRoleFilter, userSearchQuery]);

  const handleOpenNewUser = () => {
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormShowPassword(false);
    setFormRole('vendedora');
    setFormPhone('');
    setFormStatus('ativo');
    setFormSalesGoal('80000');
    setFormTaxGoal('11.0');
    setFormSalaryCost('2200');
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(user.password || '');
    setFormShowPassword(false);
    setFormRole(user.role);
    setFormPhone(user.phone || '');
    setFormStatus(user.status);
    setFormSalesGoal(user.monthlySalesGoal ? user.monthlySalesGoal.toString() : '0');
    setFormTaxGoal(user.monthlyTaxPercentGoal ? user.monthlyTaxPercentGoal.toString() : '0');
    setFormSalaryCost(user.baseSalaryCost ? user.baseSalaryCost.toString() : '0');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const targetId = editingUserId || `user-${Date.now()}`;
    let finalPassword = formPassword.trim();
    if (!finalPassword) {
      if (editingUserId) {
        const existing = allUsers.find(u => u.id === editingUserId);
        finalPassword = existing?.password || '123';
      } else {
        finalPassword = '123';
      }
    }

    const updatedUser: User = {
      id: targetId,
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      password: finalPassword,
      role: formRole,
      phone: formPhone.trim(),
      status: formStatus,
      monthlySalesGoal: parseFloat(formSalesGoal) || 0,
      monthlyTaxPercentGoal: parseFloat(formTaxGoal) || 0,
      baseSalaryCost: parseFloat(formSalaryCost) || 0,
    };

    saveUser(updatedUser);

    // Also sync or create monthly goal if seller
    if (formRole === 'vendedora') {
      saveMeta({
        id: `meta-${targetId}-2026-09`,
        vendedoraId: targetId,
        vendedoraNome: formName.trim(),
        mesAno: '2026-09',
        metaVenda: parseFloat(formSalesGoal) || 75000,
        metaPercentualTaxa: parseFloat(formTaxGoal) || 10.0,
      });
    }

    setUserSuccessMessage(
      editingUserId
        ? `Usuário "${formName.trim()}" atualizado com sucesso!`
        : `Novo usuário "${formName.trim()}" cadastrado com sucesso!`
    );
    setTimeout(() => setUserSuccessMessage(null), 4000);

    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (user: User) => {
    if (user.role === 'proprietaria') {
      alert('Não é permitido excluir o usuário principal da Lívia.');
      return;
    }
    if (currentUser?.id === user.id) {
      alert('Você não pode excluir o usuário que está atualmente logado.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o cadastro e login de "${user.name}"?`)) {
      deleteUser(user.id);
      setUserSuccessMessage(`Usuário "${user.name}" removido com sucesso.`);
      setTimeout(() => setUserSuccessMessage(null), 4000);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Handle Meta Submit
  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    const vendedora = allUsers.find(u => u.id === selectedVendedoraId);
    if (!vendedora) return;

    const novaMeta: MetaVendedora = {
      id: `meta-${selectedVendedoraId}-2026-09`,
      vendedoraId: selectedVendedoraId,
      vendedoraNome: vendedora.name,
      mesAno: '2026-09',
      metaVenda: parseFloat(metaVendaStr) || 75000,
      metaPercentualTaxa: parseFloat(metaTaxaStr) || 10.0
    };

    saveMeta(novaMeta);
    setMetaSalvaSucesso(true);
    setTimeout(() => setMetaSalvaSucesso(false), 2500);
  };

  // Handle Feedback Submit
  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    const vendedora = allUsers.find(u => u.id === fbVendedoraId);
    if (!vendedora || !fbTexto.trim()) return;

    const novoFb: Feedback = {
      id: `fb-${Date.now()}`,
      vendedoraId: fbVendedoraId,
      vendedoraNome: vendedora.name,
      autorId: currentUser?.id || 'adm',
      autorNome: currentUser?.name || 'Pamella',
      data: new Date().toISOString().split('T')[0],
      tipo: fbTipo,
      texto: fbTexto.trim(),
      planoAcao: fbPlanoAcao.trim(),
      status: 'em_andamento'
    };

    saveFeedback(novoFb);
    setFbTexto('');
    setFbPlanoAcao('');
    setFbSalvoSucesso(true);
    setTimeout(() => setFbSalvoSucesso(false), 2500);
  };

  // Simulate Spreadsheet Import (replaces Google Forms & Sheets)
  const handleSimulateImport = () => {
    setIsSimulatingImport(true);
    setImportReport(null);

    setTimeout(() => {
      setIsSimulatingImport(false);
      setImportReport({
        totalLinhas: 48,
        clientesCriados: 12,
        propostasCriadas: 48,
        duplicadosIgnorados: 3
      });
    }, 1200);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-purple-600" />
            <span>Painel da Administração & Gestão de Equipe</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Definição de metas, alinhamento de feedbacks, usuários e importação de planilhas antigas
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('vanguard')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'vanguard'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Coban Vanguard</span>
          </button>

          <button
            onClick={() => setActiveSubTab('usuarios')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'usuarios'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-600" />
            <span>Cadastro de Usuários</span>
          </button>
          <button
            onClick={() => setActiveSubTab('metas')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'metas'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-purple-600" />
            <span>Metas do Mês</span>
          </button>
          <button
            onClick={() => setActiveSubTab('feedbacks')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'feedbacks'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
            <span>Feedbacks & PDI</span>
          </button>
          <button
            onClick={() => setActiveSubTab('importador')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'importador'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
            <span>Importador Planilhas</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB: COBAN VANGUARD INTEGRATION */}
      {activeSubTab === 'vanguard' && <VanguardIntegration />}

      {/* SUB-TAB 1: METAS */}
      {activeSubTab === 'metas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Form to define goals */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Definir Metas Mensais
              </h2>
              <p className="text-xs text-slate-500">
                Competência Setembro/2026
              </p>
            </div>

            {metaSalvaSucesso && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Meta atualizada com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSaveMeta} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selecione a Atendente
                </label>
                <select
                  value={selectedVendedoraId}
                  onChange={(e) => setSelectedVendedoraId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta de Venda em R$ (Empréstimo Contratado)
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={metaVendaStr}
                  onChange={(e) => setMetaVendaStr(e.target.value)}
                  className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta de % Médio de Taxa de Assessoria (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={metaTaxaStr}
                  onChange={(e) => setMetaTaxaStr(e.target.value)}
                  className="w-full px-3 py-2 font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-sm transition-all"
              >
                Salvar Meta da Vendedora
              </button>
            </form>
          </div>

          {/* Current Metas List & Performance */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Acompanhamento de Metas • Setembro/2026
            </h2>

            <div className="space-y-3">
              {metas.map((m) => {
                const vendedorProps = propostas.filter(
                  p => p.vendedora === m.vendedoraNome && p.dataDigitacao.startsWith('2026-09') && p.status === 'Paga'
                );
                const realizadoVenda = vendedorProps.reduce((acc, p) => acc + p.valorEmprestimo, 0);
                const realizadoTaxa = vendedorProps.reduce((acc, p) => acc + p.valorTaxa, 0);
                const percentualTaxaRealizado = realizadoVenda > 0 ? (realizadoTaxa / realizadoVenda) * 100 : 0;
                const atingimento = m.metaVenda > 0 ? (realizadoVenda / m.metaVenda) * 100 : 0;

                return (
                  <div key={m.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{m.vendedoraNome}</span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatPercent(atingimento)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          atingimento >= 100 ? 'bg-emerald-500' : 'bg-teal-600'
                        }`}
                        style={{ width: `${Math.min(100, atingimento)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Realizado: <strong>{formatCurrency(realizadoVenda)}</strong> de {formatCurrency(m.metaVenda)}</span>
                      <span>Taxa: <strong className="text-amber-600">{formatPercent(percentualTaxaRealizado)}</strong> (meta {m.metaPercentualTaxa}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FEEDBACKS */}
      {activeSubTab === 'feedbacks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* New Feedback Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Registrar Feedback & PDI
              </h2>
              <p className="text-xs text-slate-500">
                Registro formal de alinhamento com plano de ação e acompanhamento
              </p>
            </div>

            {fbSalvoSucesso && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Feedback registrado com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSaveFeedback} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Atendente Avaliada
                </label>
                <select
                  value={fbVendedoraId}
                  onChange={(e) => setFbVendedoraId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Feedback
                </label>
                <select
                  value={fbTipo}
                  onChange={(e) => setFbTipo(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="elogio">Elogio & Reconhecimento</option>
                  <option value="melhoria">Ponto de Melhoria</option>
                  <option value="treinamento">Treinamento & Capacitação</option>
                  <option value="advertencia">Alinhamento / Advertência</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Texto do Feedback
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva a situação observada e os pontos conversados..."
                  value={fbTexto}
                  onChange={(e) => setFbTexto(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Plano de Ação Acordado
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ações concretas, metas de melhoria e prazos..."
                  value={fbPlanoAcao}
                  onChange={(e) => setFbPlanoAcao(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-all"
              >
                Registrar Feedback Formal
              </button>
            </form>
          </div>

          {/* Feedbacks Timeline */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Histórico de Feedbacks da Equipe ({feedbacks.length})
            </h2>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {fb.vendedoraNome}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      fb.tipo === 'elogio' ? 'bg-emerald-100 text-emerald-800' :
                      fb.tipo === 'treinamento' ? 'bg-blue-100 text-blue-800' :
                      fb.tipo === 'melhoria' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {fb.tipo.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    "{fb.texto}"
                  </p>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="font-bold text-purple-700 dark:text-purple-300 block text-[11px]">Plano de Ação:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">{fb.planoAcao}</p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Autor: {fb.autorNome}</span>
                    <span>Registrado em: {formatDate(fb.data)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: CADASTRO E GESTÃO DE USUÁRIOS PARA OS ADMS */}
      {activeSubTab === 'usuarios' && (() => {
        const pendingUsers = allUsers.filter(u => u.status === 'inativo');

        return (
          <div className="space-y-4">
            {/* Success Banner */}
            {userSuccessMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{userSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUserSuccessMessage(null)}
                  className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* PENDING USER APPROVALS BANNER */}
            {pendingUsers.length > 0 && (
              <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 space-y-3 shadow-md animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 flex items-center justify-center font-bold">
                      <UserCheck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                        <span>Aprovações Pendentes ({pendingUsers.length})</span>
                        <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-black">
                          Ação do ADM necessária
                        </span>
                      </h3>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        Estes novos usuários se cadastraram no sistema (ou via Conta Google) e aguardam autorização de acesso ou vínculo com vendedora existente.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {pendingUsers.map(pu => {
                    const activeRegisteredUsers = allUsers.filter(u => u.status === 'ativo' && u.id !== pu.id);

                    return (
                      <div key={pu.id} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-xs flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white">{pu.name}</span>
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                              Acesso Bloqueado
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{pu.email}</p>
                        </div>

                        {/* Option to Link to Existing Seller Profile (e.g. Bianca, Hellen, Taciana, Lucélia) */}
                        <div className="space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px]">
                          <label className="block font-bold text-slate-700 dark:text-slate-300">
                            Vincular a Usuário / Vendedora Existente:
                          </label>
                          <select
                            value={selectedLinkUser[pu.id] || ''}
                            onChange={(e) => setSelectedLinkUser({ ...selectedLinkUser, [pu.id]: e.target.value })}
                            className="w-full px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white focus:outline-none"
                          >
                            <option value="">-- Criar como Novo Usuário ({pu.role.toUpperCase()}) --</option>
                            {activeRegisteredUsers.map(u => (
                              <option key={u.id} value={u.id}>
                                Vincular ao cadastro: {u.name} ({u.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500">Função:</span>
                            <select
                              value={pu.role}
                              onChange={(e) => saveUser({ ...pu, role: e.target.value as UserRole })}
                              className="px-2 py-1 text-[11px] rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none"
                            >
                              <option value="vendedora">Vendedora</option>
                              <option value="digitador">Digitador(a)</option>
                              <option value="adm">ADM</option>
                              <option value="financeiro">Financeiro</option>
                              <option value="proprietaria">Gerencial</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                deleteUser(pu.id);
                                setUserSuccessMessage(`Solicitação de cadastro de "${pu.name}" recusada e removida.`);
                              }}
                              className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold transition"
                            >
                              Recusar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const targetId = selectedLinkUser[pu.id];
                                if (targetId) {
                                  const targetUser = allUsers.find(u => u.id === targetId);
                                  if (targetUser) {
                                    saveUser({
                                      ...targetUser,
                                      email: pu.email,
                                      status: 'ativo'
                                    });
                                    if (pu.id !== targetUser.id) {
                                      deleteUser(pu.id);
                                    }
                                    setUserSuccessMessage(`Conta Google (${pu.email}) VINCULADA com sucesso ao perfil existente de "${targetUser.name}"!`);
                                    return;
                                  }
                                }
                                approveUser(pu.id, pu.role);
                                setUserSuccessMessage(`Acesso do usuário "${pu.name}" APROVADO com sucesso como ${pu.role.toUpperCase()}! Ele já pode acessar o sistema.`);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold shadow-sm transition active:scale-95 flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>{selectedLinkUser[pu.id] ? 'Vincular & Aprovar' : 'Aprovar Acesso'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Total de Usuários</span>
              <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5 block">
                {allUsers.length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/40 shadow-xs">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block">Administradores (ADMs)</span>
              <span className="text-xl font-black text-purple-900 dark:text-purple-200 tabular-nums mt-0.5 block">
                {allUsers.filter(u => u.role === 'adm').length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-teal-200/60 dark:border-teal-900/40 shadow-xs">
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 block">Vendedoras</span>
              <span className="text-xl font-black text-teal-900 dark:text-teal-200 tabular-nums mt-0.5 block">
                {allUsers.filter(u => u.role === 'vendedora').length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/40 shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block">Gerencial & Financeiro</span>
              <span className="text-xl font-black text-blue-900 dark:text-blue-200 tabular-nums mt-0.5 block">
                {allUsers.filter(u => u.role === 'proprietaria' || u.role === 'financeiro').length}
              </span>
            </div>
          </div>

          {/* Main User Management Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            
            {/* Header + CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  <span>Cadastro e Gestão de Usuários</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Administradores e Gerência podem cadastrar novos acessos, editar dados, redefinir senhas e alterar permissões de toda a equipe.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenNewUser}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Cadastrar Novo Usuário</span>
              </button>
            </div>

            {/* Filter Bar & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nome, login ou telefone..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {userSearchQuery && (
                  <button
                    onClick={() => setUserSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('todos')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'todos'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Todos ({allUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('adm')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'adm'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                  }`}
                >
                  ADMs
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('vendedora')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'vendedora'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100'
                  }`}
                >
                  Vendedoras
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('financeiro')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'financeiro'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                  }`}
                >
                  Financeiro
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('proprietaria')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'proprietaria'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                  }`}
                >
                  Gerencial
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('digitador')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    userRoleFilter === 'digitador'
                      ? 'bg-cyan-700 text-white shadow-xs'
                      : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100'
                  }`}
                >
                  Digitadoras ({allUsers.filter(u => u.role === 'digitador').length})
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Colaborador / Nome</th>
                    <th className="py-2.5 px-3">Perfil / Cargo</th>
                    <th className="py-2.5 px-3">Login / E-mail</th>
                    <th className="py-2.5 px-3">Meta Individual</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        Nenhum usuário encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isCurrentUser = currentUser?.id === u.id;
                      const displayName = cleanPersonName(u.name);

                      return (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[10px] shrink-0 ${
                                u.role === 'adm'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200'
                                  : u.role === 'proprietaria'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                                  : u.role === 'financeiro'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                                  : u.role === 'digitador'
                                  ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200'
                                  : 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200'
                              }`}>
                                {displayName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="block truncate">{displayName}</span>
                                {isCurrentUser && (
                                  <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400">
                                    (Seu Usuário Atual)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide ${
                              u.role === 'adm'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : u.role === 'proprietaria'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : u.role === 'financeiro'
                                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : u.role === 'digitador'
                                ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800'
                                : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                            }`}>
                              {u.role === 'adm'
                                ? 'ADM'
                                : u.role === 'proprietaria'
                                ? 'Gerencial'
                                : u.role === 'financeiro'
                                ? 'Financeiro'
                                : u.role === 'digitador'
                                ? 'Digitador(a)'
                                : 'Vendedora'}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                            {u.email}
                          </td>

                          <td className="py-3 px-3 tabular-nums font-semibold">
                            {u.monthlySalesGoal > 0 ? (
                              <div>
                                <span>{formatCurrency(u.monthlySalesGoal)}</span>
                                {u.monthlyTaxPercentGoal > 0 && (
                                  <span className="text-[10px] text-slate-400 block font-normal">
                                    Taxa: {u.monthlyTaxPercentGoal}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'ativo'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditUser(u)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-teal-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors flex items-center gap-1 font-semibold"
                                title="Editar Cadastro e Permissões"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-[11px]">Editar</span>
                              </button>
                              
                              {u.role !== 'proprietaria' && !isCurrentUser && (
                                confirmDeleteId === u.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteUser(u.id);
                                        setUserSuccessMessage(`Usuário "${u.name}" removido com sucesso.`);
                                        setTimeout(() => setUserSuccessMessage(null), 4000);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase shadow-xs transition active:scale-95 whitespace-nowrap shrink-0"
                                    >
                                      Excluir?
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-700 text-[10px] font-bold whitespace-nowrap shrink-0"
                                    >
                                      Não
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(u.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                    title="Excluir Usuário"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal: Cadastrar ou Editar Usuário */}
          {isUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 my-8">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600">
                      {editingUserId ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        {editingUserId ? 'Editar Usuário & Acesso' : 'Cadastrar Novo Usuário'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {editingUserId
                          ? 'Altere os dados cadastrais, cargo, login ou redefina a senha'
                          : 'Preencha os dados e credenciais para liberar o acesso ao sistema'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Amanda Silva Vasconcelos"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Perfil de Acesso / Cargo *
                      </label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="adm">ADM (Administrador - Gestão e Usuários)</option>
                        <option value="vendedora">Vendedora (Operacional - Propostas)</option>
                        <option value="digitador">Digitador(a) (Simulações e Portabilidade Autorizada)</option>
                        <option value="financeiro">Financeiro (Controladoria e Comissões)</option>
                        <option value="proprietaria">Gerencial (Diretoria / Geral)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Status do Usuário *
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as 'ativo' | 'inativo')}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="ativo">Ativo (Acesso Liberado)</option>
                        <option value="inativo">Inativo (Acesso Bloqueado)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Login ou E-mail de Acesso *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: amanda@liviacred.com"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Senha de Acesso {editingUserId && <span className="font-normal text-slate-400 text-[10px]">(opcional)</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={formShowPassword ? 'text' : 'password'}
                          placeholder={editingUserId ? 'Manter senha atual' : 'Digite a senha do usuário'}
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => setFormShowPassword(!formShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {formShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: (81) 98765-4321"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Operational and Goals Section (for Sellers and Team) */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Metas & Parâmetros Individuais
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Meta de Venda (R$)
                        </label>
                        <input
                          type="number"
                          placeholder="80000"
                          value={formSalesGoal}
                          onChange={(e) => setFormSalesGoal(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Meta de Taxa (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="11.0"
                          value={formTaxGoal}
                          onChange={(e) => setFormTaxGoal(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Custo Base (R$)
                        </label>
                        <input
                          type="number"
                          placeholder="2200"
                          value={formSalaryCost}
                          onChange={(e) => setFormSalaryCost(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsUserModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold shadow-md transition-all active:scale-95"
                    >
                      {editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    })()}

      {/* SUB-TAB 4: IMPORTADOR INTELIGENTE DE PLANILHAS (EXCEL, FORMULÁRIOS & FIREBASE) */}
      {activeSubTab === 'importador' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-teal-600" />
                <span>Importador Oficial de Planilhas & Firebase Cloud</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Suporta múltiplas operações por cliente, correção automática de digitação no CPF, comissões de promotoras e sincronização direta no Firebase.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cloud Firestore Ativo</span>
              </span>
            </div>
          </div>

          {/* Quick Actions & Instructions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                  <span>Cole as Linhas Copiadas do Excel / Planilha Google</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setRawSpreadsheetText(sampleSpreadsheetText);
                    handleProcessRealSpreadsheet(sampleSpreadsheetText);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-800 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800 shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Carregar Modelo Real da Imagem (14 Contratos)</span>
                </button>
              </div>

              <textarea
                rows={10}
                value={rawSpreadsheetText}
                onChange={(e) => setRawSpreadsheetText(e.target.value)}
                placeholder="Cole aqui o conteúdo copiado da sua planilha (com colunas de Carimbo, CPF, Nome, Data, Operação, Banco, Promotora, Vendedor, Digitador, Contrato, Comissões)..."
                className="w-full p-3.5 font-mono text-xs rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed shadow-xs"
              />

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-500">
                  O sistema identifica colunas separadas por Tabulação (Excel), Ponto e Vírgula ou Vírgula.
                </p>

                <button
                  type="button"
                  onClick={() => handleProcessRealSpreadsheet()}
                  className="px-6 py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Processar & Enviar para o Firebase</span>
                </button>
              </div>
            </div>

            {/* Features Info Box */}
            <div className="lg:col-span-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-teal-600" />
                <span>Tratamento da Importação</span>
              </h3>

              <div className="space-y-2 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-slate-900 dark:text-white mb-0.5">1. Correção e Padronização de CPF</p>
                  <p className="text-slate-500">CPFs incompletos ou sem zeros à esquerda (ex: <code>7412-7859</code>) são automaticamente corrigidos para o padrão de 11 dígitos com pontuação.</p>
                </div>

                <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-slate-900 dark:text-white mb-0.5">2. Múltiplas Operações por Cliente</p>
                  <p className="text-slate-500">O mesmo cliente pode aparecer em várias linhas com datas, vendedoras, digitadoras e promotoras diferentes. Cada linha vira uma proposta individual ligada ao cliente.</p>
                </div>

                <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-slate-900 dark:text-white mb-0.5">3. Tolerância a Comissões Ausentes</p>
                  <p className="text-slate-500">Linhas sem comissões informadas são importadas sem erros, registrando a operação e mantendo o histórico de vendas.</p>
                </div>

                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                  <p className="font-bold mb-0.5">4. Banco na Nuvem Firebase</p>
                  <p className="text-emerald-800 dark:text-emerald-300">Todos os clientes, propostas e comissões importados são imediatamente salvos no Cloud Firestore em tempo real.</p>
                </div>
              </div>
            </div>
          </div>

          {/* REAL IMPORT RESULT REPORT */}
          {fullImportResult && (
            <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-4 text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Importação Concluída & Sincronizada no Firebase Firestore!</span>
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                  100% Salvo no Cloud
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-slate-500 block font-bold">Total de Linhas</span>
                  <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">{fullImportResult.totalRows}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-teal-700 dark:text-teal-300 block font-bold">Novos Clientes</span>
                  <span className="text-base font-black text-teal-800 dark:text-teal-200 tabular-nums">{fullImportResult.clientsCreated}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 block font-bold">Propostas/Operações</span>
                  <span className="text-base font-black text-blue-800 dark:text-blue-200 tabular-nums">{fullImportResult.proposalsCreated}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 block font-bold">Comissões Gravadas</span>
                  <span className="text-base font-black text-purple-800 dark:text-purple-200 tabular-nums">{fullImportResult.commissionsCreated}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 block font-bold">CPFs Padronizados</span>
                  <span className="text-base font-black text-amber-800 dark:text-amber-200 tabular-nums">{fullImportResult.cpfsCorrectedCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-bold">Nuvem Firebase</span>
                  <span className="text-base font-black text-emerald-800 dark:text-emerald-200">Ativo ✓</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
