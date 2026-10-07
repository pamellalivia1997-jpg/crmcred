import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  MessageCircle,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  X,
  CreditCard,
  MapPin,
  Calendar,
  Shield,
  FileText,
  Edit3,
  Cake,
  UserPlus,
  UploadCloud,
  Trash2,
  RotateCcw,
  Check,
  Sparkles,
  Database
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { openMessagingApp } from '../../utils/messaging';
import { Cliente, Proposta, Convenio } from '../../types';
import {
  formatCPF,
  formatPhone,
  formatCurrency,
  formatDate,
  formatBirthDateWithAge,
  calculateAge,
  maskCPFInput,
  maskPhoneInput,
  cleanDigits,
  getLocalDateString
} from '../../utils/formatters';
import { CPFValidationBadge } from '../common/CPFValidationBadge';

interface Props {
  onNovaPropostaParaCliente?: (cliente: Cliente) => void;
}

export const ClientesView: React.FC<Props> = ({ onNovaPropostaParaCliente }) => {
  const {
    clientes,
    propostas,
    comissoesPromotoras,
    logCpfAccess,
    saveCliente,
    importClientPortfolio
  } = useCRM();
  const { currentUser, isManager } = useAuth();
  const isAdm = currentUser?.role === 'adm' || currentUser?.role === 'proprietaria' || currentUser?.role === 'financeiro';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [filterConvenio, setFilterConvenio] = useState<string>('todos');

  // Modal State for New / Edit Client
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Cliente> | null>(null);
  const [modalError, setModalError] = useState('');

  // Digitador cannot access general client portfolio
  if (currentUser?.role === 'digitador') {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto my-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            Carteira de Clientes Restrita
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            O perfil de <strong>Digitador(a)</strong> não possui acesso à carteira geral de clientes da empresa. Você pode cadastrar novas simulações rápidas e acompanhar as propostas que digitou no seu painel.
          </p>
        </div>
      </div>
    );
  }

  // Filter clients
  const filteredClientes = useMemo(() => {
    const term = searchTerm.toLowerCase().replace(/\D/g, '');
    const termText = searchTerm.toLowerCase().trim();

    return clientes.filter(c => {
      const matchCpf = c.cpf.replace(/\D/g, '').includes(term);
      const matchName = c.nome.toLowerCase().includes(termText);
      const matchPhone = c.telefone.replace(/\D/g, '').includes(term);
      const matchConvenio = filterConvenio === 'todos' || c.convenioPrincipal === filterConvenio;

      return (matchCpf || matchName || matchPhone) && matchConvenio;
    });
  }, [clientes, searchTerm, filterConvenio]);

  // Proposals for selected client
  const clientPropostas = useMemo(() => {
    if (!selectedCliente) return [];
    const cleanCpf = selectedCliente.cpf.replace(/\D/g, '');
    return propostas
      .filter(p => p.cpf.replace(/\D/g, '') === cleanCpf)
      .sort((a, b) => new Date(b.dataDigitacao).getTime() - new Date(a.dataDigitacao).getTime());
  }, [selectedCliente, propostas]);

  // Client stats
  const totalContratado = useMemo(() => {
    return clientPropostas
      .filter(p => p.status === 'Paga')
      .reduce((acc, p) => acc + p.valorEmprestimo, 0);
  }, [clientPropostas]);

  // Select client handler (triggers LGPD audit log!)
  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    logCpfAccess(cliente.cpf, cliente.nome);
  };

  // Open WhatsApp / DigiSac link
  const openWhatsApp = (cliente: Cliente) => {
    const msg = `Olá ${cliente.nome.split(' ')[0]}, tudo bem? Aqui é ${currentUser?.name} da Lívia Cred Saúde. Temos ótimas condições de crédito e portabilidade consignada disponíveis para seu convênio. Gostaria de uma simulação sem compromisso?`;
    openMessagingApp(cliente.telefone, msg);
  };

  // Helper tags
  const getClienteBadges = (cliente: Cliente, clientProps: Proposta[]) => {
    const badges: { label: string; color: string }[] = [];
    const paidProps = clientProps.filter(p => p.status === 'Paga');

    if (paidProps.length >= 2) {
      badges.push({ label: 'Cliente Recorrente', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200' });
    }

    // Check portability readiness (any Margem/Refin paid > 12 months ago)
    const hasOldLoan = paidProps.some(p => {
      const pYear = new Date(p.dataDigitacao).getFullYear();
      return pYear <= 2025;
    });
    if (hasOldLoan) {
      badges.push({ label: 'Elegível Portabilidade', color: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300' });
    }

    if (cliente.statusCartao === 'disponivel') {
      badges.push({ label: 'Margem Cartão Livre', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200' });
    }

    return badges;
  };

  const renderBirthDateInfo = (dataNascimento?: string) => {
    const isInvalid = !dataNascimento || dataNascimento === '1975-01-01' || dataNascimento === '01/01/1975' || dataNascimento.trim() === '';
    if (isInvalid) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Nascimento: Sem Informação cadastrada</span>
        </span>
      );
    }
    return (
      <span>Nascimento {formatDate(dataNascimento)}</span>
    );
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Top Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-[#0F5C63]" />
              <span>Clientes & Prontuário Digital</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Busca global integrada por CPF, Nome ou Telefone com histórico unificado
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditingClient({
                  nome: '',
                  cpf: '',
                  dataNascimento: '',
                  telefone: '',
                  cidade: 'Igarassu',
                  convenioPrincipal: 'INSS',
                  vendedoraResponsavel: currentUser?.name || 'Hellen Vasconcelos',
                  observacoes: ''
                });
                setModalError('');
                setIsClientModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Novo Cliente</span>
            </button>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 w-fit">
              {filteredClientes.length} Clientes Cadastrados
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Digite o CPF (apenas números ou formatado), Nome do cliente ou Telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Convenio Filter */}
          <select
            value={filterConvenio}
            onChange={(e) => setFilterConvenio(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="todos">Todos os Convênios</option>
            <option value="INSS">INSS</option>
            <option value="SIAPE">SIAPE</option>
            <option value="Prefeitura de Igarassu">Prefeitura de Igarassu</option>
            <option value="Governo de PE">Governo de PE</option>
            <option value="FGTS">FGTS</option>
          </select>
        </div>
      </div>

      {/* Main Content Layout: Directory List + Client Timeline Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Clients Directory List */}
        <div className={`${selectedCliente ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-2`}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="space-y-2 max-h-[72vh] overflow-y-auto pr-1">
              {filteredClientes.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum cliente encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">Verifique o CPF digitado ou limpe os filtros.</p>
                </div>
              ) : (
                filteredClientes.map((c) => {
                  const isSelected = selectedCliente?.cpf === c.cpf;
                  const cProps = propostas.filter(p => p.cpf.replace(/\D/g, '') === c.cpf.replace(/\D/g, ''));
                  const badges = getClienteBadges(c, cProps);

                  return (
                    <div
                      key={c.cpf}
                      onClick={() => handleSelectCliente(c)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 shadow-sm'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {c.nome}
                          </p>
                          <p className="text-[11px] text-slate-500 tabular-nums flex items-center flex-wrap gap-1">
                            <span>CPF: {formatCPF(c.cpf)}</span>
                            <CPFValidationBadge cpf={c.cpf} />
                          </p>
                          <p className="text-[11px] text-slate-500 tabular-nums">
                            {renderBirthDateInfo(c.dataNascimento)}
                          </p>
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            · {c.convenioPrincipal}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {c.cidade} · Tel: {formatPhone(c.telefone)}
                          </p>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                          {cProps.length} op.
                        </span>
                      </div>

                      {/* Badges */}
                      {badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {badges.map((b, idx) => (
                            <span key={idx} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${b.color}`}>
                              {b.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Selected Client Detailed Timeline & Actions */}
        {selectedCliente && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            {/* Client Top Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    {selectedCliente.nome}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {selectedCliente.convenioPrincipal}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <span>CPF: <strong>{formatCPF(selectedCliente.cpf)}</strong></span>
                    <CPFValidationBadge cpf={selectedCliente.cpf} />
                  </span>
                  <span className="inline-flex items-center gap-1">{renderBirthDateInfo(selectedCliente.dataNascimento)}</span>
                  <span>{selectedCliente.cidade}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCliente(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => openWhatsApp(selectedCliente)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  setEditingClient({
                    ...selectedCliente,
                    observacoes: (selectedCliente.observacoes && selectedCliente.observacoes.toLowerCase().includes('cliente importado via planilha')) ? '' : (selectedCliente.observacoes || '')
                  });
                  setModalError('');
                  setIsClientModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all"
              >
                <Edit3 className="w-4 h-4 text-teal-600" />
                <span>Editar Dados</span>
              </button>

              <button
                onClick={() => onNovaPropostaParaCliente && onNovaPropostaParaCliente(selectedCliente)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all sm:col-span-2"
              >
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>Nova Proposta</span>
              </button>
            </div>

            {/* Client Financial History Overview */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Contratado</p>
                <p className="text-sm font-extrabold text-[#0B2A4A] dark:text-white tabular-nums mt-0.5">
                  {formatCurrency(totalContratado)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Nº de Propostas</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5">
                  {clientPropostas.length}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Última Operação</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5">
                  {clientPropostas[0] ? formatDate(clientPropostas[0].dataDigitacao) : '-'}
                </p>
              </div>
            </div>

            {/* Client Notes (Exibe apenas anotações reais de atendimento, omitindo texto padrão de importação) */}
            {selectedCliente.observacoes && 
             selectedCliente.observacoes.trim() !== '' && 
             !selectedCliente.observacoes.toLowerCase().includes('cliente importado via planilha') && (
              <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs">
                <span className="font-bold text-amber-800 dark:text-amber-300">Observações de Atendimento:</span>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">{selectedCliente.observacoes}</p>
              </div>
            )}

            {/* Visual Timeline of Proposals */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Linha do Tempo de Propostas ({clientPropostas.length})</span>
              </h3>

              {clientPropostas.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Nenhuma proposta cadastrada para este CPF ainda.</p>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {clientPropostas.map((prop) => (
                    <div key={prop.id} className="relative flex items-start gap-3 pl-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                        prop.status === 'Paga' ? 'bg-emerald-500 text-white' :
                        prop.status === 'Cancelada' ? 'bg-rose-500 text-white' :
                        'bg-slate-400 text-slate-800'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-1 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {prop.operacao} · {prop.banco}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            prop.status === 'Paga' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            prop.status === 'Cancelada' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {prop.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400">Valor Empréstimo:</span>
                            <p className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                              {formatCurrency(prop.valorEmprestimo)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400">Taxa Cobrada:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                {formatCurrency(prop.valorTaxa)} ({Number(prop.percentualTaxa || 0).toFixed(2)}%)
                              </span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                (prop.taxaPaga === true || prop.clientePagouTaxa === true)
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                Taxa: {(prop.taxaPaga === true || prop.clientePagouTaxa === true) ? 'Paga (Sim)' : 'Pendente (Não)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Comissão Promotora / Repasse (Visibilidade Restrita: ADM, Proprietária, Financeiro) */}
                        {isAdm && (() => {
                          const comItem = comissoesPromotoras.find(
                            c => c.propostaId === prop.id || (prop.numeroContrato && c.numeroContrato && c.numeroContrato.trim().toLowerCase() === prop.numeroContrato.trim().toLowerCase())
                          );
                          const repValue = (prop.valorRepasse && prop.valorRepasse > 0) ? prop.valorRepasse : (comItem ? comItem.valorRecebido : 0);
                          const repProm = prop.promotoraRepasse || comItem?.promotora || prop.promotora;
                          return (
                            <div className="mt-2 p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block">
                                  Repasse Promotora:
                                </span>
                                {repValue > 0 ? (
                                  <span className="font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                    {formatCurrency(repValue)} ({repProm})
                                  </span>
                                ) : (
                                  <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
                                    Repasse pendente
                                  </span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                repValue > 0
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                              }`}>
                                {repValue > 0 ? 'CONCILIADO' : 'SEM REPASSE'}
                              </span>
                            </div>
                          );
                        })()}

                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>Digitado em: <strong className="text-slate-700 dark:text-slate-300">{formatDate(prop.dataDigitacao)}</strong></span>
                            {prop.dataPagamentoCliente && (
                              <span className="text-teal-600 dark:text-teal-400 font-bold">
                                • Pago ao Cliente: {formatDate(prop.dataPagamentoCliente)}
                              </span>
                            )}
                          </div>
                          <span>Vendedora: <strong>{prop.vendedora}</strong></span>
                          {prop.linkDocumento && (
                            <a
                              href={prop.linkDocumento}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-bold transition-all shrink-0"
                            >
                              <FileSpreadsheet className="w-3 h-3 text-teal-600" />
                              <span>Contrato (Drive)</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LGPD Audit Footer Indicator */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-500" />
                Acesso registrado para auditoria LGPD
              </span>
              <span>Visualizado por: {currentUser?.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* New / Edit Client Modal */}
      {isClientModalOpen && editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-teal-600" />
                  <span>{editingClient.cpf ? 'Editar Dados do Cliente' : 'Novo Cadastro de Cliente'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Preencha data de nascimento para notificações de aniversário e acompanhamento
                </p>
              </div>
              <button
                onClick={() => {
                  setIsClientModalOpen(false);
                  setEditingClient(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setModalError('');

                const cleanCpf = cleanDigits(editingClient.cpf || '');
                if (cleanCpf.length !== 11) {
                  setModalError('Informe um CPF válido com 11 dígitos.');
                  return;
                }

                if (!editingClient.nome?.trim()) {
                  setModalError('Nome do cliente é obrigatório.');
                  return;
                }

                const clientToSave: Cliente = {
                  id: cleanCpf,
                  cpf: cleanCpf,
                  nome: editingClient.nome.trim(),
                  dataNascimento: editingClient.dataNascimento || '1975-01-01',
                  telefone: editingClient.telefone || '(81) 98000-0000',
                  email: editingClient.email || `${editingClient.nome.trim().toLowerCase().split(' ')[0]}@cliente.com`,
                  cidade: editingClient.cidade || 'Igarassu',
                  convenioPrincipal: (editingClient.convenioPrincipal as Convenio) || 'INSS',
                  observacoes: editingClient.observacoes || '',
                  vendedoraResponsavel: editingClient.vendedoraResponsavel || currentUser?.name || 'Hellen Vasconcelos',
                  dataCriacao: editingClient.dataCriacao || getLocalDateString()
                };

                saveCliente(clientToSave);
                setSelectedCliente(clientToSave);
                setIsClientModalOpen(false);
                setEditingClient(null);
              }}
              className="p-4 sm:p-5 space-y-3.5 overflow-y-auto max-h-[80vh]"
            >
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <span>CPF do Cliente *</span>
                  <CPFValidationBadge cpf={editingClient.cpf} />
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={editingClient.cpf || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, cpf: maskCPFInput(e.target.value) })}
                    className="w-full px-3 py-2 pr-8 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-auto">
                    <CPFValidationBadge cpf={editingClient.cpf} size="md" />
                  </div>
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
                  value={editingClient.nome || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, nome: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Data de Nascimento</span>
                    {editingClient.dataNascimento && editingClient.dataNascimento !== '1975-01-01' && calculateAge(editingClient.dataNascimento) !== null && (
                      <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded">
                        {calculateAge(editingClient.dataNascimento)} anos
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={(editingClient.dataNascimento && editingClient.dataNascimento !== '1975-01-01' && editingClient.dataNascimento !== '01/01/1975') ? editingClient.dataNascimento : ''}
                    onChange={(e) => setEditingClient({ ...editingClient, dataNascimento: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(81) 98888-7777"
                    value={editingClient.telefone || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, telefone: maskPhoneInput(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Convênio Principal
                  </label>
                  <select
                    value={editingClient.convenioPrincipal || 'INSS'}
                    onChange={(e) => setEditingClient({ ...editingClient, convenioPrincipal: e.target.value as Convenio })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
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
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Igarassu"
                    value={editingClient.cidade || 'Igarassu'}
                    onChange={(e) => setEditingClient({ ...editingClient, cidade: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações de Atendimento
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais..."
                  value={editingClient.observacoes || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, observacoes: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsClientModalOpen(false);
                    setEditingClient(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
