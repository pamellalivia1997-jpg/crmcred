import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  AlertCircle,
  Calculator,
  UserCheck,
  FileSpreadsheet,
  Building2,
  Sparkles,
  Info,
  CheckCircle2,
  ShieldCheck,
  Upload,
  Link2,
  RefreshCw
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { uploadProposalDocument } from '../../services/driveService';
import { Cliente, Proposta, Operacao, Banco, Promotora, Convenio, StatusProposta } from '../../types';
import {
  cleanDigits,
  formatCPF,
  maskCPFInput,
  maskPhoneInput,
  formatCurrency,
  validateCPF,
  calculateAge,
  getLocalDateString
} from '../../utils/formatters';
import { estimarComissaoPromotora, estimarComissaoVendedoraProposta } from '../../utils/commissionRules';
import { CPFValidationBadge } from '../common/CPFValidationBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedCliente?: Cliente | null;
}

export const NovaPropostaModal: React.FC<Props> = ({ isOpen, onClose, preselectedCliente }) => {
  const { clientes, saveCliente, saveProposta } = useCRM();
  const { currentUser, allUsers, googleAccessToken, loginWithGoogle } = useAuth();
  const isDigitadorUser = currentUser?.role === 'digitador';
  const isAdm = currentUser?.role === 'adm' || currentUser?.role === 'proprietaria';

  const canAddCustomOptions = currentUser?.role === 'adm' || currentUser?.role === 'proprietaria' || currentUser?.role === 'financeiro';

  const defaultBancos = [
    'Banco Pan', 'C6 Consig', 'Santander', 'Itaú Consig', 'Daycoval', 
    'Facta', 'Master', 'BMG', 'Mercantil', 'Safra', 'Bradesco'
  ];
  const defaultPromotoras = ['J2 Promotora', 'Sempre', 'DG', 'GFT', 'Direto Banco'];
  const defaultConvenios = [
    'INSS', 'SIAPE', 'Prefeitura de Igarassu', 'Prefeitura do Recife', 
    'Governo de PE', 'FGTS', 'Forças Armadas'
  ];

  const [customBancos, setCustomBancos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lviacred_custom_bancos');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [customPromotoras, setCustomPromotoras] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lviacred_custom_promotoras');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [customConvenios, setCustomConvenios] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lviacred_custom_convenios');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [bancoCustomValue, setBancoCustomValue] = useState('');
  const [promotoraCustomValue, setPromotoraCustomValue] = useState('');
  const [convenioCustomValue, setConvenioCustomValue] = useState('');

  const bancoOptions = useMemo(() => [...defaultBancos, ...customBancos], [customBancos]);
  const promotoraOptions = useMemo(() => [...defaultPromotoras, ...customPromotoras], [customPromotoras]);
  const convenioOptions = useMemo(() => [...defaultConvenios, ...customConvenios], [customConvenios]);

  const handleAddCustomBanco = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || defaultBancos.includes(trimmed) || customBancos.includes(trimmed)) return;
    const newList = [...customBancos, trimmed];
    setCustomBancos(newList);
    localStorage.setItem('lviacred_custom_bancos', JSON.stringify(newList));
    setBanco(trimmed as any);
  };

  const handleAddCustomPromotora = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || defaultPromotoras.includes(trimmed) || customPromotoras.includes(trimmed)) return;
    const newList = [...customPromotoras, trimmed];
    setCustomPromotoras(newList);
    localStorage.setItem('lviacred_custom_promotoras', JSON.stringify(newList));
    setPromotora(trimmed as any);
  };

  const handleAddCustomConvenio = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || defaultConvenios.includes(trimmed) || customConvenios.includes(trimmed)) return;
    const newList = [...customConvenios, trimmed];
    setCustomConvenios(newList);
    localStorage.setItem('lviacred_custom_convenios', JSON.stringify(newList));
    setConvenio(trimmed as any);
  };

  // Quem digitou o cadastro
  const [digitador, setDigitador] = useState<string>(() => currentUser?.name || '');

  // Vendedora Responsável pela carteira
  const [vendedoraResponsavel, setVendedoraResponsavel] = useState<string>(() => {
    if (currentUser?.role === 'vendedora') return currentUser.name;
    return '';
  });

  // Dados do Cliente
  const [cpf, setCpf] = useState(preselectedCliente?.cpf || '');
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(preselectedCliente || null);
  const [nomeCliente, setNomeCliente] = useState(preselectedCliente?.nome || '');
  const [telefone, setTelefone] = useState(preselectedCliente?.telefone || '');
  const [cidade, setCidade] = useState(preselectedCliente?.cidade || 'Igarassu');
  const [dataNascimento, setDataNascimento] = useState(preselectedCliente?.dataNascimento || '1970-01-01');
  const [convenio, setConvenio] = useState<Convenio>(preselectedCliente?.convenioPrincipal || 'INSS');

  // Dados da Operação / Proposta / Simulação
  const [operacao, setOperacao] = useState<Operacao>('Portabilidade');
  const [banco, setBanco] = useState<Banco>('Banco Pan');
  const [promotora, setPromotora] = useState<Promotora>('J2 Promotora');
  const [valorEmprestimoStr, setValorEmprestimoStr] = useState('');
  const [valorTaxaStr, setValorTaxaStr] = useState('');
  const [numeroContrato, setNumeroContrato] = useState(() => Math.floor(480000 + Math.random() * 50000).toString());
  const [status, setStatus] = useState<StatusProposta>('Em análise');
  const [dataDigitacao, setDataDigitacao] = useState(() => getLocalDateString());
  const [dataPagamentoCliente, setDataPagamentoCliente] = useState('');
  const [taxaPaga, setTaxaPaga] = useState(true);
  const [observacoes, setObservacoes] = useState('');
  const [linkDocumento, setLinkDocumento] = useState('');

  // Google Drive upload states and handlers
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleConnectDrive = async () => {
    setIsUploadingDrive(true);
    setErrorMsg('');
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setErrorMsg(res.message || 'Falha ao conectar conta Google.');
      }
    } catch (err: any) {
      setErrorMsg(`Erro de conexão Google: ${err?.message || err}`);
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!googleAccessToken) {
      setErrorMsg("Por favor, conecte sua conta do Google Drive primeiro.");
      return;
    }

    setIsUploadingDrive(true);
    setUploadSuccess(false);
    setErrorMsg('');

    try {
      const tempProposalId = `prop-${Date.now()}`;
      const result = await uploadProposalDocument(
        file,
        nomeCliente || "Cliente_Sem_Nome",
        tempProposalId,
        googleAccessToken
      );
      setLinkDocumento(result.webViewLink);
      setUploadSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Falha no upload para o Google Drive: ${err?.message || 'Verifique suas permissões.'}`);
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handleOperacaoChange = (val: string) => {
    if (val === 'Outro' && !isAdm && currentUser?.role !== 'proprietaria' && currentUser?.role !== 'financeiro') {
      alert('Solicite inclusão ao gerente');
      return;
    }
    setOperacao(val as Operacao);
  };

  // Mensagens
  const [errorMsg, setErrorMsg] = useState('');
  const [sucessoNotice, setSucessoNotice] = useState<string | null>(null);

  // When modal opens or preselected cliente changes
  useEffect(() => {
    if (preselectedCliente) {
      setCpf(maskCPFInput(preselectedCliente.cpf));
      setClienteEncontrado(preselectedCliente);
      setNomeCliente(preselectedCliente.nome);
      setTelefone(preselectedCliente.telefone || '');
      setCidade(preselectedCliente.cidade || 'Igarassu');
      setDataNascimento(preselectedCliente.dataNascimento || '1970-01-01');
      setConvenio(preselectedCliente.convenioPrincipal || 'INSS');
      if (preselectedCliente.vendedoraResponsavel) {
        setVendedoraResponsavel(preselectedCliente.vendedoraResponsavel);
      }
    }
  }, [preselectedCliente]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSucessoNotice(null);
      if (isDigitadorUser) {
        setDigitador(currentUser?.name || 'Ana Paula');
      }
    }
  }, [isOpen, isDigitadorUser, currentUser]);

  // Handle CPF search with auto-fill
  const handleCpfChange = (val: string) => {
    const masked = maskCPFInput(val);
    setCpf(masked);
    const clean = cleanDigits(masked);

    if (clean.length === 11) {
      const found = clientes.find(c => cleanDigits(c.cpf) === clean);
      if (found) {
        // Encontrou cliente: preenche automaticamente todos os dados dele
        setClienteEncontrado(found);
        setNomeCliente(found.nome);
        setTelefone(found.telefone || '');
        setCidade(found.cidade || 'Igarassu');
        setDataNascimento(found.dataNascimento || '1970-01-01');
        setConvenio(found.convenioPrincipal || 'INSS');
        if (found.vendedoraResponsavel) {
          setVendedoraResponsavel(found.vendedoraResponsavel);
        }
      } else {
        setClienteEncontrado(null);
      }
    } else {
      setClienteEncontrado(null);
    }
  };

  // Live calculations
  const valorEmprestimo = parseFloat(valorEmprestimoStr) || 0;
  const valorTaxa = parseFloat(valorTaxaStr) || 0;
  const percentualTaxa = valorEmprestimo > 0 ? Number(((valorTaxa / valorEmprestimo) * 100).toFixed(2)) : 0;

  // Verificação de preenchimento completo de proposta
  const isDadosCompletosProposta = valorEmprestimo > 0 && numeroContrato.trim().length > 0;

  // Live commission estimates
  const comissaoPromotoraEst = estimarComissaoPromotora({ operacao, valorEmprestimo });
  const comissaoVendedoraEst = estimarComissaoVendedoraProposta({ operacao, valorTaxa });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Check if they are just saving custom options "com tudo em branco"
    const isOnlyCustomAdd = !cpf.trim() && !nomeCliente.trim() && (
      ((banco as any) === 'CUSTOM_NEW' && bancoCustomValue.trim()) ||
      ((promotora as any) === 'CUSTOM_NEW' && promotoraCustomValue.trim()) ||
      ((convenio as any) === 'CUSTOM_NEW' && convenioCustomValue.trim())
    );

    if (isOnlyCustomAdd) {
      if ((banco as any) === 'CUSTOM_NEW' && bancoCustomValue.trim()) {
        handleAddCustomBanco(bancoCustomValue);
      }
      if ((promotora as any) === 'CUSTOM_NEW' && promotoraCustomValue.trim()) {
        handleAddCustomPromotora(promotoraCustomValue);
      }
      if ((convenio as any) === 'CUSTOM_NEW' && convenioCustomValue.trim()) {
        handleAddCustomConvenio(convenioCustomValue);
      }
      setSucessoNotice('Novas opções registradas permanentemente na lista!');
      setTimeout(() => {
        onClose();
      }, 1500);
      return;
    }

    const cleanCpf = cleanDigits(cpf);
    if (cleanCpf.length !== 11) {
      setErrorMsg('Informe um CPF válido com 11 dígitos.');
      return;
    }

    if (!nomeCliente.trim()) {
      setErrorMsg('O Nome do cliente é obrigatório para cadastrar.');
      return;
    }

    // Process and add custom options if they are filled as part of the proposal
    let finalBanco = banco;
    if ((banco as any) === 'CUSTOM_NEW' && bancoCustomValue.trim()) {
      handleAddCustomBanco(bancoCustomValue);
      finalBanco = bancoCustomValue.trim() as any;
    }

    let finalPromotora = promotora;
    if ((promotora as any) === 'CUSTOM_NEW' && promotoraCustomValue.trim()) {
      handleAddCustomPromotora(promotoraCustomValue);
      finalPromotora = promotoraCustomValue.trim() as any;
    }

    let finalConvenio = convenio;
    if ((convenio as any) === 'CUSTOM_NEW' && convenioCustomValue.trim()) {
      handleAddCustomConvenio(convenioCustomValue);
      finalConvenio = convenioCustomValue.trim() as any;
    }

    // 1. Salvar ou atualizar cliente na base de dados (Sem duplicidade)
    const existingClient = clientes.find(c => cleanDigits(c.cpf) === cleanCpf);

    let clienteObj: Cliente;
    if (existingClient) {
      clienteObj = {
        ...existingClient,
        nome: nomeCliente.trim() || existingClient.nome,
        telefone: telefone || existingClient.telefone,
        cidade: cidade || existingClient.cidade || 'Igarassu',
        dataNascimento: dataNascimento || existingClient.dataNascimento || '1970-01-01',
        convenioPrincipal: finalConvenio || existingClient.convenioPrincipal,
        vendedoraResponsavel: existingClient.vendedoraResponsavel || vendedoraResponsavel
      };
    } else {
      clienteObj = {
        id: cleanCpf,
        cpf: cleanCpf,
        nome: nomeCliente.trim(),
        telefone: telefone || '(81) 98000-0000',
        email: `${nomeCliente.trim().toLowerCase().split(' ')[0]}@cliente.com`,
        cidade: cidade || 'Igarassu',
        dataNascimento: dataNascimento || '',
        convenioPrincipal: finalConvenio,
        observacoes: isDadosCompletosProposta
          ? 'Cadastrado com proposta formalizada.'
          : 'Cadastrado via simulação rápida.',
        vendedoraResponsavel: vendedoraResponsavel || 'Hellen Vasconcelos',
        dataCriacao: getLocalDateString()
      };
    }

    saveCliente(clienteObj);

    // 2. Determinar se é Proposta Completa ou Simulação:
    // Se o valor de empréstimo for preenchido (>0), vira Proposta oficial.
    // Se não tiver valor ou dados obrigatórios de venda, salva como Simulação com log registrado!
    const isSimulacao = !isDadosCompletosProposta;
    const nowIso = new Date().toISOString();
    const dataDig = getLocalDateString();
    const dataHoraFormatada = nowIso.replace('T', ' ').slice(0, 19);
    const finalDigitador = digitador || currentUser?.name || 'Não informado';
    const finalVendedora = vendedoraResponsavel || (currentUser?.role === 'vendedora' ? currentUser.name : 'Loja Igarassu');

    const novaProposta: Proposta = {
      id: `prop-${Date.now()}`,
      carimboDataHora: dataHoraFormatada,
      cpf: cleanCpf,
      nomeCliente: clienteObj.nome,
      dataDigitacao: dataDigitacao || dataDig,
      dataPagamentoCliente: dataPagamentoCliente || ((!isSimulacao && status === 'Paga') ? (dataDigitacao || dataDig) : undefined),
      convenio: finalConvenio,
      operacao,
      banco: finalBanco,
      promotora: finalPromotora || 'J2 Promotora',
      valorEmprestimo: isSimulacao ? (valorEmprestimo > 0 ? valorEmprestimo : 0) : valorEmprestimo,
      valorTaxa: isSimulacao ? 0 : valorTaxa,
      percentualTaxa: isSimulacao ? 0 : Number(percentualTaxa.toFixed(2)),
      taxaPaga: !isSimulacao && taxaPaga,
      clientePagouTaxa: !isSimulacao && taxaPaga,
      vendedora: finalVendedora,
      digitador: finalDigitador,
      numeroContrato: numeroContrato || Math.floor(480000 + Math.random() * 50000).toString(),
      status: isSimulacao ? 'Simuladas' : status,
      isSimulacao: isSimulacao,
      origemSimulacao: isSimulacao,
      simulacaoPor: isSimulacao ? finalDigitador : undefined,
      dataSimulacao: isSimulacao ? nowIso : undefined,
      observacoes: observacoes || (isSimulacao ? `Simulação rápida cadastrada por ${finalDigitador}.` : ''),
      linkDocumento: linkDocumento.trim(),
      historicoStatus: [
        {
          status: isSimulacao ? 'Simuladas' : status,
          data: `${dataDig} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          usuario: currentUser?.name || finalDigitador,
          motivo: isSimulacao
            ? `Simulação cadastrada inicialmente por ${finalDigitador}`
            : `Proposta de venda lançada por ${finalDigitador}`
        }
      ]
    };

    saveProposta(novaProposta);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Novo Cadastro de Proposta & Simulação</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite o CPF para carregar o cliente automaticamente ou cadastrar nova operação
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {sucessoNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{sucessoNotice}</span>
            </div>
          )}

          {/* Section 0: Colaboradores do Atendimento */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Digitador do Atendimento *
                </label>
                <select
                  value={digitador}
                  onChange={(e) => setDigitador(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Selecione o Digitador...</option>
                  {allUsers
                    .filter(u => u.role === 'digitador' || u.role === 'vendedora' || u.role === 'adm' || u.role === 'proprietaria')
                    .map(u => (
                      <option key={u.id} value={u.name}>{u.name.replace(/\s*\(.*?\)\s*/g, '')}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Vendedora Titular da Carteira *
                </label>
                <select
                  value={vendedoraResponsavel}
                  onChange={(e) => setVendedoraResponsavel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Selecione a Vendedora...</option>
                  {allUsers.filter(u => u.role === 'vendedora' || u.role === 'adm' || u.role === 'proprietaria').map(u => (
                    <option key={u.id} value={u.name}>{u.name.replace(/\s*\(.*?\)\s*/g, '')}</option>
                  ))}
                  <option value="Loja Igarassu">Loja Igarassu (Balcão)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 1: CPF & Client Data */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Dados do Cliente
              </span>
              {clienteEncontrado && (
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Cliente localizado (dados carregados automaticamente)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <span>CPF do Cliente *</span>
                  <CPFValidationBadge cpf={cpf} />
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    className="w-full px-3 py-2 pr-8 text-xs font-mono rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-auto">
                    <CPFValidationBadge cpf={cpf} size="md" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Telefone / WhatsApp <span className="font-normal text-slate-400 text-[10px]">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="(81) 98888-7777"
                  value={telefone}
                  onChange={(e) => setTelefone(maskPhoneInput(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Data de Nascimento</span>
                  {dataNascimento && calculateAge(dataNascimento) !== null && (
                    <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md">
                      {calculateAge(dataNascimento)} anos
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Note: Cidade input field is removed as requested by the user */}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Convênio Principal *
                </label>
                <select
                  value={convenio}
                  onChange={(e) => setConvenio(e.target.value as Convenio)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                >
                  {convenioOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {canAddCustomOptions && (
                    <option value="CUSTOM_NEW">Outros</option>
                  )}
                </select>

                {(convenio as any) === 'CUSTOM_NEW' && canAddCustomOptions && (
                  <div className="mt-2 flex gap-2 animate-in slide-in-from-top-1 duration-150">
                    <input
                      type="text"
                      placeholder="Digitar novo Convênio..."
                      value={convenioCustomValue}
                      onChange={(e) => setConvenioCustomValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-teal-400 text-slate-900 dark:text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleAddCustomConvenio(convenioCustomValue);
                        setConvenioCustomValue('');
                      }}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition"
                    >
                      Adicionar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Proposal / Simulation Details */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Detalhes da Operação (Proposta / Simulação)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {isDadosCompletosProposta ? '✓ Proposta Pronta' : '💡 Preencha o valor para Proposta ou finalize como Simulação'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Operação *
                </label>
                <select
                  value={operacao}
                  onChange={(e) => handleOperacaoChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Portabilidade">Portabilidade</option>
                  <option value="Refin">Refin</option>
                  <option value="Refin da Port">Refin da Port</option>
                  <option value="Margem">Margem</option>
                  <option value="FGTS">FGTS</option>
                  <option value="Saque Complementar">Saque Complementar</option>
                  <option value="Conta de Energia Elétrica/Luz">Conta de Energia Elétrica/Luz</option>
                  <option value="Cartão Novo">Cartão Novo</option>
                  <option value="Credcesta">Credcesta</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Crédito do Trabalhador">Crédito do Trabalhador</option>
                  <option value="Pessoal">Pessoal</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Banco Parceiro *
                </label>
                <select
                  value={banco}
                  onChange={(e) => setBanco(e.target.value as Banco)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                >
                  {bancoOptions.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  {canAddCustomOptions && (
                    <option value="CUSTOM_NEW">Outros</option>
                  )}
                </select>

                {(banco as any) === 'CUSTOM_NEW' && canAddCustomOptions && (
                  <div className="mt-2 flex gap-2 animate-in slide-in-from-top-1 duration-150">
                    <input
                      type="text"
                      placeholder="Digitar novo Banco..."
                      value={bancoCustomValue}
                      onChange={(e) => setBancoCustomValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-teal-400 text-slate-900 dark:text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleAddCustomBanco(bancoCustomValue);
                        setBancoCustomValue('');
                      }}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition font-bold"
                    >
                      Adicionar
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Promotora
                </label>
                <select
                  value={promotora}
                  onChange={(e) => setPromotora(e.target.value as Promotora)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                >
                  {promotoraOptions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  {canAddCustomOptions && (
                    <option value="CUSTOM_NEW">Outros</option>
                  )}
                </select>

                {(promotora as any) === 'CUSTOM_NEW' && canAddCustomOptions && (
                  <div className="mt-2 flex gap-2 animate-in slide-in-from-top-1 duration-150">
                    <input
                      type="text"
                      placeholder="Digitar nova Promotora..."
                      value={promotoraCustomValue}
                      onChange={(e) => setPromotoraCustomValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-teal-400 text-slate-900 dark:text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleAddCustomPromotora(promotoraCustomValue);
                        setPromotoraCustomValue('');
                      }}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition font-bold"
                    >
                      Adicionar
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valor da Venda / Empréstimo (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 10000.00"
                    value={valorEmprestimoStr}
                    onChange={(e) => setValorEmprestimoStr(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Taxa da Assessoria (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 1200.00"
                    value={valorTaxaStr}
                    onChange={(e) => setValorTaxaStr(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  % Taxa
                </label>
                <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold tabular-nums">
                  {percentualTaxa.toFixed(2)}%
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Taxa Paga pelo Cliente?
                </label>
                <select
                  value={taxaPaga ? 'sim' : 'nao'}
                  onChange={(e) => setTaxaPaga(e.target.value === 'sim')}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold focus:outline-none"
                >
                  <option value="sim">Sim (Taxa Paga)</option>
                  <option value="nao">Não (Pendente)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data de Digitação
                </label>
                <input
                  type="date"
                  value={dataDigitacao}
                  onChange={(e) => setDataDigitacao(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data de Pagamento ao Cliente
                </label>
                <input
                  type="date"
                  value={dataPagamentoCliente}
                  onChange={(e) => setDataPagamentoCliente(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nº do Contrato
                </label>
                <input
                  type="text"
                  placeholder="Número de contrato"
                  value={numeroContrato}
                  onChange={(e) => setNumeroContrato(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status Inicial
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusProposta)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Simuladas">Simuladas</option>
                  <option value="Em análise">Em análise</option>
                  <option value="Paga">Paga</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            {/* Estimates preview */}
            {valorEmprestimo > 0 && (
              <div className={`p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs grid ${isAdm ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-2`}>
                {isAdm && (
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Comissão Promotora Estimada (ADM):</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatCurrency(comissaoPromotoraEst)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Comissão Vendedora:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(comissaoVendedoraEst)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3 mb-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Link2 className="w-4 h-4 text-[#0F5C63]" />
                <span>Documentação da Proposta (Drive)</span>
              </label>
              {isUploadingDrive && (
                <span className="text-[11px] text-[#0F5C63] dark:text-teal-400 font-bold animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Processando...
                </span>
              )}
            </div>

            {!googleAccessToken ? (
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Google Drive Desconectado</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Conecte sua conta do Google Drive para anexar arquivos de proposta diretamente.</p>
                </div>
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  disabled={isUploadingDrive}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Conectar Google Drive
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500/50 dark:hover:border-teal-500/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-white dark:bg-slate-900 text-center">
                    <Upload className="w-6 h-6 text-slate-400 dark:text-slate-500 mb-1" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Anexar Documento</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">O sistema comprime o arquivo e salva no seu Google Drive</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      disabled={isUploadingDrive}
                      className="hidden"
                    />
                  </label>
                </div>

                {linkDocumento && (
                  <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-teal-800 dark:text-teal-400 font-bold uppercase tracking-wider">Documento Pronto & Comprimido</p>
                      <a
                        href={linkDocumento}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline block truncate mt-0.5"
                      >
                        {linkDocumento}
                      </a>
                    </div>
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 font-bold rounded-md text-[10px] shrink-0">No Drive</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observações <span className="font-normal text-slate-400 text-[10px]">(opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Instruções de pagamento, convênio, observações do cliente..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-500">
              {isDadosCompletosProposta ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Salva o cliente e cadastra como <strong>Proposta de Venda</strong>.
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Salva o cliente e registra como <strong>Simulação</strong>.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 text-white ${
                  isDadosCompletosProposta
                    ? 'bg-[#0F5C63] hover:bg-[#1B8A8F]'
                    : 'bg-cyan-700 hover:bg-cyan-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isDadosCompletosProposta ? 'Salvar Proposta de Venda' : 'Salvar como Simulação'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
