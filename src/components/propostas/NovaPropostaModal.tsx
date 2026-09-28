import React, { useState, useEffect } from 'react';
import { X, Search, Check, AlertCircle, Calculator } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Cliente, Proposta, Operacao, Banco, Promotora, Convenio, StatusProposta } from '../../types';
import {
  cleanDigits,
  formatCPF,
  maskCPFInput,
  maskPhoneInput,
  formatCurrency,
  validateCPF
} from '../../utils/formatters';
import { estimarComissaoPromotora, estimarComissaoVendedoraProposta } from '../../utils/commissionRules';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedCliente?: Cliente | null;
}

export const NovaPropostaModal: React.FC<Props> = ({ isOpen, onClose, preselectedCliente }) => {
  const { clientes, saveCliente, saveProposta } = useCRM();
  const { currentUser } = useAuth();

  // Step 1: Cliente CPF & Search
  const [cpf, setCpf] = useState(preselectedCliente?.cpf || '');
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(preselectedCliente || null);
  const [isNovoCliente, setIsNovoCliente] = useState(false);

  // Cliente fields if new
  const [nomeCliente, setNomeCliente] = useState(preselectedCliente?.nome || '');
  const [telefone, setTelefone] = useState(preselectedCliente?.telefone || '');
  const [cidade, setCidade] = useState(preselectedCliente?.cidade || 'Igarassu');
  const [dataNascimento, setDataNascimento] = useState(preselectedCliente?.dataNascimento || '1970-01-01');
  const [convenio, setConvenio] = useState<Convenio>(preselectedCliente?.convenioPrincipal || 'INSS');

  // Proposal fields (matching existing spreadsheet)
  const [operacao, setOperacao] = useState<Operacao>('Refin');
  const [banco, setBanco] = useState<Banco>('Banco Pan');
  const [promotora, setPromotora] = useState<Promotora>('J2 Promotora');
  const [valorEmprestimoStr, setValorEmprestimoStr] = useState('10000');
  const [valorTaxaStr, setValorTaxaStr] = useState('1200');
  const [numeroContrato, setNumeroContrato] = useState(() => Math.floor(480000 + Math.random() * 50000).toString());
  const [status, setStatus] = useState<StatusProposta>('Em análise');
  const [observacoes, setObservacoes] = useState('');
  const [taxaPaga, setTaxaPaga] = useState(false);
  const [clientePagouTaxa, setClientePagouTaxa] = useState(false);

  // Error messages
  const [errorMsg, setErrorMsg] = useState('');

  // When preselected cliente changes
  useEffect(() => {
    if (preselectedCliente) {
      setCpf(preselectedCliente.cpf);
      setClienteEncontrado(preselectedCliente);
      setNomeCliente(preselectedCliente.nome);
      setTelefone(preselectedCliente.telefone);
      setCidade(preselectedCliente.cidade);
      setDataNascimento(preselectedCliente.dataNascimento);
      setConvenio(preselectedCliente.convenioPrincipal);
      setIsNovoCliente(false);
    }
  }, [preselectedCliente]);

  // Handle CPF search
  const handleCpfChange = (val: string) => {
    const masked = maskCPFInput(val);
    setCpf(masked);
    const clean = cleanDigits(masked);

    if (clean.length === 11) {
      const found = clientes.find(c => cleanDigits(c.cpf) === clean);
      if (found) {
        setClienteEncontrado(found);
        setNomeCliente(found.nome);
        setTelefone(found.telefone);
        setCidade(found.cidade);
        setDataNascimento(found.dataNascimento);
        setConvenio(found.convenioPrincipal);
        setIsNovoCliente(false);
      } else {
        setClienteEncontrado(null);
        setIsNovoCliente(true);
      }
    } else {
      setClienteEncontrado(null);
      setIsNovoCliente(false);
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

    if (valorEmprestimo <= 0) {
      setErrorMsg('Valor do empréstimo (venda) deve ser maior que zero.');
      return;
    }

    // 1. Ensure client is saved
    const clienteObj: Cliente = clienteEncontrado || {
      id: cleanCpf,
      cpf: cleanCpf,
      nome: nomeCliente.trim(),
      telefone: telefone || '(81) 98000-0000',
      email: `${nomeCliente.toLowerCase().split(' ')[0]}@cliente.com`,
      cidade: cidade || 'Igarassu',
      dataNascimento: dataNascimento || '1975-01-01',
      convenioPrincipal: convenio,
      observacoes: 'Cadastrado via lançamento de nova proposta.',
      vendedoraResponsavel: currentUser?.name || 'Vendedora',
      dataCriacao: new Date().toISOString().split('T')[0]
    };

    saveCliente(clienteObj);

    // 2. Create proposal
    const nowIso = new Date().toISOString();
    const dataDig = nowIso.split('T')[0];
    const dataHoraFormatada = nowIso.replace('T', ' ').slice(0, 19);

    const novaProposta: Proposta = {
      id: `prop-${Date.now()}`,
      carimboDataHora: dataHoraFormatada,
      cpf: cleanCpf,
      nomeCliente: clienteObj.nome,
      dataDigitacao: dataDig,
      dataPagamentoCliente: status === 'Paga' ? dataDig : undefined,
      convenio,
      operacao,
      banco,
      promotora,
      valorEmprestimo,
      valorTaxa,
      percentualTaxa,
      taxaPaga: taxaPaga || status === 'Paga',
      clientePagouTaxa: clientePagouTaxa || status === 'Paga',
      vendedora: currentUser?.name || 'Hellen Vasconcelos',
      digitador: currentUser?.name || 'Taciana Silva',
      numeroContrato,
      status,
      observacoes,
      historicoStatus: [
        {
          status,
          data: `${dataDig} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          usuario: currentUser?.name || 'Vendedora'
        }
      ]
    };

    saveProposta(novaProposta);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Nova Proposta de Crédito
            </h2>
            <p className="text-xs text-slate-500">
              Formulário padrão da esteira consignada com busca automática de cliente
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

          {/* Section 1: CPF & Client Data */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Identificação do Cliente
            </span>

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
                  {clienteEncontrado && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Cliente Já Cadastrado
                    </span>
                  )}
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
                  Telefone / WhatsApp
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
            </div>
          </div>

          {/* Section 2: Proposal Operation & Bank */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Dados da Operação Consignada
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Convênio *
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
                  Operação *
                </label>
                <select
                  value={operacao}
                  onChange={(e) => setOperacao(e.target.value as Operacao)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Refin">Refin</option>
                  <option value="Portabilidade">Portabilidade</option>
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
                  Banco Parceiro *
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
                </select>
              </div>

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
            </div>
          </div>

          {/* Section 3: Financials & Tax calculations */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Valores & Cálculo Automático de Taxa
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valor Empréstimo (Venda) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={valorEmprestimoStr}
                    onChange={(e) => setValorEmprestimoStr(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

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

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observações da Proposta
            </label>
            <textarea
              rows={2}
              placeholder="Instruções de pagamento, conta corrente, observações do cliente..."
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
              className="px-6 py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              Salvar Proposta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
