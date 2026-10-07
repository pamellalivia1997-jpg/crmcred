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
  UserCheck,
  Calendar,
  CalendarClock,
  CheckSquare
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
  const {
    alertas,
    propostas,
    clientes,
    updateAlertaStatus,
    toggleLiberacaoLeadDigitador,
    adiarAlerta,
    concluirAlerta,
    saveAlerta
  } = useCRM();
  const { currentUser, canManageTeam } = useAuth();

  // Active Category Tab
  const [activeCategory, setActiveCategory] = useState<TabCategory>('portabilidade');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Productivity Modals State
  const [alertaParaAdiar, setAlertaParaAdiar] = useState<AlertaOportunidade | null>(null);
  const [diasAdiar, setDiasAdiar] = useState<number | 'custom'>(30);
  const [dataAdiarCustom, setDataAdiarCustom] = useState<string>('');

  const [alertaParaConcluir, setAlertaParaConcluir] = useState<AlertaOportunidade | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Helper date limits
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Helper to compute difference in days
  const getDiffDays = (dateStr: string | undefined | null): number => {
    if (!dateStr) return 0;
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length !== 3) return 0;
      const [y, m, d] = parts.map(Number);
      if (!y || !m || !d) return 0;
      const t1 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const t2 = new Date(y, m - 1, d).getTime();
      return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // Helper: check if stored alert is postponed
  const isAlertPostponed = (alertId: string, clientCpf: string, tipo: string): boolean => {
    const cleanCpf = clientCpf.replace(/\D/g, '');
    const found = alertas.find(a =>
      a.id === alertId ||
      (a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === tipo)
    );
    if (!found) return false;
    if (found.status === 'adiada' && found.adiadoAte && found.adiadoAte > todayStr) {
      return true; // Still hidden
    }
    return false;
  };

  // Helper: check if stored alert was concluded recently
  const isAlertConcludedRecently = (alertId: string, clientCpf: string, tipo: string, daysThreshold = 180): boolean => {
    const cleanCpf = clientCpf.replace(/\D/g, '');
    const found = alertas.find(a =>
      a.id === alertId ||
      (a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === tipo)
    );
    if (!found) return false;
    if (found.status === 'concluida') {
      if (!found.concluidoEm) return true;
      const daysSinceConclusion = getDiffDays(found.concluidoEm);
      if (daysSinceConclusion < daysThreshold) return true; // Still inside cooldown
    }
    return false;
  };

  // 1. Post-Sales Indication Opportunities (Propostas digitadas entre 3 e 7 dias)
  const indicacaoOpportunities = useMemo(() => {
    return propostas
      .filter(p => {
        // Exclui canceladas
        if (p.status === 'Cancelada') return false;
        if (isVendedora && p.vendedora !== sellerName) return false;

        // Regra de Negócio: Propostas digitadas entre 3 e 7 dias
        const refDate = p.dataDigitacao || p.dataPagamentoCliente;
        if (!refDate) return false;

        const diffDays = getDiffDays(refDate);
        if (diffDays < 3 || diffDays > 7) return false;

        // Verifica se foi adiada ou concluída
        const dynamicId = `indicacao-${p.id}`;
        if (isAlertPostponed(dynamicId, p.cpf, 'proposta_parada')) return false;
        if (isAlertConcludedRecently(dynamicId, p.cpf, 'proposta_parada', 60)) return false;

        return true;
      })
      .map(p => {
        const client = clientes.find(c => c.cpf.replace(/\D/g, '') === p.cpf.replace(/\D/g, ''));
        const refDate = p.dataDigitacao || p.dataPagamentoCliente;
        const indInfo = getPostSaleIndicationInfo(refDate) || {
          isPostSale3to7Days: true,
          daysSincePayment: getDiffDays(refDate),
          badgeLabel: `Digitado há ${getDiffDays(refDate)} dias`
        };
        return { proposta: p, client, indInfo };
      })
      .sort((a, b) => a.indInfo.daysSincePayment - b.indInfo.daysSincePayment);
  }, [propostas, clientes, isVendedora, sellerName, alertas]);

  // 2. Weekly Birthday Opportunities
  const aniversarioOpportunities = useMemo(() => {
    const listSeller = (clientes || []).filter(c => isVendedora ? c.vendedoraResponsavel === sellerName : true);
    return listSeller
      .map(c => {
        const bInfo = getBirthdayInfo(c.dataNascimento);
        return { cliente: c, bInfo };
      })
      .filter((item): item is { cliente: Cliente; bInfo: BirthdayInfo } => {
        if (!item.bInfo || !item.bInfo.isThisWeek) return false;
        const bAlertId = `aniv-${item.cliente.cpf}`;
        if (isAlertPostponed(bAlertId, item.cliente.cpf, 'aniversario')) return false;
        if (isAlertConcludedRecently(bAlertId, item.cliente.cpf, 'aniversario', 30)) return false;
        return true;
      })
      .sort((a, b) => a.bInfo.daysDiff - b.bInfo.daysDiff);
  }, [clientes, isVendedora, sellerName, alertas]);

  // 3. Portabilidade (Regra de Negócio: Cliente com operação de Margem ou Refinanciamento há mais de 1 ano / 365 dias)
  const portabilidadeAlertas = useMemo(() => {
    const list: AlertaOportunidade[] = [];
    const paidProps = propostas.filter(p => p.status === 'Paga');

    paidProps.forEach((p, idx) => {
      const op = (p.operacao || '').toLowerCase();
      const isMargemOuRefin =
        op.includes('margem') ||
        op.includes('refin') ||
        op.includes('port') ||
        op.includes('novo consignado') ||
        op.includes('saque complementar');

      if (!isMargemOuRefin) return;

      const pDate = p.dataPagamentoCliente || p.dataDigitacao;
      if (!pDate) return;

      const diffDays = getDiffDays(pDate);
      // Regra de Negócio Exata: Há mais de 1 ano (>= 365 dias)
      if (diffDays < 365) return;

      const cleanCpf = p.cpf.replace(/\D/g, '');
      const dynamicId = `dyn-port-${p.id}`;

      // Verifica adiamento ou conclusão
      if (isAlertPostponed(dynamicId, cleanCpf, 'portabilidade')) return;
      if (isAlertConcludedRecently(dynamicId, cleanCpf, 'portabilidade', 365)) return;

      // Filtro de permissão
      if (isVendedora && !isSameSeller(p.vendedora, sellerName)) return;

      // Verifica se já existe alerta explícito gravado
      const explicit = alertas.find(a => a.id === dynamicId || (a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === 'portabilidade'));
      if (explicit) {
        if (explicit.status === 'adiada' && explicit.adiadoAte && explicit.adiadoAte > todayStr) return;
        if (explicit.status === 'concluida') return;
        list.push(explicit);
        return;
      }

      const client = clientes.find(c => c.cpf.replace(/\D/g, '') === cleanCpf);
      const tel = client?.telefone || '(81) 98000-0000';
      const valorPot = Math.round(p.valorEmprestimo * 0.16) || 2800; // estimated troco
      const anosDecorridos = (diffDays / 365).toFixed(1);

      list.push({
        id: dynamicId,
        clienteCpf: p.cpf,
        clienteNome: p.nomeCliente,
        clienteTelefone: tel,
        tipo: 'portabilidade',
        motivo: `Operação de ${p.operacao} realizada em ${formatDate(pDate)} (${anosDecorridos} ano(s) atrás) no banco ${p.banco} (Contrato #${p.numeroContrato}). O cliente já atingiu o prazo regulamentar para Portabilidade com redução da taxa e liberação estimada de troco de aproximadamente ${formatCurrency(valorPot)}.`,
        vendedoraResponsavel: p.vendedora || sellerName,
        status: 'nova',
        dataCriacao: pDate,
        valorPotencial: valorPot,
        propostaOrigemId: p.id,
        liberadoParaDigitador: false
      });
    });

    return list;
  }, [propostas, clientes, alertas, isVendedora, sellerName]);

  // 4. Refinanciamento (Regra de Negócio: Ofertas de refinanciamento para contratos de empréstimo há pelo menos 6 meses / 180 dias)
  const refinAlertas = useMemo(() => {
    const list: AlertaOportunidade[] = [];
    const paidProps = propostas.filter(p => p.status === 'Paga');

    paidProps.forEach((p, idx) => {
      const op = (p.operacao || '').toLowerCase();
      const isEligibleForRefin =
        op.includes('margem') ||
        op.includes('refin') ||
        op.includes('portabilidade') ||
        op.includes('pessoal') ||
        op.includes('empréstimo') ||
        op.includes('emprestimo');

      if (!isEligibleForRefin) return;

      const pDate = p.dataPagamentoCliente || p.dataDigitacao;
      if (!pDate) return;

      const diffDays = getDiffDays(pDate);
      // Regra de Negócio: Carência mínima de 6 meses (180 dias) para Refinanciamento
      if (diffDays < 180) return;

      const cleanCpf = p.cpf.replace(/\D/g, '');
      const dynamicId = `dyn-refin-${p.id}`;

      // Verifica adiamento ou conclusão
      if (isAlertPostponed(dynamicId, cleanCpf, 'refin')) return;
      if (isAlertConcludedRecently(dynamicId, cleanCpf, 'refin', 180)) return;

      // Filtro de permissão
      if (isVendedora && !isSameSeller(p.vendedora, sellerName)) return;

      const explicit = alertas.find(a => a.id === dynamicId || (a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === 'refin'));
      if (explicit) {
        if (explicit.status === 'adiada' && explicit.adiadoAte && explicit.adiadoAte > todayStr) return;
        if (explicit.status === 'concluida') return;
        list.push(explicit);
        return;
      }

      const client = clientes.find(c => c.cpf.replace(/\D/g, '') === cleanCpf);
      const tel = client?.telefone || '(81) 98000-0000';
      const valorPot = Math.round(p.valorEmprestimo * 0.12) || 1900;
      const mesesDecorridos = Math.round(diffDays / 30);

      list.push({
        id: dynamicId,
        clienteCpf: p.cpf,
        clienteNome: p.nomeCliente,
        clienteTelefone: tel,
        tipo: 'refin',
        motivo: `Contrato de ${p.operacao} no ${p.banco} (#${p.numeroContrato}) com ${mesesDecorridos} meses de vigência pagos. O cliente está elegível para Refinanciamento mantendo o mesmo valor de parcela e liberando troco estimado de ${formatCurrency(valorPot)}.`,
        vendedoraResponsavel: p.vendedora || sellerName,
        status: 'nova',
        dataCriacao: pDate,
        valorPotencial: valorPot,
        propostaOrigemId: p.id,
        liberadoParaDigitador: false
      });
    });

    return list;
  }, [propostas, clientes, alertas, isVendedora, sellerName]);

  // All Alertas Filtered for "Todas"
  const filteredAllAlertas = useMemo(() => {
    const combined = [...portabilidadeAlertas, ...refinAlertas];
    return combined.filter(a => {
      if (isDigitador) return a.tipo === 'portabilidade' && a.liberadoParaDigitador === true;
      if (isVendedora && !isSameSeller(a.vendedoraResponsavel, sellerName)) return false;

      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        a.clienteNome.toLowerCase().includes(term) ||
        a.clienteCpf.includes(term) ||
        a.motivo.toLowerCase().includes(term);
      const matchStatus = filterStatus === 'todos' || a.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [portabilidadeAlertas, refinAlertas, isDigitador, isVendedora, sellerName, searchTerm, filterStatus]);

  // Ação de Produtividade 1: Executar Adiar
  const handleConfirmarAdiar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertaParaAdiar) return;

    let targetDateStr = '';
    if (diasAdiar === 'custom') {
      if (!dataAdiarCustom) {
        alert('Por favor, informe a data para a qual deseja reagendar.');
        return;
      }
      targetDateStr = dataAdiarCustom;
    } else {
      const d = new Date();
      d.setDate(d.getDate() + Number(diasAdiar));
      targetDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    adiarAlerta(alertaParaAdiar.id, targetDateStr, alertaParaAdiar);

    setToastMessage(`Oportunidade de ${alertaParaAdiar.clienteNome} adiada para ${formatDate(targetDateStr)}. O registro foi ocultado e retornará automaticamente na data agendada.`);
    setAlertaParaAdiar(null);
    setDataAdiarCustom('');
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Ação de Produtividade 2: Executar Concluir
  const handleConfirmarConcluir = (fechouNovoContrato: boolean) => {
    if (!alertaParaConcluir) return;

    concluirAlerta(alertaParaConcluir.id, alertaParaConcluir);

    if (fechouNovoContrato) {
      if (onConverterEmProposta) {
        onConverterEmProposta(alertaParaConcluir);
      }
      setToastMessage(`Oportunidade fechada com novo contrato! O cliente entrará no fluxo de Indicação em 3 a 7 dias.`);
    } else {
      setToastMessage(`Oportunidade marcada como concluída! O registro foi ocultado e retornará automaticamente quando se encaixar novamente nos critérios.`);
    }

    setAlertaParaConcluir(null);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Open Messaging Modal for Indication
  const handleOpenIndicationMessage = (p: Proposta, client?: Cliente) => {
    const nomePrimeiro = p.nomeCliente.split(' ')[0];
    const phone = client?.telefone || '(81) 98000-0000';

    const msg = `Olá ${nomePrimeiro}, tudo bem? Aqui é ${currentUser?.name.split(' ')[0]} da Lívia Cred Saúde! 😄\n\nPassando para acompanhar o seu contrato de ${p.operacao} de R$ ${p.valorEmprestimo.toLocaleString('pt-BR')} no ${p.banco}, que foi concluído com sucesso recentemente!\n\nVocê tem algum amigo, colega de trabalho ou familiar que também esteja precisando de um empréstimo consignado ou redução de juros via portabilidade? Se você nos indicar e a pessoa fechar, preparamos uma gratificação especial de agradecimento para você! 🎁`;

    setWhatsappMsg(msg);
    setTargetContact({
      nome: p.nomeCliente,
      telefone: phone,
      cpf: p.cpf,
      tipoTag: 'Pós-Venda & Indicação',
      alertaId: `indicacao-${p.id}`
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
      tipoTag: 'Parabéns Aniversariante',
      alertaId: `aniv-${c.cpf}`
    });
  };

  // Open Messaging Modal for General Alert
  const handleOpenAlertaMessage = (alerta: AlertaOportunidade) => {
    const nomePrimeiro = alerta.clienteNome.split(' ')[0];
    let msg = '';

    if (alerta.tipo === 'portabilidade') {
      msg = `Olá ${nomePrimeiro}, tudo bem? Aqui é ${currentUser?.name.split(' ')[0]} da Lívia Cred Saúde. Identificamos em nosso sistema que seu contrato consignado já atingiu o prazo de mais de 1 ano para Portabilidade com redução da taxa e liberação de troco em dinheiro na conta! Posso fazer uma simulação rápida sem compromisso?`;
    } else if (alerta.tipo === 'refin') {
      msg = `Olá ${nomePrimeiro}, como vai? Seu contrato consignado já completou a carência mínima para Refinanciamento liberando valor imediato na sua conta mantendo a mesma parcela mensal. Posso calcular o valor para você hoje?`;
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
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [chatNotice, setChatNotice] = useState<string | null>(null);

  const handleSendComposition = async () => {
    if (!targetContact) return;
    setIsOpeningChat(true);
    setChatNotice(null);

    try {
      const res = await openMessagingApp(
        targetContact.telefone,
        composedMessage,
        msgSettings,
        {
          nome: targetContact.nome,
          cpf: targetContact.cpf,
          vendedora: currentUser?.name
        }
      );

      if (targetContact.alertaId) {
        updateAlertaStatus(targetContact.alertaId, 'em_contato');
      }

      if (!res.success && res.error) {
        setChatNotice(`Aviso: ${res.error}`);
      } else {
        setToastMessage('Mensagem copiada para a área de transferência e conversa aberta no DigiSac!');
        setTimeout(() => setToastMessage(null), 5000);
        setTargetContact(null);
      }
    } catch (err: any) {
      setChatNotice(`Erro ao abrir conversa: ${err?.message || 'Falha de conexão'}`);
    } finally {
      setIsOpeningChat(false);
    }
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BellRing className="w-6 h-6 text-amber-500" />
            <span>Oportunidades & Alertas</span>
          </h1>
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

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Structured Category Navigation Bar */}
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
          <span>Refinanciamento ({refinAlertas.length})</span>
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
          {portabilidadeAlertas.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-800 dark:text-white">Nenhum lead de portabilidade pendente</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Contratos com mais de 1 ano aparecerão aqui automaticamente para contato.
              </p>
            </div>
          ) : (
            portabilidadeAlertas.map(alerta => (
              <div key={alerta.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300">
                      Portabilidade Elegível (+1 ano)
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
                    Acesso da Digitadora: <strong>{alerta.liberadoParaDigitador ? 'Liberado por ADM' : 'Bloqueado'}</strong>
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

                {/* Productivity Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAlertaMessage(alerta)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
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

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAlertaParaAdiar(alerta)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                      title="Adiar para data futura"
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Adiar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAlertaParaConcluir(alerta)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 font-bold text-xs transition"
                      title="Marcar como concluído"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Concluir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CATEGORY 2: REFINANCIAMENTO */}
      {activeCategory === 'refin' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Ofertas de Refinanciamento:</strong> Contratos com carência mínima de <strong>6 meses</strong> de parcelas pagas, permitindo refinanciar mantendo a mesma parcela mensal e liberando troco em conta.
            </span>
          </div>

          {refinAlertas.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-800 dark:text-white">Nenhum contrato pendente de refinanciamento</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Contratos pagos há mais de 6 meses aparecerão aqui com cálculo automático de troco estimado.
              </p>
            </div>
          ) : (
            refinAlertas.map(alerta => (
              <div key={alerta.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      Refinanciamento Disponível (+6 meses)
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
                      <span className="text-[10px] uppercase font-bold text-slate-400">Troco Estimado</span>
                      <p className="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatCurrency(alerta.valorPotencial)}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {alerta.motivo}
                </p>

                {/* Productivity Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAlertaMessage(alerta)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
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

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAlertaParaAdiar(alerta)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                      title="Adiar para data futura"
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Adiar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAlertaParaConcluir(alerta)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 font-bold text-xs transition"
                      title="Marcar como concluído"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Concluir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CATEGORY 3: OPORTUNIDADES DE INDICAÇÃO (3 A 7 DIAS DA DIGITAÇÃO) */}
      {activeCategory === 'indicacao' && (
        <div className="space-y-3">
          <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-900 text-white shadow-md border border-purple-800/60 space-y-1">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-300" />
              <h2 className="text-sm sm:text-base font-black">
                Motor de Pós-Venda & Pedido de Indicações (3 a 7 Dias da Digitação)
              </h2>
            </div>
            <p className="text-xs text-purple-200 leading-relaxed">
              O momento ideal para pedir indicação de conhecidos e familiares é entre <strong>3 e 7 dias</strong> após a digitação da proposta, quando o cliente já teve o contato positivo da aprovação. Se o cliente fechar novo contrato, ele renova o ciclo; se concluir ou o prazo expirar, ele retorna meses depois como refinanciamento!
            </p>
          </div>

          {indicacaoOpportunities.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800 space-y-2">
              <Gift className="w-8 h-8 text-purple-400 mx-auto" />
              <p className="text-xs font-bold text-slate-800 dark:text-white">
                Nenhuma proposta na janela ideal de 3 a 7 dias da digitação
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                À medida que novas propostas forem digitadas e completarem de 3 a 7 dias, elas aparecerão aqui automaticamente para abordagem de indicação.
              </p>
            </div>
          ) : (
            indicacaoOpportunities.map(({ proposta, client, indInfo }) => {
              const alertaMock: AlertaOportunidade = {
                id: `indicacao-${proposta.id}`,
                clienteCpf: proposta.cpf,
                clienteNome: proposta.nomeCliente,
                clienteTelefone: client?.telefone || '(81) 98000-0000',
                tipo: 'proposta_parada',
                motivo: `Contrato #${proposta.numeroContrato} digitado há ${indInfo.daysSincePayment} dias. Janela ideal para pós-venda e solicitação de indicação premiada.`,
                vendedoraResponsavel: proposta.vendedora || sellerName,
                status: 'nova',
                dataCriacao: proposta.dataDigitacao,
                propostaOrigemId: proposta.id
              };

              return (
                <div
                  key={proposta.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-purple-200 dark:border-purple-900/60 shadow-xs hover:border-purple-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300">
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
                      <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Valor do Contrato</span>
                      <span className="text-base font-black text-purple-900 dark:text-purple-100 tabular-nums">
                        {formatCurrency(proposta.valorEmprestimo)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Digitado em {formatDate(proposta.dataDigitacao)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                    <Gift className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-purple-800 dark:text-purple-300 block">Roteiro Recomendado de Abordagem:</span>
                      <span>Agradeça a confiança no atendimento e peça a indicação de 2 a 3 amigos ou colegas de trabalho que também precisem de crédito consignado ou redução de juros.</span>
                    </div>
                  </div>

                  {/* Productivity Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenIndicationMessage(proposta, client)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition active:scale-95"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Pedir Indicação no {msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onConverterEmProposta) onConverterEmProposta(alertaMock);
                        }}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 hover:bg-purple-200 font-bold text-xs transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Novo Contrato</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAlertaParaAdiar(alertaMock)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                        title="Adiar contato de indicação"
                      >
                        <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Adiar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAlertaParaConcluir(alertaMock)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 font-bold text-xs transition"
                        title="Marcar indicação como concluída"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Concluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CATEGORY 4: ANIVERSARIANTES DA SEMANA */}
      {activeCategory === 'aniversario' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 text-xs text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <Cake className="w-4 h-4 text-pink-600 shrink-0" />
            <span>
              <strong>Aniversariantes da Semana:</strong> Parabenize os clientes na data especial para fortalecer o relacionamento e abrir portas para novas oportunidades.
            </span>
          </div>

          {aniversarioOpportunities.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
              <Cake className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-800 dark:text-white">Nenhum aniversariante nesta semana</p>
            </div>
          ) : (
            aniversarioOpportunities.map(({ cliente, bInfo }) => {
              const alertaMock: AlertaOportunidade = {
                id: `aniv-${cliente.cpf}`,
                clienteCpf: cliente.cpf,
                clienteNome: cliente.nome,
                clienteTelefone: cliente.telefone,
                tipo: 'aniversario',
                motivo: `Aniversariante da semana (${bInfo.dayMonth}). Completando ${bInfo.turningAge} anos.`,
                vendedoraResponsavel: cliente.vendedoraResponsavel || sellerName,
                status: 'nova',
                dataCriacao: todayStr
              };

              return (
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

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenBirthdayMessage(cliente, bInfo)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Mandar Parabéns no {msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onConverterEmProposta) onConverterEmProposta(alertaMock);
                        }}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 font-bold text-xs transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Simular Crédito</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAlertaParaAdiar(alertaMock)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                        title="Adiar contato"
                      >
                        <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Adiar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAlertaParaConcluir(alertaMock)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 font-bold text-xs transition"
                        title="Concluir"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Concluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
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

              {/* Productivity Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAlertaMessage(alerta)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Disparar Mensagem</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateAlertaStatus(alerta.id, 'convertida');
                      if (onConverterEmProposta) onConverterEmProposta(alerta);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Converter</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAlertaParaAdiar(alerta)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                  >
                    <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Adiar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAlertaParaConcluir(alerta)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 font-bold text-xs transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Concluir</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADIAR OPORTUNIDADE (REAGENDAMENTO COM OCULTAÇÃO TEMPORÁRIA) */}
      {alertaParaAdiar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Adiar Oportunidade
                </h3>
              </div>
              <button
                onClick={() => setAlertaParaAdiar(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                Cliente: <strong className="text-slate-900 dark:text-white">{alertaParaAdiar.clienteNome}</strong> ({formatCPF(alertaParaAdiar.clienteCpf)})
              </p>
              <p className="text-[11px] text-slate-400">
                O registro será <strong>ocultado do painel</strong> e voltará a aparecer automaticamente na data escolhida.
              </p>
            </div>

            <form onSubmit={handleConfirmarAdiar} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Escolha o Prazo de Reagendamento:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 7, label: '+7 dias (Semana que vem)' },
                    { val: 15, label: '+15 dias (Em 2 semanas)' },
                    { val: 30, label: '+30 dias (Próximo mês)' },
                    { val: 60, label: '+60 dias (Em 2 meses)' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setDiasAdiar(opt.val)}
                      className={`p-2.5 rounded-xl border text-left font-bold transition ${
                        diasAdiar === opt.val
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setDiasAdiar('custom')}
                  className={`w-full p-2.5 rounded-xl border text-left font-bold transition ${
                    diasAdiar === 'custom'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  📅 Escolher uma Data Específica no Calendário
                </button>

                {diasAdiar === 'custom' && (
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={dataAdiarCustom}
                    onChange={(e) => setDataAdiarCustom(e.target.value)}
                    className="w-full mt-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold"
                  />
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAlertaParaAdiar(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
                >
                  Confirmar Adiar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONCLUIR OPORTUNIDADE (DESFECHO & ENTRADA NO FLUXO DE INDICAÇÃO) */}
      {alertaParaConcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Concluir Oportunidade
                </h3>
              </div>
              <button
                onClick={() => setAlertaParaConcluir(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-slate-500">
                Cliente: <strong className="text-slate-900 dark:text-white">{alertaParaConcluir.clienteNome}</strong>
              </p>
              <p className="text-slate-400 text-[11px]">
                Selecione o desfecho do contato:
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Option A: Fechou novo contrato -> vai para indicação */}
              <button
                type="button"
                onClick={() => handleConfirmarConcluir(true)}
                className="w-full p-3.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-left hover:bg-emerald-100/70 transition flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-100">
                    Cliente Fechou Novo Contrato!
                  </h4>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                    Converte para emissão de proposta. O cliente entrará automaticamente no fluxo de <strong>Pedido de Indicação (3 a 7 dias)</strong>.
                  </p>
                </div>
              </button>

              {/* Option B: Concluiu sem novo contrato -> some e retorna no refin quando elegível */}
              <button
                type="button"
                onClick={() => handleConfirmarConcluir(false)}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  —
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Concluir Atendimento (Sem Novo Contrato)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Oportunidade finalizada. O registro some temporariamente e só retornará meses depois quando se encaixar novamente em critérios de refinanciamento ou portabilidade.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setAlertaParaConcluir(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW & DISPARO DE MENSAGEM */}
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

            {chatNotice && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                <span>{chatNotice}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isOpeningChat}
                onClick={() => setTargetContact(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isOpeningChat}
                onClick={handleSendComposition}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs shadow-md transition active:scale-95"
              >
                {isOpeningChat ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {isOpeningChat
                    ? 'Iniciando no DigiSac...'
                    : `Iniciar Atendimento no ${msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MESSAGING SETTINGS (DIGISAC DOMAIN & PROVIDER CONFIG) */}
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
                    placeholder="liviacredsaude.digisac.io"
                    value={msgSettings.digisacDomain}
                    onChange={(e) => setMsgSettings({ ...msgSettings, digisacDomain: e.target.value })}
                    className="w-full px-3 py-2 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
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
