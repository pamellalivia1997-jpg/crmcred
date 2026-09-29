import React, { useState, useEffect } from 'react';
import { X, Search, Check, AlertCircle, Calculator, Keyboard, FileSpreadsheet, UserCheck, Sparkles } from 'lucide-react';
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
  calculateAge
} from '../../utils/formatters';
import { estimarComissaoPromotora, estimarComissaoVendedoraProposta } from '../../utils/commissionRules';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedCliente?: Cliente | null;
}

export const NovaPropostaModal: React.FC<Props> = ({ isOpen, onClose, preselectedCliente }) => {
  const { clientes, saveCliente, saveProposta } = useCRM();
  const { currentUser, allUsers } = useAuth();
  const isDigitadorUser = currentUser?.role === 'digitador';

  // Cadastramento Tab: 'digitadora' (aba de simulação rápida) ou 'vendedora' (proposta completa)
  const [activeCadastramentoTab, setActiveCadastramentoTab] = useState<'digitadora' | 'vendedora'>(
    isDigitadorUser ? 'digitadora' : 'digitadora'
  );

  // Quem digitou a proposta (as vendedoras podem digitar também, mas temos a Ana dedicada)
  const [digitador, setDigitador] = useState<string>(() => {
    if (isDigitadorUser) return currentUser?.name || 'Ana Paula';
    return 'Ana Paula';
  });

  // Vendedora Responsável pela proposta
  const [vendedoraResponsavel, setVendedoraResponsavel] = useState<string>(() => {
    if (currentUser?.role === 'vendedora') return currentUser.name;
    return 'Hellen Vasconcelos';
  });

  // Step 1: Cliente CPF & Search
  const [cpf, setCpf] = useState(preselectedCliente?.cpf || '');
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(preselectedCliente || null);

  // Cliente basic fields (Ana só vê os dados básicos: nome e CPF/telefone)
  const [nomeCliente, setNomeCliente] = useState(preselectedCliente?.nome || '');
  const [telefone, setTelefone] = useState(preselectedCliente?.telefone || '');
  const [cidade, setCidade] = useState(preselectedCliente?.cidade || 'Igarassu');
  const [dataNascimento, setDataNascimento] = useState(preselectedCliente?.dataNascimento || '1970-01-01');
  const [convenio, setConvenio] = useState<Convenio>(preselectedCliente?.convenioPrincipal || 'INSS');

  // Proposal fields
  const [operacao, setOperacao] = useState<Operacao>('Portabilidade');
  const [banco, setBanco] = useState<Banco>('Banco Pan');
  const [promotora, setPromotora] = useState<Promotora>('J2 Promotora');
  const [valorEmprestimoStr, setValorEmprestimoStr] = useState('10000');
  const [valorTaxaStr, setValorTaxaStr] = useState('1200');
  const [numeroContrato, setNumeroContrato] = useState(() => Math.floor(480000 + Math.random() * 50000).toString());
  const [status, setStatus] = useState<StatusProposta>('Em análise');
  const [observacoes, setObservacoes] = useState('');
  const [taxaPaga, setTaxaPaga] = useState(false);
  const [clientePagouTaxa, setClientePagouTaxa] = useState(false);

  // Error & Info messages
  const [errorMsg, setErrorMsg] = useState('');

  // When modal opens or preselected cliente changes
  useEffect(() => {
    if (preselectedCliente) {
      setCpf(preselectedCliente.cpf);
      setClienteEncontrado(preselectedCliente);
      setNomeCliente(preselectedCliente.nome);
      setTelefone(preselectedCliente.telefone);
      setCidade(preselectedCliente.cidade);
      setDataNascimento(preselectedCliente.dataNascimento);
      setConvenio(preselectedCliente.convenioPrincipal);
      if (preselectedCliente.vendedoraResponsavel) {
        setVendedoraResponsavel(preselectedCliente.vendedoraResponsavel);
      }
    }
  }, [preselectedCliente]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (isDigitadorUser) {
        setActiveCadastramentoTab('digitadora');
        setDigitador(currentUser?.name || 'Ana Paula');
      }
    }
  }, [isOpen, isDigitadorUser, currentUser]);

  // Handle CPF search
  const handleCpfChange = (val: string) => {
    const masked = maskCPFInput(val);
    setCpf(masked);
    const clean = cleanDigits(masked);

    if (clean.length === 11) {
      const found = clientes.find(c => cleanDigits(c.cpf) === clean);
      if (found) {
        // Encontrou cliente: preenche dados básicos (nome, telefone)
        // NOTA DE SEGURANÇA: Ana que é a digitadora não vê as propostas antigas nem financeiro, apenas os dados básicos nome e CPF!
        setClienteEncontrado(found);
        setNomeCliente(found.nome);
        setTelefone(found.telefone || '');
        setCidade(found.cidade || 'Igarassu');
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
  const percentualTaxa = valorEmprestimo > 0 ? Number(((valorTaxa / valorEmprestimo) * 100).toFixed(1)) : 0;

  // Estimated commissions preview
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

    if (!nomeCliente.trim()) {
      setErrorMsg('Nome do cliente é obrigatório.');
      return;
    }

    const isDigitadoraMode = activeCadastramentoTab === 'digitadora';

    // In full vendedora mode, loan amount is required to be positive
    if (!isDigitadoraMode && valorEmprestimo <= 0) {
      setErrorMsg('Valor do empréstimo (venda) deve ser maior que zero.');
      return;
    }

    // 1. Salvar ou atualizar cliente na base de dados (NÃO DUPLICAR SE JÁ EXISTE!)
    const existingClient = clientes.find(c => cleanDigits(c.cpf) === cleanCpf);

    let clienteObj: Cliente;
    if (existingClient) {
      // Cliente já existe na base: atualiza sem duplicar
      clienteObj = {
        ...existingClient,
        nome: nomeCliente.trim() || existingClient.nome,
        telefone: telefone || existingClient.telefone,
        convenioPrincipal: convenio || existingClient.convenioPrincipal
      };
    } else {
      // Novo cliente inserido no cadastro
      clienteObj = {
        id: cleanCpf,
        cpf: cleanCpf,
        nome: nomeCliente.trim(),
        telefone: telefone || '(81) 98000-0000',
        email: `${nomeCliente.trim().toLowerCase().split(' ')[0]}@cliente.com`,
        cidade: cidade || 'Igarassu',
        dataNascimento: dataNascimento || '1975-01-01',
        convenioPrincipal: convenio,
        observacoes: isDigitadoraMode
          ? 'Cadastrado via aba de digitação rápida / simulação.'
          : 'Cadastrado via lançamento de nova proposta de venda.',
        vendedoraResponsavel: existingClient?.vendedoraResponsavel || vendedoraResponsavel || 'Hellen Vasconcelos',
        dataCriacao: new Date().toISOString().split('T')[0]
      };
    }

    saveCliente(clienteObj);

    // 2. Registrar a proposta ou simulação
    const nowIso = new Date().toISOString();
    const dataDig = nowIso.split('T')[0];
    const dataHoraFormatada = nowIso.replace('T', ' ').slice(0, 19);

    // Se estiver na aba da digitadora, marca isSimulacao: true e entra no dashboard
    const isSimulacaoFinal = isDigitadoraMode;
    const finalValorEmprestimo = valorEmprestimo > 0 ? valorEmprestimo : 0;
    const finalDigitador = digitador || (isDigitadorUser ? currentUser?.name : 'Ana Paula') || 'Ana Paula';

    const novaProposta: Proposta = {
      id: `prop-${Date.now()}`,
      carimboDataHora: dataHoraFormatada,
      cpf: cleanCpf,
      nomeCliente: clienteObj.nome,
      dataDigitacao: dataDig,
      dataPagamentoCliente: (!isDigitadoraMode && status === 'Paga') ? dataDig : undefined,
      convenio,
      operacao,
      banco,
      promotora: isDigitadoraMode ? 'J2 Promotora' : promotora,
      valorEmprestimo: finalValorEmprestimo,
      valorTaxa: isDigitadoraMode ? 0 : valorTaxa,
      percentualTaxa: isDigitadoraMode ? 0 : percentualTaxa,
      taxaPaga: isDigitadoraMode ? false : (taxaPaga || status === 'Paga'),
      clientePagouTaxa: isDigitadoraMode ? false : (clientePagouTaxa || status === 'Paga'),
      vendedora: clienteObj.vendedoraResponsavel || vendedoraResponsavel || 'Hellen Vasconcelos',
      digitador: finalDigitador,
      numeroContrato: numeroContrato || Math.floor(480000 + Math.random() * 50000).toString(),
      status: isDigitadoraMode ? 'Em análise' : status,
      isSimulacao: isSimulacaoFinal,
      observacoes: observacoes || (isDigitadoraMode ? `Simulação rápida cadastrada por ${finalDigitador}.` : ''),
      historicoStatus: [
        {
          status: isDigitadoraMode ? 'Em análise' : status,
          data: `${dataDig} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          usuario: currentUser?.name || finalDigitador
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
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-teal-600" />
              <span>Cadastramento de Proposta & Simulação</span>
            </h2>
            <p className="text-xs text-slate-500">
              Esteira unificada de crédito · Cadastro rápido de cliente e propostas digitadas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cadastramento Mode Tabs: Aba de Digitadora vs Aba de Vendedora */}
        <div className="px-4 sm:px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveCadastramentoTab('digitadora')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeCadastramentoTab === 'digitadora'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Aba da Digitadora (Simulação Rápida)</span>
            </button>

            {!isDigitadorUser && (
              <button
                type="button"
                onClick={() => setActiveCadastramentoTab('vendedora')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeCadastramentoTab === 'vendedora'
                    ? 'bg-[#0F5C63] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Aba da Vendedora (Proposta Completa)</span>
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Informative notice for Aba da Digitadora */}
          {activeCadastramentoTab === 'digitadora' ? (
            <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-900 dark:text-cyan-200 flex items-start gap-2.5">
              <Calculator className="w-4 h-4 shrink-0 text-cyan-600 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">
                  Modo Digitação Rápida / Simulação:
                </p>
                <p className="text-[11px] text-cyan-800 dark:text-cyan-300 leading-relaxed">
                  Preencha apenas o <strong>Nome</strong> e <strong>CPF</strong> para cadastrar e finalizar. O cliente é registrado na base de dados <strong>sem duplicidade</strong>, contabilizando imediatamente no dash como <strong>Simulação Realizada</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">
                  Modo Vendedora (Proposta Completa):
                </p>
                <p className="text-[11px] text-teal-800 dark:text-teal-300 leading-relaxed">
                  Lançamento integral com valores de venda, comissão da promotora, cálculo de taxa de assessoria e acompanhamento de status.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 0: Seleção de quem digitou (Digitadora vs Vendedora) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-cyan-600" />
                <span>Colaborador(a) que está digitando a proposta:</span>
              </label>
              <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-semibold bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">
                Ana Paula é a digitadora dedicada
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Digitador(a) da Proposta *
                </label>
                <select
                  value={digitador}
                  onChange={(e) => setDigitador(e.target.value)}
                  disabled={isDigitadorUser}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-80"
                >
                  <option value="Ana Paula">Ana Paula (Digitadora Dedicada)</option>
                  <option value="Hellen Vasconcelos">Hellen Vasconcelos (Vendedora)</option>
                  <option value="Taciana Silva">Taciana Silva (Vendedora)</option>
                  <option value="Lucélia Ramos">Lucélia Ramos (Vendedora)</option>
                  <option value="Loja Igarassu (Balcão)">Loja Igarassu (Balcão)</option>
                  <option value="Pamella">Pamella (ADM)</option>
                  <option value="Lívia">Lívia (Gerencial)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  As vendedoras podem digitar também, mas temos uma digitadora dedicada (Ana Paula) para a esteira.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Vendedora Titular da Carteira
                </label>
                <select
                  value={vendedoraResponsavel}
                  onChange={(e) => setVendedoraResponsavel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Hellen Vasconcelos">Hellen Vasconcelos</option>
                  <option value="Taciana Silva">Taciana Silva</option>
                  <option value="Lucélia Ramos">Lucélia Ramos</option>
                  <option value="Loja Igarassu (Balcão)">Loja Igarassu (Balcão)</option>
                  <option value="Pamella">Pamella</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Responsável pelo atendimento e fechamento da comissão.
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: CPF & Client Data */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Dados Básicos do Cliente
              </span>
              {clienteEncontrado && (
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Cliente já cadastrado na base (sem duplicar)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CPF do Cliente *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo *
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

              {activeCadastramentoTab === 'vendedora' && (
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
              )}
            </div>
          </div>

          {/* Section 2: Proposal Operation & Bank */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {activeCadastramentoTab === 'digitadora' ? '2. Parâmetros da Simulação' : '2. Dados da Operação Consignada'}
            </span>

            <div className={`grid grid-cols-1 ${activeCadastramentoTab === 'digitadora' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Convênio
                </label>
                <select
                  value={convenio}
                  onChange={(e) => setConvenio(e.target.value as Convenio)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="INSS">INSS</option>
                  <option value="SIAPE">SIAPE</option>
                  <option value="Prefeitura de Igarassu">Prefeitura de Igarassu</option>
                  <option value="Prefeitura do Recife">Prefeitura do Recife</option>
                  <option value="Governo de PE">Governo de PE</option>
                  <option value="FGTS">FGTS</option>
                  <option value="Forças Armadas">Forças Armadas</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Operação
                </label>
                <select
                  value={operacao}
                  onChange={(e) => setOperacao(e.target.value as Operacao)}
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
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Banco Parceiro
                </label>
                <select
                  value={banco}
                  onChange={(e) => setBanco(e.target.value as Banco)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Banco Pan">Banco Pan</option>
                  <option value="C6 Consig">C6 Consig</option>
                  <option value="Santander">Santander</option>
                  <option value="Itaú Consig">Itaú Consig</option>
                  <option value="Daycoval">Daycoval</option>
                  <option value="Facta">Facta</option>
                  <option value="Master">Master</option>
                  <option value="BMG">BMG</option>
                  <option value="Mercantil">Mercantil</option>
                  <option value="Safra">Safra</option>
                  <option value="Bradesco">Bradesco</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {activeCadastramentoTab === 'digitadora' ? 'Valor da Simulação (R$)' : 'Valor do Empréstimo (Venda) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="10000.00"
                    value={valorEmprestimoStr}
                    onChange={(e) => setValorEmprestimoStr(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {activeCadastramentoTab === 'vendedora' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Promotora *
                    </label>
                    <select
                      value={promotora}
                      onChange={(e) => setPromotora(e.target.value as Promotora)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="J2 Promotora">J2 Promotora</option>
                      <option value="Sempre">Sempre</option>
                      <option value="DG">DG</option>
                      <option value="GFT">GFT</option>
                      <option value="Direto Banco">Direto Banco</option>
                      <option value="Outra">Outra</option>
                    </select>
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
                      <option value="Em análise">Em análise</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Aprovada">Aprovada</option>
                      <option value="Paga">Paga</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 3: Financials & Tax calculations (Only for vendedora mode, hidden in digitadora mode) */}
          {activeCadastramentoTab === 'vendedora' && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Valores & Cálculo Automático de Taxa
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Valor da Taxa da Assessoria
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={valorTaxaStr}
                      onChange={(e) => setValorTaxaStr(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    % de Taxa Calculada
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold tabular-nums">
                    {percentualTaxa}% da venda
                  </div>
                </div>
              </div>

              {/* Live commission estimates preview */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Comissão Promotora Estimada:</span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                    {formatCurrency(comissaoPromotoraEst)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Sua Comissão Estimada:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(comissaoVendedoraEst)}
                  </span>
                </div>
              </div>
            </div>
          )}

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
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {activeCadastramentoTab === 'digitadora'
                  ? 'Finalizar Digitação & Salvar Simulação'
                  : 'Salvar Proposta de Venda'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
