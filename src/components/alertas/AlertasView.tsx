import React, { useState, useMemo } from 'react';
import {
  BellRing,
  MessageCircle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Filter,
  Cake,
  Clock,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  Send,
  X,
  Gift,
  Share2,
  Settings,
  Search,
  Check,
  Zap,
  UserCheck
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { AlertaOportunidade, Proposta, Cliente } from '../../types';
import {
  formatCurrency,
  formatPhone,
  formatCPF,
  formatDate,
  getPostSaleIndicationInfo,
  getBirthdayInfo,
  BirthdayInfo,
  IndicationInfo,
  isSameSeller
} from '../../utils/formatters';
import { CPFValidationBadge } from '../common/CPFValidationBadge';
import {
  getMessagingSettings,
  saveMessagingSettings,
  openMessagingApp,
  MessagingSettings
} from '../../utils/messaging';

interface Props {
  onConverterEmProposta?: (alerta: AlertaOportunidade) => void;
}

type TabCategory = 'portabilidade' | 'refin' | 'indicacao' | 'aniversario' | 'todas';

export const AlertasView: React.FC<Props> = ({ onConverterEmProposta }) => {
  const { alertas, propostas, clientes, updateAlertaStatus, toggleLiberacaoLeadDigitador } = useCRM();
  const { currentUser, canManageTeam } = useAuth();

  // Active Category Tab
  const [activeCategory, setActiveCategory] = useState<TabCategory>('portabilidade');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Messaging Channel Settings Modal
  const [isMessagingSettingsOpen, setIsMessagingSettingsOpen] = useState(false);
  const [msgSettings, setMsgSettings] = useState<MessagingSettings>(getMessagingSettings());

  // Message Send Preview Modal
  const [targetContact, setTargetContact] = useState<{
    nome: string;
    telefone: string;
    cpf?: string;
    tipoTag: string;
    alertaId?: string;
  } | null>(null);
  const [composedMessage, setWhatsappMsg] = useState('');

  const isVendedora = currentUser?.role === 'vendedora';
  const isDigitador = currentUser?.role === 'digitador';
  const sellerName = currentUser?.name || 'Hellen Vasconcelos';

  // 1. Post-Sales Indication Opportunities (Paid proposals closed 3 to 7 days ago)
  const indicacaoOpportunities = useMemo(() => {
    return propostas
      .filter(p => {
        if (p.status !== 'Paga') return false;
        if (isVendedora && p.vendedora !== sellerName) return false;
        const pDate = p.dataPagamentoCliente || p.dataDigitacao;
        const info = getPostSaleIndicationInfo(pDate);
        return info && info.isPostSale3to7Days;
      })
      .map(p => {
        const client = clientes.find(c => c.cpf.replace(/\D/g, '') === p.cpf.replace(/\D/g, ''));
        const pDate = p.dataPagamentoCliente || p.dataDigitacao;
        const indInfo = getPostSaleIndicationInfo(pDate)!;
        return { proposta: p, client, indInfo };
      })
      .sort((a, b) => a.indInfo.daysSincePayment - b.indInfo.daysSincePayment);
  }, [propostas, clientes, isVendedora, sellerName]);

  // 2. Weekly Birthday Opportunities
  const aniversarioOpportunities = useMemo(() => {
    const listSeller = (clientes || []).filter(c => isVendedora ? c.vendedoraResponsavel === sellerName : true);
    return listSeller
      .map(c => {
        const bInfo = getBirthdayInfo(c.dataNascimento);
        return { cliente: c, bInfo };
      })
      .filter((item): item is { cliente: Cliente; bInfo: BirthdayInfo } => Boolean(item.bInfo && item.bInfo.isThisWeek))
      .sort((a, b) => a.bInfo.daysDiff - b.bInfo.daysDiff);
  }, [clientes, isVendedora, sellerName]);

  // Dynamic Portabilidade and Refinanciamento opportunities generated automatically from paid proposals
  const dynamicOpportunities = useMemo(() => {
    const list: AlertaOportunidade[] = [];
    
    // Group paid proposals to identify portability/refinancing candidates
    const paidProps = propostas.filter(p => p.status === 'Paga');
    
    paidProps.forEach((p, idx) => {
      const client = clientes.find(c => c.cpf.replace(/\D/g, '') === p.cpf.replace(/\D/g, ''));
      const tel = client?.telefone || '(81) 98000-0000';
      const cleanCpf = p.cpf.replace(/\D/g, '');
      
      // Let's create a Portabilidade opportunity if it is a Margem or Refin or Portabilidade
      if (['Margem', 'Refin', 'Portabilidade', 'Refin da Port', 'Saque Complementar', 'Pessoal'].includes(p.operacao)) {
        // Only generate if no explicit portabilidade alert exists for this client
        const hasExplicit = alertas.some(a => a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === 'portabilidade');
        if (!hasExplicit) {
          const valorPot = Math.round(p.valorEmprestimo * 0.15) || 2500; // estimated troco
          list.push({
            id: `dyn-port-${p.id}-${idx}`,
            clienteCpf: p.cpf,
            clienteNome: p.nomeCliente,
            clienteTelefone: tel,
            tipo: 'portabilidade',
            motivo: `Contrato Nº ${p.numeroContrato} de ${p.operacao} no banco ${p.banco} (R$ ${p.valorEmprestimo.toLocaleString('pt-BR')}) pago em ${formatDate(p.dataPagamentoCliente || p.dataDigitacao)} já possui parcelas pagas suficientes para Portabilidade. Redução de taxa estimada para liberação de troco de aproximadamente R$ ${valorPot.toLocaleString('pt-BR')}.`,
            vendedoraResponsavel: p.vendedora,
            status: 'nova',
            dataCriacao: p.dataPagamentoCliente || p.dataDigitacao,
            valorPotencial: valorPot,
            propostaOrigemId: p.id,
            liberadoParaDigitador: false
          });
        }
      }
      
      // Let's create a Refin opportunity
      if (['Margem', 'Refin', 'Portabilidade', 'Refin da Port'].includes(p.operacao)) {
        // Only generate if no explicit refin alert exists for this client
        const hasExplicit = alertas.some(a => a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === 'refin');
        if (!hasExplicit) {
          const valorPot = Math.round(p.valorEmprestimo * 0.12) || 1800; // estimated troco
          list.push({
            id: `dyn-refin-${p.id}-${idx}`,
            clienteCpf: p.cpf,
            clienteNome: p.nomeCliente,
            clienteTelefone: tel,
            tipo: 'refin',
            motivo: `Refinanciamento disponível para o contrato Nº ${p.numeroContrato} no ${p.banco}. Possibilidade de liberar troco imediato de até R$ ${valorPot.toLocaleString('pt-BR')} mantendo o mesmo valor de parcela.`,
            vendedoraResponsavel: p.vendedora,
            status: 'nova',
            dataCriacao: p.dataPagamentoCliente || p.dataDigitacao,
            valorPotencial: valorPot,
            propostaOrigemId: p.id,
            liberadoParaDigitador: false
          });
        }
      }
    });
    
    return list;
  }, [propostas, clientes, alertas]);

  // 3. Portabilidade Leads
  const portabilidadeAlertas = useMemo(() => {
    const combined = [...alertas, ...dynamicOpportunities];
    return combined.filter(a => {
      if (a.tipo !== 'portabilidade') return false;
      if (isDigitador) return a.liberadoParaDigitador === true;
      if (isVendedora) return isSameSeller(a.vendedoraResponsavel, sellerName);
      return true;
    });
  }, [alertas, dynamicOpportunities, isDigitador, isVendedora, sellerName]);

  // 4. Refinanciamento / Reativação Leads
  const refinAlertas = useMemo(() => {
    const combined = [...alertas, ...dynamicOpportunities];
    return combined.filter(a => {
      if (a.tipo !== 'refin' && a.tipo !== 'cartao_credito' && a.tipo !== 'reativacao') return false;
      if (isVendedora) return isSameSeller(a.vendedoraResponsavel, sellerName);
      return true;
    });
  }, [alertas, dynamicOpportunities, isVendedora, sellerName]);

  // All Alertas Filtered for "Todas"
  const filteredAllAlertas = useMemo(() => {
    const combined = [...alertas, ...dynamicOpportunities];
    return combined.filter(a => {
      if (isDigitador) return a.tipo === 'portabilidade' && a.liberadoParaDigitador === true;
      if (isVendedora && !isSameSeller(a.vendedoraResponsavel, sellerName)) return false;
      
      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term ||
        a.clienteNome.toLowerCase().includes(term) ||
        a.clienteCpf.includes(term) ||
        a.motivo.toLowerCase().includes(term);
      const matchStatus = filterStatus === 'todos' || a.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [alertas, dynamicOpportunities, isDigitador, isVendedora, sellerName, searchTerm, filterStatus]);

  // Open Messaging Modal for Indication
  const handleOpenIndicationMessage = (p: Proposta, client?: Cliente) => {
    const nomePrimeiro = p.nomeCliente.split(' ')[0];
    const phone = client?.telefone || '(81) 98000-0000';

    const msg = `Olá ${nomePrimeiro}, tudo bem? Aqui é ${currentUser?.name.split(' ')[0]} da Lívia Cred Saúde! 😄\n\nPassando para acompanhar o seu contrato de ${p.operacao} de R$ ${p.valorEmprestimo.toLocaleString('pt-BR')} no ${p.banco}, que foi pago e concluído com sucesso recentemente!\n\nVocê tem algum amigo, colega de trabalho ou familiar que também esteja precisando de um empréstimo consignado ou diminuição de juros via portabilidade? Se você nos indicar e a pessoa fechar, preparamos uma gratificação especial de agradecimento para você! 🎁`;

    setWhatsappMsg(msg);
    setTargetContact({
      nome: p.nomeCliente,
      telefone: phone,
      cpf: p.cpf,
      tipoTag: 'Pós-Venda & Indicação'
    });
  };

  // Open Messaging Modal for Birthday
  const handleOpenBirthdayMessage = (c: Cliente, bInfo: BirthdayInfo) => {
    const nomePrimeiro = c.nome.split(' ')[0];
    const msg = `Olá ${nomePrimeiro}, parabéns! 🎉 Toda a equipe da Lívia Cred Saúde e eu (${sellerName.split(' ')[0]}) desejamos muita saúde, paz e realizações pelo seu aniversário! Que seu novo ciclo seja abençoado! Grande abraço!`;

    setWhatsappMsg(msg);
    setTargetContact({
      nome: c.nome,
      telefone: c.telefone,
      cpf: c.cpf,
      tipoTag: 'Parabéns Aniversariante'
    });
  };

  // Open Messaging Modal for General Alert
  const handleOpenAlertaMessage = (alerta: AlertaOportunidade) => {
    const nomePrimeiro = alerta.clienteNome.split(' ')[0];
    let msg = '';

    if (alerta.tipo === 'portabilidade') {
      msg = `Olá ${nomePrimeiro}, tudo bem? Aqui é ${currentUser?.name.split(' ')[0]} da Lívia Cred Saúde. Identificamos em nosso sistema que seu contrato consignado já atingiu o prazo para Portabilidade com redução da taxa e liberação de troco em dinheiro na conta! Posso fazer uma simulação rápida sem compromisso?`;
    } else if (alerta.tipo === 'refin') {
      msg = `Olá ${nomePrimeiro}, como vai? Seu contrato consignado já permite Refinanciamento liberando valor imediato na sua conta mantendo a mesma parcela mensal. Posso calcular o valor para você hoje?`;
    } else if (alerta.tipo === 'cartao_credito') {
      msg = `Olá ${nomePrimeiro}! Identificamos que você possui margem livre para ativação do Cartão Benefício Consignado com saque imediato e sem anuidade. Gostaria de liberar o valor?`;
    } else {
      msg = `Olá ${nomePrimeiro}, tudo bem? Aqui é da Lívia Cred Saúde. Entramos em contato para verificar se podemos lhe ajudar com alguma simulação ou oportunidade de crédito consignado.`;
    }

    setWhatsappMsg(msg);
    setTargetContact({
      nome: alerta.clienteNome,
      telefone: alerta.clienteTelefone,
      cpf: alerta.clienteCpf,
      tipoTag: alerta.tipo,
      alertaId: alerta.id
    });
  };

  // Trigger Send via DigiSac / WhatsApp
  const handleSendComposition = () => {
    if (!targetContact) return;
    openMessagingApp(targetContact.telefone, composedMessage, msgSettings);
    if (targetContact.alertaId) {
      updateAlertaStatus(targetContact.alertaId, 'em_contato');
    }
    setTargetContact(null);
  };

  // Save Messaging Channel Settings
  const handleSaveMessagingSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveMessagingSettings(msgSettings);
    setIsMessagingSettingsOpen(false);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8 animate-in fade-in duration-200">
      {/* Top Bar Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BellRing className="w-6 h-6 text-amber-500" />
              <span>Oportunidades & Disparos</span>
            </h1>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {msgSettings.provider === 'digisac' ? 'DigiSac Multi-Atendimento' : 'WhatsApp Direct'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão limpa e categorizada de Portabilidade, Refin, Pedido de Indicações (3 a 7 dias pós-venda) e Aniversariantes
          </p>
        </div>

        {/* Messaging Provider Switcher Button */}
        <button
          type="button"
          onClick={() => setIsMessagingSettingsOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition"
        >
          <Settings className="w-3.5 h-3.5 text-teal-600" />
          <span>Configurar DigiSac / WhatsApp</span>
        </button>
      </div>

      {/* Structured Category Navigation Bar (Clean & Zero Clutter) */}
      <div className="flex p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-x-auto scrollbar-none shadow-xs">
        <button
          onClick={() => setActiveCategory('portabilidade')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeCategory === 'portabilidade'
              ? 'bg-[#0F5C63] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Portabilidade ({portabilidadeAlertas.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('refin')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeCategory === 'refin'
              ? 'bg-[#0F5C63] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          <span>Refin & Margem ({refinAlertas.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('indicacao')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeCategory === 'indicacao'
              ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-xs'
              : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-extrabold'
          }`}
        >
          <Share2 className="w-3.5 h-3.5 text-purple-300" />
          <span>Pedir Indicação (3 a 7d) ({indicacaoOpportunities.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('aniversario')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeCategory === 'aniversario'
              ? 'bg-[#0F5C63] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Cake className="w-3.5 h-3.5 text-pink-400" />
          <span>Aniversariantes ({aniversarioOpportunities.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('todas')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeCategory === 'todas'
              ? 'bg-[#0F5C63] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Todas ({filteredAllAlertas.length})</span>
        </button>
      </div>

      {/* CATEGORY 1: PORTABILIDADE */}
      {activeCategory === 'portabilidade' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-900 dark:text-cyan-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-600 shrink-0" />
              <span>
                <strong>Leads de Portabilidade:</strong> Clientes com tempo mínimo de contrato pago elegíveis para diminuição de taxa de juros e troco.
              </span>
            </div>
            {canManageTeam() && (
              <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                ADM pode autorizar para Digitadora
              </span>
            )}
          </div>

          {portabilidadeAlertas.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-800 dark:text-white">Nenhum lead de portabilidade pendente</p>
            </div>
          ) : (
            portabilidadeAlertas.map(alerta => (
              <div key={alerta.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300">
                      Portabilidade Elegível
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                      {alerta.clienteNome}
                    </h3>
                    <p className="text-xs text-slate-500">
                      CPF: {formatCPF(alerta.clienteCpf)} · Tel: {formatPhone(alerta.clienteTelefone)} · Vendedora: <strong>{alerta.vendedoraResponsavel}</strong>
                    </p>
                  </div>

                  {alerta.valorPotencial && (
                    <div className="text-left sm:text-right bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Troco Potencial Liberado</span>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(alerta.valorPotencial)}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {alerta.motivo}
                </p>

                {/* Authorization Control for Digitadora */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/60 text-xs">
                  <span className="text-[11px] font-semibold text-cyan-900 dark:text-cyan-200">
                    Acesso da Digitadora Ana Paula: <strong>{alerta.liberadoParaDigitador ? 'Liberado por ADM' : 'Bloqueado'}</strong>
                  </span>
                  {canManageTeam() && (
                    <button
                      type="button"
                      onClick={() => toggleLiberacaoLeadDigitador(alerta.id, !alerta.liberadoParaDigitador)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition ${
                        alerta.liberadoParaDigitador
                          ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          : 'bg-cyan-600 text-white hover:bg-cyan-700'
                      }`}
                    >
                      {alerta.liberadoParaDigitador ? 'Revogar Permissão' : 'Liberar para Digitadora'}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenAlertaMessage(alerta)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Disparar no {msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateAlertaStatus(alerta.id, 'convertida');
                      if (onConverterEmProposta) onConverterEmProposta(alerta);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
                    <span>Converter em Proposta</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CATEGORY 2: REFINANCIAMENTO & REATIVAÇÃO */}
      {activeCategory === 'refin' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Refinanciamento & Cartão Benefício:</strong> Clientes com contratos ativos com parcelas pagas suficientes para refinanciamento mantendo a mesma parcela ou liberação de margem de cartão.
            </span>
          </div>

          {refinAlertas.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-800 dark:text-white">Nenhum alerta de refinanciamento pendente</p>
            </div>
          ) : (
            refinAlertas.map(alerta => (
              <div key={alerta.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      {alerta.tipo === 'cartao_credito' ? 'Margem Cartão Livre' : 'Refinanciamento Disponível'}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                      {alerta.clienteNome}
                    </h3>
                    <p className="text-xs text-slate-500">
                      CPF: {formatCPF(alerta.clienteCpf)} · Tel: {formatPhone(alerta.clienteTelefone)} · Vendedora: <strong>{alerta.vendedoraResponsavel}</strong>
                    </p>
                  </div>

                  {alerta.valorPotencial && (
                    <div className="text-left sm:text-right bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Valor Estimado</span>
                      <p className="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatCurrency(alerta.valorPotencial)}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {alerta.motivo}
                </p>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenAlertaMessage(alerta)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Oferecer no {msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateAlertaStatus(alerta.id, 'convertida');
                      if (onConverterEmProposta) onConverterEmProposta(alerta);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
                    <span>Converter em Proposta</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CATEGORY 3: OPORTUNIDADES DE INDICAÇÃO (PÓS-VENDA 3 A 7 DIAS) */}
      {activeCategory === 'indicacao' && (
        <div className="space-y-3">
          <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-900 text-white shadow-md border border-purple-800/60 space-y-1">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-300" />
              <h2 className="text-sm sm:text-base font-black">
                Motor de Pós-Venda & Pedido de Indicações (3 a 7 Dias Após Pagamento)
              </h2>
            </div>
            <p className="text-xs text-purple-200 leading-relaxed">
              O momento ideal para pedir indicação de parentes e amigos é entre <strong>3 e 7 dias</strong> após o cliente receber o dinheiro do empréstimo na conta, quando a satisfação com o atendimento está no nível máximo!
            </p>
          </div>

          {indicacaoOpportunities.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800 space-y-2">
              <Gift className="w-8 h-8 text-purple-400 mx-auto" />
              <p className="text-xs font-bold text-slate-800 dark:text-white">
                Nenhum contrato pago na janela de 3 a 7 dias no momento
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                À medida que os contratos forem sendo pagos e completarem 3 dias de liquidação, eles aparecerão automaticamente nesta lista para disparo de mensagens de indicação.
              </p>
            </div>
          ) : (
            indicacaoOpportunities.map(({ proposta, client, indInfo }) => (
              <div
                key={proposta.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-purple-200 dark:border-purple-900/60 shadow-xs hover:border-purple-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 animate-pulse">
                        {indInfo.badgeLabel}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">
                        Contrato #{proposta.numeroContrato}
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {proposta.nomeCliente}
                    </h3>

                    <p className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
                      <span>CPF: {formatCPF(proposta.cpf)}</span>
                      <CPFValidationBadge cpf={proposta.cpf} />
                      <span>· {proposta.operacao} ({proposta.banco}) · Vendedora: <strong>{proposta.vendedora}</strong></span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right bg-purple-50 dark:bg-purple-950/40 p-3 rounded-2xl border border-purple-200/80 dark:border-purple-800/80">
                    <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Valor Pago ao Cliente</span>
                    <span className="text-base font-black text-purple-900 dark:text-purple-100 tabular-nums">
                      {formatCurrency(proposta.valorEmprestimo)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Pago em {formatDate(proposta.dataPagamentoCliente || proposta.dataDigitacao)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <Gift className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-purple-800 dark:text-purple-300 block">Roteiro Recomendado de Abordagem:</span>
                    <span>Agradeça a preferência pelo contrato concluído e peça a indicação de 2 a 3 amigos/parentes que estejam precisando de crédito.</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    Telefone: {formatPhone(client?.telefone || '(81) 98000-0000')}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenIndicationMessage(proposta, client)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition active:scale-95"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Pedir Indicação no {msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CATEGORY 4: ANIVERSARIANTES DA SEMANA */}
      {activeCategory === 'aniversario' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 text-xs text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <Cake className="w-4 h-4 text-pink-600 shrink-0" />
            <span>
              <strong>Aniversariantes da Semana:</strong> Parabenize os clientes na data especial para fortalecer o relacionamento de confiança.
            </span>
          </div>

          {aniversarioOpportunities.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
              <Cake className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-800 dark:text-white">Nenhum aniversariante nesta semana</p>
            </div>
          ) : (
            aniversarioOpportunities.map(({ cliente, bInfo }) => (
              <div key={cliente.cpf} className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                        bInfo.isToday ? 'bg-pink-500 text-white animate-pulse' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {bInfo.badgeLabel}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">{bInfo.dayMonth}</span>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {cliente.nome}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Completando <strong className="text-teal-700 dark:text-teal-400">{bInfo.turningAge} anos</strong> · {cliente.convenioPrincipal}
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300 flex items-center justify-center font-black text-lg border border-pink-200 dark:border-pink-800">
                    🎁
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    Tel: {formatPhone(cliente.telefone)}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenBirthdayMessage(cliente, bInfo)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Mandar Parabéns no {msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CATEGORY 5: TODAS AS OPORTUNIDADES */}
      {activeCategory === 'todas' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar oportunidade por cliente, CPF ou palavra-chave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold"
              >
                <option value="todos">Todos os Status</option>
                <option value="nova">Nova</option>
                <option value="em_contato">Em Contato</option>
                <option value="convertida">Convertida</option>
                <option value="descartada">Descartada</option>
              </select>
            </div>
          </div>

          {filteredAllAlertas.map(alerta => (
            <div key={alerta.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {alerta.tipo}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      alerta.status === 'nova' ? 'bg-amber-100 text-amber-900' :
                      alerta.status === 'em_contato' ? 'bg-blue-100 text-blue-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {alerta.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                    {alerta.clienteNome}
                  </h3>
                  <p className="text-xs text-slate-400">
                    CPF: {formatCPF(alerta.clienteCpf)} · Tel: {formatPhone(alerta.clienteTelefone)}
                  </p>
                </div>

                {alerta.valorPotencial && (
                  <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">
                    {formatCurrency(alerta.valorPotencial)}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                {alerta.motivo}
              </p>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleOpenAlertaMessage(alerta)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Disparar no {msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateAlertaStatus(alerta.id, 'convertida');
                    if (onConverterEmProposta) onConverterEmProposta(alerta);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
                  <span>Converter em Proposta</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: MESSAGE COMPOSITION PREVIEW (DIGISAC / WHATSAPP) */}
      {targetContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                  <span>Disparar Mensagem ({msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {targetContact.tipoTag} · Cliente: <strong>{targetContact.nome}</strong> ({formatPhone(targetContact.telefone)})
                </p>
              </div>
              <button
                onClick={() => setTargetContact(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Texto Personalizado da Mensagem:
              </label>
              <textarea
                rows={6}
                value={composedMessage}
                onChange={(e) => setWhatsappMsg(e.target.value)}
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
              <span>Canal de Destino Selecionado:</span>
              <strong className="font-extrabold uppercase">
                {msgSettings.provider === 'digisac' ? `DigiSac (${msgSettings.digisacDomain})` : 'WhatsApp Direct'}
              </strong>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTargetContact(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendComposition}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Abrir Chat no {msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MESSAGING SETTINGS (DIGISAC DOMAIN & PROVIDER CONFIG) */}
      {isMessagingSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Configuração de Mensageria & DigiSac
                </h3>
              </div>
              <button
                onClick={() => setIsMessagingSettingsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMessagingSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Selecione o Sistema de Mensagens Utilizado:
                </label>
                <select
                  value={msgSettings.provider}
                  onChange={(e) => setMsgSettings({ ...msgSettings, provider: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none"
                >
                  <option value="digisac">DigiSac Multi-Atendimento (Plataforma Recomendada)</option>
                  <option value="whatsapp">WhatsApp Direto (wa.me)</option>
                  <option value="whatsapp_web">WhatsApp Web (web.whatsapp.com)</option>
                </select>
              </div>

              {msgSettings.provider === 'digisac' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Endereço / Domínio do seu DigiSac:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="empresa.digisac.app ou app.digisac.me"
                    value={msgSettings.digisacDomain}
                    onChange={(e) => setMsgSettings({ ...msgSettings, digisacDomain: e.target.value })}
                    className="w-full px-3 py-2 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Exemplo: se o seu painel DigiSac abre em <code>liviacred.digisac.app</code>, digite este endereço acima.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMessagingSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-md transition active:scale-95"
                >
                  Salvar Preferências
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
