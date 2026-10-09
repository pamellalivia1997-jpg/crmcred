import React, { useState, useEffect, useRef } from 'react';
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
  Paperclip,
  Upload,
  FileCheck,
  CheckCheck,
  Plus,
  AlertTriangle
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Cliente, Proposta, Operacao, Banco, Promotora, Convenio, StatusProposta } from '../../types';
import {
  cleanDigits,
  formatCPF,
  maskCPFInput,
  maskPhoneInput,
  formatCurrency,
  validateCPF,
  calculateAge,
  getLocalDateString,
  cleanPersonName
} from '../../utils/formatters';
import { estimarComissaoPromotora, estimarComissaoVendedoraProposta } from '../../utils/commissionRules';
import { CPFValidationBadge } from '../common/CPFValidationBadge';
import {
  compressFileForDrive,
  CompressedFileResult,
  GOOGLE_DRIVE_DESTINATION_EMAIL,
  formatBytes
} from '../../utils/fileCompressor';
import {
  getOptionsForCategory,
  addCustomOption,
  OptionCategory
} from '../../utils/customOptions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedCliente?: Cliente | null;
}

export const NovaPropostaModal: React.FC<Props> = ({ isOpen, onClose, preselectedCliente }) => {
  const { clientes, saveCliente, saveProposta } = useCRM();
  const { currentUser, allUsers } = useAuth();
  const isDigitadorUser = currentUser?.role === 'digitador';
  const isAdm = currentUser?.role === 'adm' || currentUser?.role === 'proprietaria';
  const isManager = Boolean(
    currentUser && (
      currentUser.role === 'proprietaria' ||
      currentUser.role === 'adm' ||
      currentUser.role === 'financeiro' ||
      (currentUser.role as string) === 'gerente' ||
      Boolean((currentUser as any)?.canManageTeam)
    )
  );

  // Dynamic options lists
  const [operacoesList, setOperacoesList] = useState<string[]>(() => getOptionsForCategory('operacao'));
  const [bancosList, setBancosList] = useState<string[]>(() => getOptionsForCategory('banco'));
  const [conveniosList, setConveniosList] = useState<string[]>(() => getOptionsForCategory('convenio'));
  const [promotorasList, setPromotorasList] = useState<string[]>(() => getOptionsForCategory('promotora'));

  // Custom new item creation inputs (for Manager/ADM/Financeiro)
  const [novoOperacaoNome, setNovoOperacaoNome] = useState('');
  const [novoBancoNome, setNovoBancoNome] = useState('');
  const [novoConvenioNome, setNovoConvenioNome] = useState('');
  const [novoPromotoraNome, setNovoPromotoraNome] = useState('');
  const [customItemSuccess, setCustomItemSuccess] = useState<string | null>(null);

  // File compression and Google Drive attachment state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressingFile, setIsCompressingFile] = useState(false);
  const [compressedFile, setCompressedFile] = useState<CompressedFileResult | null>(null);

  const handleSaveNovoItem = (category: OptionCategory, name: string) => {
    if (!name.trim()) return;
    const updated = addCustomOption(category, name.trim());
    if (category === 'operacao') {
      setOperacoesList(updated);
      setOperacao(name.trim() as Operacao);
      setNovoOperacaoNome('');
    } else if (category === 'banco') {
      setBancosList(updated);
      setBanco(name.trim() as Banco);
      setNovoBancoNome('');
    } else if (category === 'convenio') {
      setConveniosList(updated);
      setConvenio(name.trim() as Convenio);
      setNovoConvenioNome('');
    } else if (category === 'promotora') {
      setPromotorasList(updated);
      setPromotora(name.trim() as Promotora);
      setNovoPromotoraNome('');
    }
    setCustomItemSuccess(`Novo item "${name.trim()}" salvo com sucesso no sistema!`);
    setTimeout(() => setCustomItemSuccess(null), 4000);
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingFile(true);
      const res = await compressFileForDrive(file);
      setCompressedFile(res);
      // Auto-set link do documento with Drive tag and data/search link
      const driveUrl = `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(cleanDigits(cpf) || 'documento')}+${GOOGLE_DRIVE_DESTINATION_EMAIL}`;
      setLinkDocumento(driveUrl);
    } catch (err) {
      console.error('Erro ao comprimir anexo:', err);
    } finally {
      setIsCompressingFile(false);
    }
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
      setOperacoesList(getOptionsForCategory('operacao'));
      setBancosList(getOptionsForCategory('banco'));
      setConveniosList(getOptionsForCategory('convenio'));
      setPromotorasList(getOptionsForCategory('promotora'));
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

    const cleanCpf = cleanDigits(cpf);
    if (cleanCpf.length !== 11) {
      setErrorMsg('Informe um CPF válido com 11 dígitos.');
      return;
    }

    // Validação estrita de "Outro": não permite salvar com Outro selecionado sem cadastrar
    const isOutroOperacao = (operacao as string) === 'Outro' || (operacao as string) === 'Outros';
    const isOutroBanco = (banco as string) === 'Outro' || (banco as string) === 'Outros';
    const isOutroConvenio = (convenio as string) === 'Outro' || (convenio as string) === 'Outros';
    const isOutroPromotora = (promotora as string) === 'Outro' || (promotora as string) === 'Outros' || (promotora as string) === 'Outra';

    if (isOutroOperacao || isOutroBanco || isOutroConvenio || isOutroPromotora) {
      if (isManager) {
        setErrorMsg('Por favor, informe o nome e clique em "Salvar Item" antes de finalizar o cadastro da proposta.');
      } else {
        setErrorMsg('Não é permitido finalizar o cadastro com a opção "Outro" selecionada. Solicite a inclusão do item ao gerente.');
      }
      return;
    }

    if (!nomeCliente.trim()) {
      setErrorMsg('O Nome do cliente é obrigatório para cadastrar.');
      return;
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
        convenioPrincipal: convenio || existingClient.convenioPrincipal,
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
        convenioPrincipal: convenio,
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
      convenio,
      operacao,
      banco,
      promotora: promotora || 'J2 Promotora',
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

          {customItemSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{customItemSuccess}</span>
            </div>
          )}

          {/* Section 0: Colaboradores do Atendimento */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Digitador(a) do Atendimento *
                </label>
                <select
                  value={digitador}
                  onChange={(e) => setDigitador(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Selecione o Digitador...</option>
                  {allUsers
                    .filter(u => u.status === 'ativo' && (u.role === 'digitador' || u.role === 'vendedora'))
                    .map(u => {
                      const cleanName = cleanPersonName(u.name);
                      return (
                        <option key={u.id} value={cleanName}>{cleanName}</option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Vendedora Titular da Carteira (Incluir Vendedor) *
                </label>
                <select
                  value={vendedoraResponsavel}
                  onChange={(e) => setVendedoraResponsavel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Selecione a Vendedora...</option>
                  {allUsers
                    .filter(u => u.role === 'vendedora' && u.status === 'ativo')
                    .map(u => {
                      const cleanName = cleanPersonName(u.name);
                      return (
                        <option key={u.id} value={cleanName}>{cleanName}</option>
                      );
                    })}
                  <option value="Loja Igarassu">Loja Igarassu</option>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Igarassu, Olinda, Recife..."
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Convênio Principal
                </label>
                <select
                  value={convenio}
                  onChange={(e) => setConvenio(e.target.value as Convenio)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {conveniosList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Outros">
                    {isManager ? 'Outros' : 'Outros (Solicite inclusão ao gerente)'}
                  </option>
                </select>

                {(convenio === 'Outros' || (convenio as string) === 'Outro') && isManager && (
                  <div className="mt-2 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-1.5">
                    <label className="block text-[11px] font-bold text-teal-900 dark:text-teal-200">
                      Cadastrar Novo Convênio (ADM/Gerente/Financeiro):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome do novo convênio..."
                        value={novoConvenioNome}
                        onChange={(e) => setNovoConvenioNome(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNovoItem('convenio', novoConvenioNome)}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Salvar Item</span>
                      </button>
                    </div>
                  </div>
                )}
                {(convenio === 'Outros' || (convenio as string) === 'Outro') && !isManager && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Solicite inclusão ao gerente</span>
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
                  onChange={(e) => setOperacao(e.target.value as Operacao)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                >
                  {operacoesList.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                  <option value="Outro">
                    {isManager ? 'Outro' : 'Outro (Solicite inclusão ao gerente)'}
                  </option>
                </select>

                {((operacao as string) === 'Outro' || (operacao as string) === 'Outros') && isManager && (
                  <div className="mt-2 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-1.5">
                    <label className="block text-[11px] font-bold text-teal-900 dark:text-teal-200">
                      Cadastrar Nova Operação (ADM/Gerente/Financeiro):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome da nova operação..."
                        value={novoOperacaoNome}
                        onChange={(e) => setNovoOperacaoNome(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNovoItem('operacao', novoOperacaoNome)}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Salvar Item</span>
                      </button>
                    </div>
                  </div>
                )}
                {((operacao as string) === 'Outro' || (operacao as string) === 'Outros') && !isManager && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Solicite inclusão ao gerente</span>
                  </div>
                )}
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
                  {bancosList.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Outro">
                    {isManager ? 'Outro' : 'Outro (Solicite inclusão ao gerente)'}
                  </option>
                </select>

                {(banco === 'Outro' || (banco as string) === 'Outros') && isManager && (
                  <div className="mt-2 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-1.5">
                    <label className="block text-[11px] font-bold text-teal-900 dark:text-teal-200">
                      Cadastrar Novo Banco (ADM/Gerente/Financeiro):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome do novo banco..."
                        value={novoBancoNome}
                        onChange={(e) => setNovoBancoNome(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNovoItem('banco', novoBancoNome)}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Salvar Item</span>
                      </button>
                    </div>
                  </div>
                )}
                {(banco === 'Outro' || (banco as string) === 'Outros') && !isManager && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Solicite inclusão ao gerente</span>
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
                  {promotorasList.map(pr => (
                    <option key={pr} value={pr}>{pr}</option>
                  ))}
                  <option value="Outra">
                    {isManager ? 'Outra' : 'Outra (Solicite inclusão ao gerente)'}
                  </option>
                </select>

                {(promotora === 'Outra' || (promotora as string) === 'Outro' || (promotora as string) === 'Outros') && isManager && (
                  <div className="mt-2 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-1.5">
                    <label className="block text-[11px] font-bold text-teal-900 dark:text-teal-200">
                      Cadastrar Nova Promotora (ADM/Gerente/Financeiro):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome da nova promotora..."
                        value={novoPromotoraNome}
                        onChange={(e) => setNovoPromotoraNome(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNovoItem('promotora', novoPromotoraNome)}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Salvar Item</span>
                      </button>
                    </div>
                  </div>
                )}
                {(promotora === 'Outra' || (promotora as string) === 'Outro' || (promotora as string) === 'Outros') && !isManager && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Solicite inclusão ao gerente</span>
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

          {/* Link do Documento & Anexo Comprimido para o Google Drive */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Link ou Anexo do Documento (Google Drive) <span className="font-normal text-slate-400 text-[10px]">(opcional)</span>
              </label>
              <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                <span>Google Drive:</span>
                <span className="font-mono">{GOOGLE_DRIVE_DESTINATION_EMAIL}</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://drive.google.com/... ou anexe abaixo"
                value={linkDocumento}
                onChange={(e) => setLinkDocumento(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileAttach}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressingFile}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition shrink-0 disabled:opacity-50 active:scale-95"
              >
                {isCompressingFile ? (
                  <>
                    <Upload className="w-3.5 h-3.5 animate-bounce" />
                    <span>Reduzindo arquivo...</span>
                  </>
                ) : (
                  <>
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Anexar Documento</span>
                  </>
                )}
              </button>
            </div>

            {/* Compressed File Optimization Badge */}
            {compressedFile && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold truncate">{compressedFile.fileName}</p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      Otimizado para o Drive: {compressedFile.originalSizeFormatted} ➔ <strong>{compressedFile.compressedSizeFormatted}</strong>
                      {compressedFile.reductionPercentage > 0 && ` (${compressedFile.reductionPercentage}% de espaço poupado)`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCompressedFile(null);
                    setLinkDocumento('');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline shrink-0 px-1 py-0.5"
                >
                  Remover
                </button>
              </div>
            )}

            <p className="text-[10px] text-slate-400">
              ⚡ <strong>Redução de tamanho obrigatória:</strong> A compactação automática redimensiona e comprime imagens e fotos para poupar espaço no Google Drive vinculado (<span className="font-mono text-slate-500">{GOOGLE_DRIVE_DESTINATION_EMAIL}</span>).
            </p>
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

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
              {((operacao as string) === 'Outro' || (operacao as string) === 'Outros' ||
                (banco as string) === 'Outro' || (banco as string) === 'Outros' ||
                (convenio as string) === 'Outro' || (convenio as string) === 'Outros' ||
                (promotora as string) === 'Outra' || (promotora as string) === 'Outro' || (promotora as string) === 'Outros') && (
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {isManager
                      ? 'Salve o item criado acima antes de finalizar'
                      : 'Solicite inclusão ao gerente para finalizar'}
                  </span>
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={Boolean(
                  (operacao as string) === 'Outro' || (operacao as string) === 'Outros' ||
                  (banco as string) === 'Outro' || (banco as string) === 'Outros' ||
                  (convenio as string) === 'Outro' || (convenio as string) === 'Outros' ||
                  (promotora as string) === 'Outra' || (promotora as string) === 'Outro' || (promotora as string) === 'Outros'
                )}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 text-white ${
                  (operacao as string) === 'Outro' || (operacao as string) === 'Outros' ||
                  (banco as string) === 'Outro' || (banco as string) === 'Outros' ||
                  (convenio as string) === 'Outro' || (convenio as string) === 'Outros' ||
                  (promotora as string) === 'Outra' || (promotora as string) === 'Outro' || (promotora as string) === 'Outros'
                    ? 'opacity-40 cursor-not-allowed bg-slate-400 dark:bg-slate-700'
                    : isDadosCompletosProposta
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
