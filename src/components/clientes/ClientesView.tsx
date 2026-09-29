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
  FileText
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Cliente, Proposta } from '../../types';
import { formatCPF, formatPhone, formatCurrency, formatDate } from '../../utils/formatters';

interface Props {
  onNovaPropostaParaCliente?: (cliente: Cliente) => void;
}

export const ClientesView: React.FC<Props> = ({ onNovaPropostaParaCliente }) => {
  const { clientes, propostas, logCpfAccess, saveCliente } = useCRM();
  const { currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [filterConvenio, setFilterConvenio] = useState<string>('todos');

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

  // Open WhatsApp link
  const openWhatsApp = (cliente: Cliente) => {
    const cleanPhone = cliente.telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá ${cliente.nome.split(' ')[0]}, tudo bem? Aqui é ${currentUser?.name} da Lívia Cred Saúde. Temos ótimas condições de crédito e portabilidade consignada disponíveis para seu convênio. Gostaria de uma simulação sem compromisso?`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
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

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 w-fit">
            {filteredClientes.length} Clientes Cadastrados
          </span>
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
                          <p className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                            CPF: {formatCPF(c.cpf)} · {c.convenioPrincipal}
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
                  <span>CPF: <strong>{formatCPF(selectedCliente.cpf)}</strong></span>
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

              <a
                href={`tel:${selectedCliente.telefone.replace(/\D/g, '')}`}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Ligar</span>
              </a>

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
                        prop.status === 'Aprovada' ? 'bg-blue-500 text-white' :
                        prop.status === 'Cancelada' ? 'bg-rose-500 text-white' :
                        'bg-amber-500 text-slate-950'
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
                            prop.status === 'Aprovada' ? 'bg-blue-100 text-blue-800' :
                            prop.status === 'Cancelada' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
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
                            <p className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                              {formatCurrency(prop.valorTaxa)} ({prop.percentualTaxa}%)
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Digitado em: {formatDate(prop.dataDigitacao)}</span>
                          <span>Vendedora: <strong>{prop.vendedora}</strong></span>
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
    </div>
  );
};
