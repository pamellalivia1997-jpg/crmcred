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
    importClientPortfolio,
    importFullSpreadsheetRows,
    clearAllTestData
  } = useCRM();
  const { currentUser, isManager } = useAuth();
  const isAdm = currentUser?.role === 'adm' || currentUser?.role === 'proprietaria';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [filterConvenio, setFilterConvenio] = useState<string>('todos');

  // Modal State for New / Edit Client
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Cliente> | null>(null);
  const [modalError, setModalError] = useState('');

  // Modal State for Importing Portfolio
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Modal State for Clearing Test Data
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearNotice, setClearNotice] = useState<string | null>(null);

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
                  dataNascimento: '1975-01-01',
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

            <button
              onClick={() => {
                setImportText('');
                setImportNotice(null);
                setIsImportModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-800 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800 shadow-xs transition-all active:scale-95"
              title="Importar carteira de clientes para o Firebase"
            >
              <UploadCloud className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Importar Carteira</span>
            </button>

            {/* Only Gerencial / ADM can clear test data. Vendedoras do NOT have permission! */}
            {(isManager || currentUser?.role === 'proprietaria' || currentUser?.role === 'adm') && (
              <button
                onClick={() => {
                  setClearNotice(null);
                  setIsClearModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 shadow-xs transition-all active:scale-95"
                title="Zerar todos os dados de teste no Firebase"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Zerar Dados de Teste</span>
              </button>
            )}

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
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {c.nome}
                          </p>
                          <p className="text-[11px] text-slate-500 tabular-nums mt-0.5 flex items-center flex-wrap gap-1">
                            <span>CPF: {formatCPF(c.cpf)}</span>
                            <CPFValidationBadge cpf={c.cpf} />
                            <span>· {c.convenioPrincipal}</span>
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
                  <span>Nascimento: {formatDate(selectedCliente.dataNascimento)}</span>
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
                  setEditingClient(selectedCliente);
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

            {/* Client Notes */}
            {selectedCliente.observacoes && (
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

                        {/* Comissão Promotora (Visibilidade Restrita: ADM) */}
                        {isAdm && (() => {
                          const comItem = comissoesPromotoras.find(
                            c => c.propostaId === prop.id || (prop.numeroContrato && c.numeroContrato && c.numeroContrato.trim().toLowerCase() === prop.numeroContrato.trim().toLowerCase())
                          );
                          return (
                            <div className="mt-2 p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block">
                                  Comissão Promotora (ADM):
                                </span>
                                {comItem && comItem.valorRecebido > 0 ? (
                                  <span className="font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                    {formatCurrency(comItem.valorRecebido)} ({comItem.promotora})
                                  </span>
                                ) : (
                                  <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
                                    Repasse pendente
                                  </span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                comItem && comItem.valorRecebido > 0
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                              }`}>
                                {comItem && comItem.valorRecebido > 0 ? 'CONCILIADO' : 'SEM REPASSE'}
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
                    <span>Data de Nascimento *</span>
                    {editingClient.dataNascimento && calculateAge(editingClient.dataNascimento) !== null && (
                      <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded">
                        {calculateAge(editingClient.dataNascimento)} anos
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    required
                    value={editingClient.dataNascimento || '1975-01-01'}
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

      {/* MODAL 1: IMPORTAR CARTEIRA DE CLIENTES (LOTE / CSV / FIREBASE) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Importar Carteira de Clientes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sincronização em lote direta para o banco de dados na nuvem do Firebase
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importNotice && (
              <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{importNotice}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Cole suas Linhas de Planilha (Excel / Google Sheets / CSV)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setImportText(
                      `Carimbo de data/hora\tCPF DO CLIENTE\tNOME DO CLIENTE\tDATA DA DIGITAÇÃO\tDATA DO PAGAMENTO AO CLIENTE\tCONVÊNIO\tOPERAÇÃO\tBANCO\tPROMOTORA\tVALOR DO EMPRÉSTIMO LIBERADO PARA O CLIENTE\tVALOR DA TAXA DA ASSESSORIA\tCLIENTE PAGOU A TAXA DE ASSESSORIA\tTaxa do Cartão\tVENDEDOR\tDIGITADOR\tNº DO CONTRATO (SEM ESPAÇAMENTO)\tSTATUS DO CONTRATO\tCOMISSÃO J2\tCOMISSÃO SEMPRE\tCOMISSÃO dg\tCOMISSÃO  gft\tFATURADO\n12/03/2026 18:04:11\t298.046.474-00\tMARCIA VIEIRA DA SILVA\t12/03/2026\t12/03/2026\tINSS\tASSESSORIA\tASSESSORIA\tASSESSORIA\t0,00\t200,00\tSIM\t\tHELLEN\tHELLEN\t0\tPAGO\t\t\t\t\t0\n12/03/2026 18:00:07\t428.687.424-91\tSAMUEL HENRIQUE PEREIRA\t12/03/2026\t12/03/2026\tINSS\tREFIN\tC6\tJ2 PROMOTORA\t2.957,02\t\t\t\tHELLEN\tHELLEN\t977526573\tPAGO\t177,42\t\t\t\t177,42\n12/03/2026 17:55:28\t428.687.424-91\tSAMUEL HENRIQUE PEREIRA\t12/03/2026\t12/03/2026\tINSS\tMARGEM\tDAYCOVAL\tJ2 PROMOTORA\t1.029,73\t\t\t\tHELLEN\tHELLEN\t830381469\tPAGO\t66,97\t\t\t\t66,97\n12/03/2026 17:51:53\t428.687.424-91\tSAMUEL HENRIQUE PEREIRA\t12/03/2026\t12/03/2026\tINSS\tMARGEM\tC6\tJ2 PROMOTORA\t4.464,13\t\t\t\tHELLEN\tHELLEN\t977526682\tPAGO\t292,4\t\t\t\t292,4`
                    );
                  }}
                  className="text-[11px] text-teal-600 dark:text-teal-400 font-bold hover:underline"
                >
                  Carregar Exemplo da Minha Planilha
                </button>
              </div>

              <textarea
                rows={7}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Cole aqui as linhas copiadas da sua planilha do Google Sheets / Excel..."
                className="w-full p-3 font-mono text-xs rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-teal-600" />
                  Inteligência de Importação em Nuvem Firebase:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400">
                  <li>Detecta automaticamente as colunas pelo título (CPF, Nome, Data, Operação, Banco, Promotora, Vendedor, Digitador, Contrato, Status, Comissões).</li>
                  <li>Padroniza e corrige erros de digitação de CPF (remover caracteres, preencher zeros à esquerda).</li>
                  <li>Suporta o mesmo cliente repetido em várias linhas com operações e datas diferentes.</li>
                  <li>Sincroniza todos os clientes, propostas e comissões diretamente para o banco em nuvem Firebase.</li>
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!importText.trim()) return;

                  // Robust CSV/TSV parser that handles quoted cells with newlines
                  const parseCSVOrTSV = (text: string): string[][] => {
                    const result: string[][] = [];
                    let row: string[] = [];
                    let currentCell = '';
                    let inQuotes = false;
                    
                    // Auto-detect delimiter
                    const sample = text.slice(0, 500);
                    let delimiter = '\t';
                    if (sample.includes('\t')) delimiter = '\t';
                    else if (sample.includes(';')) delimiter = ';';
                    else if (sample.includes('|')) delimiter = '|';
                    else if (sample.includes(',')) delimiter = ',';

                    for (let i = 0; i < text.length; i++) {
                      const char = text[i];
                      const nextChar = text[i + 1];

                      if (char === '"') {
                        if (inQuotes && nextChar === '"') {
                          currentCell += '"';
                          i++;
                        } else {
                          inQuotes = !inQuotes;
                        }
                      } else if (char === delimiter && !inQuotes) {
                        row.push(currentCell.trim());
                        currentCell = '';
                      } else if ((char === '\r' || char === '\n') && !inQuotes) {
                        if (char === '\r' && nextChar === '\n') {
                          i++;
                        }
                        row.push(currentCell.trim());
                        if (row.length > 0 || currentCell !== '') {
                          result.push(row);
                        }
                        row = [];
                        currentCell = '';
                      } else {
                        currentCell += char;
                      }
                    }

                    if (currentCell !== '' || row.length > 0) {
                      row.push(currentCell.trim());
                      result.push(row);
                    }

                    return result;
                  };

                  const parsedGrid = parseCSVOrTSV(importText);
                  if (parsedGrid.length === 0) return;

                  const firstRow = parsedGrid[0];
                  let isHeader = false;
                  
                  // Check if first row is a header
                  const headerString = firstRow.join(' ').toUpperCase();
                  if (/CPF|NOME|CLIENTE|DATA|CONV|OPER|BANCO|PROMOTORA|VALOR|VENDEDOR|CONTRATO|STATUS|COMIS/i.test(headerString)) {
                    isHeader = true;
                  }

                  let headerCells: string[] = [];
                  let startIndex = 0;

                  if (isHeader) {
                    headerCells = firstRow.map(c => c.trim().toUpperCase().replace(/\s+/g, ' '));
                    startIndex = 1;
                  }

                  let cpfIdx = headerCells.findIndex(c => c.includes('CPF'));
                  let nomeIdx = headerCells.findIndex(c => c.includes('NOME') || (c.includes('CLIENTE') && !c.includes('CPF') && !c.includes('PAGOU')));
                  
                  let telefoneIdx = headerCells.findIndex(c => c.includes('TELEFONE') || c.includes('CELULAR') || c.includes('TELEF'));
                  if (telefoneIdx < 0) {
                    telefoneIdx = headerCells.findIndex(c => c.includes('TEL') || c.includes('FONE') || c.includes('CEL'));
                  }
                  
                  let carimboIdx = headerCells.findIndex(c => c.includes('CARIMBO') || c.includes('HORA') || c.includes('TIMESTAMP'));

                  let dataPagtoIdx = headerCells.findIndex(c =>
                    c.includes('PAGAMENTO') ||
                    c.includes('PGTO') ||
                    c.includes('PAGO AO CLIENTE') ||
                    c.includes('PAGO CLIENTE') ||
                    c.includes('DATA PGTO') ||
                    c.includes('DT PGTO') ||
                    c.includes('DT PAGTO') ||
                    c.includes('DT PAGAMENTO') ||
                    c.includes('LIQUIDAÇÃO') ||
                    c.includes('LIQUIDACAO') ||
                    c.includes('LIBERAÇÃO') ||
                    c.includes('LIBERACAO')
                  );

                  let dataDigitaIdx = headerCells.findIndex((c, idx) =>
                    idx !== dataPagtoIdx && idx !== carimboIdx && !c.includes('CARIMBO') && !c.includes('HORA') && (
                      c.includes('DIGITAÇ') ||
                      c.includes('DIGITAC') ||
                      c.includes('DIGITACAO') ||
                      c.includes('DATA DIG') ||
                      (c.includes('DATA') && !c.includes('NASC') && !c.includes('PGTO') && !c.includes('PAG') && !c.includes('LIQ'))
                    )
                  );

                  let convenioIdx = headerCells.findIndex(c => c.includes('CONV'));
                  let operacaoIdx = headerCells.findIndex(c => c.includes('OPERAÇ') || c.includes('OPERAC'));
                  let bancoIdx = headerCells.findIndex(c => c.includes('BANCO'));
                  let promotoraIdx = headerCells.findIndex(c => c.includes('PROMOTORA'));
                  let valorEmpIdx = headerCells.findIndex(c => c.includes('EMPRÉSTIMO') || c.includes('EMPRESTIMO') || c.includes('LIBERADO'));
                  let valorTaxaIdx = headerCells.findIndex(c => c.includes('TAXA DA ASSESSORIA') || c.includes('VALOR DA TAXA') || (c.includes('TAXA') && !c.includes('CARTÃO') && !c.includes('PERCENTUAL')));

                  let clientePagouIdx = headerCells.findIndex(c =>
                    c.includes('PAGOU A TAXA') ||
                    c.includes('CLIENTE PAGOU') ||
                    c.includes('TAXA PAGA') ||
                    c.includes('TAXA FOI PAGA') ||
                    c.includes('TAXA QUITADA') ||
                    (c.includes('TAXA') && (c.includes('SIM') || c.includes('PAGA') || c.includes('PG') || c.includes('STATUS')))
                  );
                  let vendedoraIdx = headerCells.findIndex(c => c.includes('VENDEDOR') || c.includes('VENDEDORA'));
                  let digitadorIdx = headerCells.findIndex(c => c.includes('DIGITADOR'));
                  
                  let contratoIdx = headerCells.findIndex(c => c.includes('CONTRATO') && !c.includes('ANEXAR') && !c.includes('CAPA') && !c.includes('STATUS'));
                  if (contratoIdx < 0) {
                    contratoIdx = headerCells.findIndex(c => (c.includes('CONTRATO') || c.includes('CONTRAT') || c.includes('Nº') || c.includes('NUM') || c.includes('NUMERO')) && !c.includes('ANEXAR') && !c.includes('CAPA') && !c.includes('STATUS') && !c.includes('TELEFONE') && !c.includes('CPF') && !c.includes('VALOR'));
                  }
                  
                  let statusIdx = headerCells.findIndex(c => c.includes('STATUS'));
                  let comissaoJ2Idx = headerCells.findIndex(c => c.includes('J2'));
                  let comissaoSempreIdx = headerCells.findIndex(c => c.includes('SEMPRE'));
                  let comissaoDGIdx = headerCells.findIndex(c => c.includes('DG'));
                  let comissaoGFTIdx = headerCells.findIndex(c => c.includes('GFT'));
                  let faturadoIdx = headerCells.findIndex(c => c.includes('FATURADO'));
                  let linkDocIdx = headerCells.findIndex(c => c.includes('ANEXAR') || c.includes('CAPA') || c.includes('PRINT') || c.includes('DRIVE') || c.includes('TELA'));

                  if (!isHeader) {
                    cpfIdx = 0;
                    nomeIdx = 1;
                  }

                  const parsedRows: any[] = [];

                  for (let i = startIndex; i < parsedGrid.length; i++) {
                    const parts = parsedGrid[i];
                    if (parts.length < 2) continue;

                    const rawCpf = cpfIdx >= 0 && parts[cpfIdx] ? parts[cpfIdx] : (parts[0] || '');
                    const rawNome = nomeIdx >= 0 && parts[nomeIdx] ? parts[nomeIdx] : (parts[1] || '');

                    if (!rawCpf && !rawNome) continue;

                    parsedRows.push({
                      carimboDataHora: carimboIdx >= 0 ? parts[carimboIdx] : undefined,
                      cpf: rawCpf,
                      nomeCliente: rawNome || 'Cliente Importado',
                      telefone: telefoneIdx >= 0 ? parts[telefoneIdx] : undefined,
                      dataDigitacao: dataDigitaIdx >= 0 ? parts[dataDigitaIdx] : undefined,
                      dataPagamentoCliente: dataPagtoIdx >= 0 ? parts[dataPagtoIdx] : undefined,
                      convenio: convenioIdx >= 0 ? parts[convenioIdx] : undefined,
                      operacao: operacaoIdx >= 0 ? parts[operacaoIdx] : undefined,
                      banco: bancoIdx >= 0 ? parts[bancoIdx] : undefined,
                      promotora: promotoraIdx >= 0 ? parts[promotoraIdx] : undefined,
                      valorEmprestimo: valorEmpIdx >= 0 ? parts[valorEmpIdx] : undefined,
                      valorTaxa: valorTaxaIdx >= 0 ? parts[valorTaxaIdx] : undefined,
                      clientePagou: clientePagouIdx >= 0 ? parts[clientePagouIdx] : undefined,
                      vendedora: vendedoraIdx >= 0 ? parts[vendedoraIdx] : undefined,
                      digitador: digitadorIdx >= 0 ? parts[digitadorIdx] : undefined,
                      numeroContrato: contratoIdx >= 0 ? parts[contratoIdx] : undefined,
                      status: statusIdx >= 0 ? parts[statusIdx] : undefined,
                      comissaoJ2: comissaoJ2Idx >= 0 ? parts[comissaoJ2Idx] : undefined,
                      comissaoSempre: comissaoSempreIdx >= 0 ? parts[comissaoSempreIdx] : undefined,
                      comissaoDG: comissaoDGIdx >= 0 ? parts[comissaoDGIdx] : undefined,
                      comissaoGFT: comissaoGFTIdx >= 0 ? parts[comissaoGFTIdx] : undefined,
                      faturado: faturadoIdx >= 0 ? parts[faturadoIdx] : undefined,
                      linkDocumento: linkDocIdx >= 0 ? parts[linkDocIdx] : undefined,
                    });
                  }

                  if (parsedRows.length === 0) {
                    alert('Nenhum dado válido pôde ser extraído da planilha. Verifique o formato inserido.');
                    return;
                  }

                  const res = importFullSpreadsheetRows(parsedRows);

                  setImportNotice(
                    `Sucesso no Firebase! Processadas ${res.totalRows} linhas da planilha: ${res.clientsCreated} novos clientes, ${res.clientsUpdated} atualizados, ${res.proposalsCreated} contratos/operações salvos, ${res.commissionsCreated} comissões geradas, e ${res.cpfsCorrectedCount} CPFs padronizados.`
                  );

                  setTimeout(() => {
                    setIsImportModalOpen(false);
                    setImportNotice(null);
                  }, 3000);
                }}
                className="px-5 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Processar & Importar no Firebase</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ZERAR DADOS DE TESTE (LIMPEZA FIREBASE) */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Zerar Dados de Teste
                  </h3>
                  <p className="text-xs text-slate-500">
                    Limpeza total das propostas, comissões e alertas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {clearNotice ? (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{clearNotice}</span>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="leading-relaxed font-medium">
                  Tem certeza de que deseja <strong>zerar todos os registros de teste</strong> do banco de dados?
                </p>
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    O que será apagado:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
                    <li>Todas as propostas de teste (analisadas, pagas ou simuladas)</li>
                    <li>Lançamentos de comissões de promotoras e contas a pagar de teste</li>
                    <li>Alertas e histórico de auditoria antigos</li>
                  </ul>
                </div>
                <p className="text-[11px] text-slate-500">
                  O sistema ficará limpo e pronto para novos cadastros e importações de clientes.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>

              {!clearNotice && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await clearAllTestData();
                      setClearNotice('Zeramento confirmado: os dados operacionais foram excluídos da nuvem.');
                      setTimeout(() => {
                        setIsClearModalOpen(false);
                        setClearNotice(null);
                      }, 2000);
                    } catch (error) {
                      setClearNotice(`Falha no zeramento: ${error instanceof Error ? error.message : 'o Firebase não confirmou a exclusão.'}`);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar e Zerar Agora</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
