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
  CheckSquare,
  ExternalLink
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

export interface GroupedOpportunity {
  id: string;
  clienteCpf: string;
  clienteNome: string;
  clienteTelefone: string;
  vendedoraResponsavel: string;
  tipo: 'portabilidade' | 'refin' | 'indicacao' | 'aniversario' | 'todas';
  status: 'nova' | 'em_contato' | 'convertida' | 'descartada' | 'adiada' | 'concluida';
  valorPotencial: number;
  liberadoParaDigitador?: boolean;
  propostas: {
    id: string;
    banco: string;
    operacao: string;
    numeroContrato: string;
    valorEmprestimo: number;
    mesesPagos: number;
    status?: string;
    data: string;
  }[];
}

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
  const [alertaParaAdiar, setAlertaParaAdiar] = useState<GroupedOpportunity | any | null>(null);
  const [diasAdiar, setDiasAdiar] = useState<number | 'custom'>(30);
  const [dataAdiarCustom, setDataAdiarCustom] = useState<string>('');

  const [alertaParaConcluir, setAlertaParaConcluir] = useState<GroupedOpportunity | any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Detailed client timeline modal state
  const [selectedTimelineClient, setSelectedTimelineClient] = useState<{ clienteCpf: string; clienteNome: string } | null>(null);

  // Vanguard integration link handler
  const handleVanguardClick = (e: React.MouseEvent, cpf: string) => {
    e.stopPropagation();
    const cleanCpf = cpf.replace(/\D/g, '');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cleanCpf);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = cleanCpf;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
    setToastMessage(`CPF copiado com sucesso! (${formatCPF(cpf)})`);
    setTimeout(() => setToastMessage(null), 4000);
    window.open("https://gestao.sistemacorban.com.br/index.php/", "_blank");
  };

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

  // Proposta Finder helper to display and track unique installments / paid months
  const getClientProposals = (cpf: string) => {
    const cleanCpf = cpf.replace(/\D/g, '');
    return propostas
      .filter(p => p.cpf.replace(/\D/g, '') === cleanCpf && (p.status === 'Paga' || p.status === 'Em análise'))
      .map(p => {
        const pDate = p.dataPagamentoCliente || p.dataDigitacao;
        const diffDays = pDate ? getDiffDays(pDate) : 0;
        const mesesPagos = Math.floor(diffDays / 30);
        return {
          id: p.id,
          banco: p.banco,
          operacao: p.operacao,
          numeroContrato: p.numeroContrato,
          valorEmprestimo: p.valorEmprestimo,
          mesesPagos,
          status: p.status,
          data: pDate || ''
        };
      });
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

  // Grouped Indicação
  const indicacaoGrouped = useMemo(() => {
    const groups: { [cpf: string]: GroupedOpportunity } = {};
    
    indicacaoOpportunities.forEach(({ proposta, client, indInfo }) => {
      const cleanCpf = proposta.cpf.replace(/\D/g, '');
      const clientProps = getClientProposals(cleanCpf);
      if (!groups[cleanCpf]) {
        groups[cleanCpf] = {
          id: `grouped-ind-${cleanCpf}`,
          clienteCpf: proposta.cpf,
          clienteNome: proposta.nomeCliente,
          clienteTelefone: client?.telefone || '(81) 98000-0000',
          vendedoraResponsavel: proposta.vendedora || sellerName,
          tipo: 'indicacao' as any,
          status: 'nova',
          valorPotencial: proposta.valorEmprestimo,
          liberadoParaDigitador: false,
          propostas: clientProps
        };
      } else {
        groups[cleanCpf].valorPotencial = (groups[cleanCpf].valorPotencial || 0) + proposta.valorEmprestimo;
      }
    });

    return Object.values(groups);
  }, [indicacaoOpportunities, sellerName, propostas]);

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
        motivo: `Operação de ${p.operacao} realizada em ${formatDate(pDate)} (${anosDecorridos} ano(s) atrás) no banco ${p.banco} (Contrato #${p.numeroContrato}).`,
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

  // Grouped Portabilidade by client CPF
  const portabilidadeGrouped = useMemo(() => {
    const groups: { [cpf: string]: GroupedOpportunity } = {};
    portabilidadeAlertas.forEach(alerta => {
      const cleanCpf = alerta.clienteCpf.replace(/\D/g, '');
      const clientProps = getClientProposals(cleanCpf);
      if (!groups[cleanCpf]) {
        groups[cleanCpf] = {
          id: `grouped-port-${cleanCpf}`,
          clienteCpf: alerta.clienteCpf,
          clienteNome: alerta.clienteNome,
          clienteTelefone: alerta.clienteTelefone,
          vendedoraResponsavel: alerta.vendedoraResponsavel,
          tipo: 'portabilidade',
          status: alerta.status,
          valorPotencial: alerta.valorPotencial || 0,
          liberadoParaDigitador: alerta.liberadoParaDigitador,
          propostas: clientProps
        };
      } else {
        groups[cleanCpf].valorPotencial += alerta.valorPotencial || 0;
        if (alerta.liberadoParaDigitador) {
          groups[cleanCpf].liberadoParaDigitador = true;
        }
      }
    });
    return Object.values(groups);
  }, [portabilidadeAlertas, propostas]);

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

      list.push({
        id: dynamicId,
        clienteCpf: p.cpf,
        clienteNome: p.nomeCliente,
        clienteTelefone: tel,
        tipo: 'refin',
        motivo: `Contrato de ${p.operacao} no ${p.banco} (#${p.numeroContrato}) com carência concluída.`,
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

  // Grouped Refinanciamento by client CPF
  const refinGrouped = useMemo(() => {
    const groups: { [cpf: string]: GroupedOpportunity } = {};
    refinAlertas.forEach(alerta => {
      const cleanCpf = alerta.clienteCpf.replace(/\D/g, '');
      const clientProps = getClientProposals(cleanCpf);
      if (!groups[cleanCpf]) {
        groups[cleanCpf] = {
          id: `grouped-refin-${cleanCpf}`,
          clienteCpf: alerta.clienteCpf,
          clienteNome: alerta.clienteNome,
          clienteTelefone: alerta.clienteTelefone,
          vendedoraResponsavel: alerta.vendedoraResponsavel,
          tipo: 'refin',
          status: alerta.status,
          valorPotencial: alerta.valorPotencial || 0,
          liberadoParaDigitador: alerta.liberadoParaDigitador,
          propostas: clientProps
        };
      } else {
        groups[cleanCpf].valorPotencial += alerta.valorPotencial || 0;
        if (alerta.liberadoParaDigitador) {
          groups[cleanCpf].liberadoParaDigitador = true;
        }
      }
    });
    return Object.values(groups);
  }, [refinAlertas, propostas]);

  // All Grouped Alertas Filtered for "Todas"
  const filteredAllGroupedAlertas = useMemo(() => {
    const groups: { [cpf: string]: GroupedOpportunity } = {};
    
    portabilidadeGrouped.forEach(g => {
      const cleanCpf = g.clienteCpf.replace(/\D/g, '');
      groups[cleanCpf] = {
        ...g,
        id: `grouped-all-${cleanCpf}`,
        tipo: 'todas' as any
      };
    });

    refinGrouped.forEach(g => {
      const cleanCpf = g.clienteCpf.replace(/\D/g, '');
      if (groups[cleanCpf]) {
        groups[cleanCpf].valorPotencial = (groups[cleanCpf].valorPotencial || 0) + (g.valorPotencial || 0);
        if (g.liberadoParaDigitador) {
          groups[cleanCpf].liberadoParaDigitador = true;
        }
      } else {
        groups[cleanCpf] = {
          ...g,
          id: `grouped-all-${cleanCpf}`,
          tipo: 'todas' as any
        };
      }
    });

    return Object.values(groups).filter(g => {
      if (isDigitador) return g.propostas.some(p => p.operacao.toLowerCase().includes('port')) && g.liberadoParaDigitador === true;
      if (isVendedora && !isSameSeller(g.vendedoraResponsavel, sellerName)) return false;

      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        g.clienteNome.toLowerCase().includes(term) ||
        g.clienteCpf.includes(term) ||
        g.propostas.some(p => p.banco.toLowerCase().includes(term) || p.numeroContrato.includes(term));
      const matchStatus = filterStatus === 'todos' || g.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [portabilidadeGrouped, refinGrouped, isDigitador, isVendedora, sellerName, searchTerm, filterStatus]);

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

    // Update status of all underlying alerts for this CPF of this type
    const cleanCpf = alertaParaAdiar.clienteCpf.replace(/\D/g, '');
    const affectedAlerts = alertas.filter(a => a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === alertaParaAdiar.tipo);

    if (affectedAlerts.length > 0) {
      affectedAlerts.forEach(a => {
        adiarAlerta(a.id, targetDateStr, a);
      });
    } else {
      adiarAlerta(alertaParaAdiar.id, targetDateStr, {
        clienteCpf: alertaParaAdiar.clienteCpf,
        clienteNome: alertaParaAdiar.clienteNome,
        clienteTelefone: alertaParaAdiar.clienteTelefone,
        tipo: alertaParaAdiar.tipo,
        vendedoraResponsavel: alertaParaAdiar.vendedoraResponsavel,
        status: 'nova',
        dataCriacao: new Date().toISOString().split('T')[0]
      });
    }

    setToastMessage(`Oportunidade de ${alertaParaAdiar.clienteNome} adiada para ${formatDate(targetDateStr)}. O registro foi ocultado e retornará automaticamente na data agendada.`);
    setAlertaParaAdiar(null);
    setDataAdiarCustom('');
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Ação de Produtividade 2: Executar Concluir
  const handleConfirmarConcluir = (fechouNovoContrato: boolean) => {
    if (!alertaParaConcluir) return;

    const cleanCpf = alertaParaConcluir.clienteCpf.replace(/\D/g, '');
    const affectedAlerts = alertas.filter(a => a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === alertaParaConcluir.tipo);

    if (affectedAlerts.length > 0) {
      affectedAlerts.forEach(a => {
        concluirAlerta(a.id, a);
      });
    } else {
      concluirAlerta(alertaParaConcluir.id, {
        clienteCpf: alertaParaConcluir.clienteCpf,
        clienteNome: alertaParaConcluir.clienteNome,
        clienteTelefone: alertaParaConcluir.clienteTelefone,
        tipo: alertaParaConcluir.tipo,
        vendedoraResponsavel: alertaParaConcluir.vendedoraResponsavel,
        status: 'nova',
        dataCriacao: new Date().toISOString().split('T')[0]
      });
    }

    if (fechouNovoContrato) {
      if (onConverterEmProposta) {
        const pseudoAlert: AlertaOportunidade = {
          id: alertaParaConcluir.id,
          clienteCpf: alertaParaConcluir.clienteCpf,
          clienteNome: alertaParaConcluir.clienteNome,
          clienteTelefone: alertaParaConcluir.clienteTelefone,
          tipo: alertaParaConcluir.tipo === 'todas' ? 'portabilidade' : alertaParaConcluir.tipo as any,
          motivo: `Convertido a partir de conclusão de oportunidade.`,
          vendedoraResponsavel: alertaParaConcluir.vendedoraResponsavel,
          status: 'convertida',
          dataCriacao: new Date().toISOString().split('T')[0]
        };
        onConverterEmProposta(pseudoAlert);
      }
      setToastMessage(`Oportunidade fechada com novo contrato! O cliente entrará no fluxo de Indicação em 3 a 7 dias.`);
    } else {
      setToastMessage(`Oportunidade marcada como concluída! O registro foi ocultado e retornará automaticamente quando se encaixar novamente nos critérios.`);
    }

    setAlertaParaConcluir(null);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Open Messaging Modal for Indication (Grouped)
  const handleOpenIndicationMessageGrouped = (alerta: GroupedOpportunity) => {
    const nomePrimeiro = alerta.clienteNome.split(' ')[0];
    const firstProposal = alerta.propostas[0];
    const opLabel = firstProposal ? firstProposal.operacao : 'crédito';
    const valLabel = firstProposal ? firstProposal.valorEmprestimo.toLocaleString('pt-BR') : '0,00';
    const bankLabel = firstProposal ? firstProposal.banco : 'banco';

    const msg = `Olá ${nomePrimeiro}, tudo bem? Aqui é ${currentUser?.name.split(' ')[0]} da Lívia Cred Saúde! 😄\n\nPassando para acompanhar o seu contrato de ${opLabel} de R$ ${valLabel} no ${bankLabel}, que foi concluído com sucesso recentemente!\n\nVocê tem algum amigo, colega de trabalho ou familiar que também esteja precisando de um empréstimo consignado ou redução de juros via portabilidade? Se você nos indicar e a pessoa fechar, preparamos uma gratificação especial de agradecimento para você! 🎁`;

    setWhatsappMsg(msg);
    setTargetContact({
      nome: alerta.clienteNome,
      telefone: alerta.clienteTelefone,
      cpf: alerta.clienteCpf,
      tipoTag: 'Pós-Venda & Indicação',
      alertaId: alerta.id
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

  // Open Messaging Modal for General Alert (Grouped)
  const handleOpenAlertaMessageGrouped = (alerta: GroupedOpportunity) => {
    const nomePrimeiro = alerta.clienteNome.split(' ')[0];
    let msg = '';

    if (alerta.tipo === 'portabilidade') {
      msg = `Olá ${nomePrimeiro}, tudo bem? Aqui é ${currentUser?.name.split(' ')[0]} da Lívia Cred Saúde. Identificamos em nosso sistema que seu contrato consignado já atingiu o prazo de mais de 1 ano para Portabilidade com redução da taxa de juros! Posso fazer uma simulação rápida sem compromisso?`;
    } else if (alerta.tipo === 'refin') {
      msg = `Olá ${nomePrimeiro}, como vai? Seu contrato consignado já completou a carência mínima para Refinanciamento liberando valor imediato na sua conta mantendo a mesma parcela mensal. Posso calcular o valor para você hoje?`;
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
        const cleanCpf = targetContact.cpf ? targetContact.cpf.replace(/\D/g, '') : '';
        const affectedAlerts = alertas.filter(a => a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === targetContact.tipoTag);
        if (affectedAlerts.length > 0) {
          affectedAlerts.forEach(a => {
            updateAlertaStatus(a.id, 'em_contato');
          });
        } else {
          updateAlertaStatus(targetContact.alertaId, 'em_contato');
        }
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
          <span>Portabilidade ({portabilidadeGrouped.length})</span>
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
          <span>Refinanciamento ({refinGrouped.length})</span>
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
          <span>Pedir Indicação (3 a 7d) ({indicacaoGrouped.length})</span>
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
          <span>Todas ({filteredAllGroupedAlertas.length})</span>
        </button>
      </div>

      {/* CATEGORY 1: PORTABILIDADE */}
      {activeCategory === 'portabilidade' && (
        <div className="space-y-3">
          {portabilidadeGrouped.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-800 dark:text-white">Nenhum lead de portabilidade pendente</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Contratos com mais de 1 ano aparecerão aqui automaticamente para contato.
              </p>
            </div>
          ) : (
            portabilidadeGrouped.map(alerta => (
              <div key={alerta.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div 
                    onClick={() => setSelectedTimelineClient({ clienteCpf: alerta.clienteCpf, clienteNome: alerta.clienteNome })}
                    className="min-w-0 space-y-0.5 cursor-pointer hover:opacity-85 transition"
                    title="Clique para ver a linha do tempo completa do cliente"
                  >
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300">
                      Portabilidade Elegível (+1 ano)
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="hover:underline">{alerta.clienteNome}</span>
                      <button
                        type="button"
                        onClick={(e) => handleVanguardClick(e, alerta.clienteCpf)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md transition"
                        title="Copiar CPF e abrir Vanguard"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Vanguard</span>
                      </button>
                    </h3>
                    <p className="text-xs text-slate-500">
                      CPF: {formatCPF(alerta.clienteCpf)} · Tel: {formatPhone(alerta.clienteTelefone)} · Vendedora: <strong>{alerta.vendedoraResponsavel}</strong>
                    </p>
                  </div>
                </div>

                {/* Proposals details listing instead of generic static reason text */}
                <div 
                  onClick={() => setSelectedTimelineClient({ clienteCpf: alerta.clienteCpf, clienteNome: alerta.clienteNome })}
                  className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition"
                  title="Clique para ver a linha do tempo completa do cliente"
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">
                    Propostas de Portabilidade deste Cliente:
                  </span>
                  <div className="space-y-1.5">
                    {alerta.propostas.map(p => (
                      <div key={p.id} className="text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-slate-100 dark:border-slate-850 last:border-0 last:pb-0">
                        <div>
                          <span className="font-extrabold text-[#0F5C63] dark:text-teal-400">{p.operacao}</span>
                          <span className="text-slate-400"> no </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{p.banco}</span>
                          <span className="text-slate-400"> (Contrato #{p.numeroContrato})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px]">
                            {p.mesesPagos} meses pagos
                          </span>
                          <span className="font-black text-slate-850 dark:text-slate-100">
                            {formatCurrency(p.valorEmprestimo)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

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
                      onClick={() => handleOpenAlertaMessageGrouped(alerta)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Oferecer no {msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Update status of all underlying alerts for this CPF
                        const cleanCpf = alerta.clienteCpf.replace(/\D/g, '');
                        const affectedAlerts = alertas.filter(a => a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === 'portabilidade');
                        affectedAlerts.forEach(a => {
                          updateAlertaStatus(a.id, 'convertida');
                        });
                        if (onConverterEmProposta) {
                          const pseudoAlert: AlertaOportunidade = {
                            id: alerta.id,
                            clienteCpf: alerta.clienteCpf,
                            clienteNome: alerta.clienteNome,
                            clienteTelefone: alerta.clienteTelefone,
                            tipo: 'portabilidade',
                            motivo: `Oportunidade de portabilidade convertida.`,
                            vendedoraResponsavel: alerta.vendedoraResponsavel,
                            status: 'convertida',
                            dataCriacao: todayStr
                          };
                          onConverterEmProposta(pseudoAlert);
                        }
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
              <strong>Ofertas de Refinanciamento:</strong> Contratos com carência mínima de <strong>6 meses</strong> de parcelas pagas, permitindo refinanciar mantendo o mesmo valor de parcela.
            </span>
          </div>

          {refinGrouped.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-800 dark:text-white">Nenhum contrato pendente de refinanciamento</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Contratos pagos há mais de 6 meses aparecerão aqui.
              </p>
            </div>
          ) : (
            refinGrouped.map(alerta => (
              <div key={alerta.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div 
                    onClick={() => setSelectedTimelineClient({ clienteCpf: alerta.clienteCpf, clienteNome: alerta.clienteNome })}
                    className="min-w-0 space-y-0.5 cursor-pointer hover:opacity-85 transition"
                    title="Clique para ver a linha do tempo completa do cliente"
                  >
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      Refinanciamento Disponível (+6 meses)
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="hover:underline">{alerta.clienteNome}</span>
                      <button
                        type="button"
                        onClick={(e) => handleVanguardClick(e, alerta.clienteCpf)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md transition"
                        title="Copiar CPF e abrir Vanguard"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Vanguard</span>
                      </button>
                    </h3>
                    <p className="text-xs text-slate-500">
                      CPF: {formatCPF(alerta.clienteCpf)} · Tel: {formatPhone(alerta.clienteTelefone)} · Vendedora: <strong>{alerta.vendedoraResponsavel}</strong>
                    </p>
                  </div>
                </div>

                {/* Proposals details listing instead of generic static reason text */}
                <div 
                  onClick={() => setSelectedTimelineClient({ clienteCpf: alerta.clienteCpf, clienteNome: alerta.clienteNome })}
                  className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition"
                  title="Clique para ver a linha do tempo completa do cliente"
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">
                    Propostas de Refinanciamento deste Cliente:
                  </span>
                  <div className="space-y-1.5">
                    {alerta.propostas.map(p => (
                      <div key={p.id} className="text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-slate-100 dark:border-slate-850 last:border-0 last:pb-0">
                        <div>
                          <span className="font-extrabold text-[#0F5C63] dark:text-teal-400">{p.operacao}</span>
                          <span className="text-slate-400"> no </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{p.banco}</span>
                          <span className="text-slate-400"> (Contrato #{p.numeroContrato})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px]">
                            {p.mesesPagos} meses pagos
                          </span>
                          <span className="font-black text-slate-850 dark:text-slate-100">
                            {formatCurrency(p.valorEmprestimo)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Productivity Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAlertaMessageGrouped(alerta)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Oferecer no {msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Update status of all underlying alerts for this CPF
                        const cleanCpf = alerta.clienteCpf.replace(/\D/g, '');
                        const affectedAlerts = alertas.filter(a => a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === 'refin');
                        affectedAlerts.forEach(a => {
                          updateAlertaStatus(a.id, 'convertida');
                        });
                        if (onConverterEmProposta) {
                          const pseudoAlert: AlertaOportunidade = {
                            id: alerta.id,
                            clienteCpf: alerta.clienteCpf,
                            clienteNome: alerta.clienteNome,
                            clienteTelefone: alerta.clienteTelefone,
                            tipo: 'refin',
                            motivo: `Oportunidade de refinanciamento convertida.`,
                            vendedoraResponsavel: alerta.vendedoraResponsavel,
                            status: 'convertida',
                            dataCriacao: todayStr
                          };
                          onConverterEmProposta(pseudoAlert);
                        }
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

          {indicacaoGrouped.length === 0 ? (
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
            indicacaoGrouped.map(alerta => (
              <div
                key={alerta.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-purple-200 dark:border-purple-900/60 shadow-xs hover:border-purple-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div 
                    onClick={() => setSelectedTimelineClient({ clienteCpf: alerta.clienteCpf, clienteNome: alerta.clienteNome })}
                    className="min-w-0 space-y-1 cursor-pointer hover:opacity-85 transition"
                    title="Clique para ver a linha do tempo completa do cliente"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300">
                        Janela de Indicação (3 a 7 dias)
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span className="hover:underline">{alerta.clienteNome}</span>
                      <button
                        type="button"
                        onClick={(e) => handleVanguardClick(e, alerta.clienteCpf)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md transition"
                        title="Copiar CPF e abrir Vanguard"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Vanguard</span>
                      </button>
                    </h3>

                    <p className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
                      <span>CPF: {formatCPF(alerta.clienteCpf)}</span>
                      <CPFValidationBadge cpf={alerta.clienteCpf} />
                      <span>· Tel: {formatPhone(alerta.clienteTelefone)} · Vendedora: <strong>{alerta.vendedoraResponsavel}</strong></span>
                    </p>
                  </div>

                  {alerta.valorPotencial > 0 && (
                    <div className="text-left sm:text-right bg-purple-50 dark:bg-purple-950/40 p-3 rounded-2xl border border-purple-200/80 dark:border-purple-800/80">
                      <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block font-bold">Valor Consolidado</span>
                      <span className="text-base font-black text-purple-900 dark:text-purple-100 tabular-nums">
                        {formatCurrency(alerta.valorPotencial)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Proposals list box */}
                <div 
                  onClick={() => setSelectedTimelineClient({ clienteCpf: alerta.clienteCpf, clienteNome: alerta.clienteNome })}
                  className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition"
                  title="Clique para ver a linha do tempo completa do cliente"
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">
                    Propostas Digitadas na Janela:
                  </span>
                  <div className="space-y-1.5">
                    {alerta.propostas.map(p => (
                      <div key={p.id} className="text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-slate-100 dark:border-slate-850 last:border-0 last:pb-0">
                        <div>
                          <span className="font-extrabold text-purple-700 dark:text-purple-400">{p.operacao}</span>
                          <span className="text-slate-400"> no </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{p.banco}</span>
                          <span className="text-slate-400"> (Contrato #{p.numeroContrato})</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                          <span>{formatCurrency(p.valorEmprestimo)}</span>
                        </div>
                      </div>
                    ))}
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
                      onClick={() => handleOpenIndicationMessageGrouped(alerta)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Pedir Indicação no {msgSettings.provider === 'digisac' ? 'DigiSac' : 'WhatsApp'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const cleanCpf = alerta.clienteCpf.replace(/\D/g, '');
                        const affectedAlerts = alertas.filter(a => a.clienteCpf.replace(/\D/g, '') === cleanCpf && a.tipo === 'proposta_parada');
                        affectedAlerts.forEach(a => {
                          updateAlertaStatus(a.id, 'convertida');
                        });
                        if (onConverterEmProposta) {
                          const pseudoAlert: AlertaOportunidade = {
                            id: alerta.id,
                            clienteCpf: alerta.clienteCpf,
                            clienteNome: alerta.clienteNome,
                            clienteTelefone: alerta.clienteTelefone,
                            tipo: 'proposta_parada',
                            motivo: `Oportunidade de indicação convertida.`,
                            vendedoraResponsavel: alerta.vendedoraResponsavel,
                            status: 'convertida',
                            dataCriacao: todayStr
                          };
                          onConverterEmProposta(pseudoAlert);
                        }
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
                      onClick={() => setAlertaParaAdiar(alerta)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                      title="Adiar contato de indicação"
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Adiar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAlertaParaConcluir(alerta)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 font-bold text-xs transition"
                      title="Marcar indicação como concluída"
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
              const clientProposals = getClientProposals(cliente.cpf);
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
                    <div 
                      onClick={() => setSelectedTimelineClient({ clienteCpf: cliente.cpf, clienteNome: cliente.nome })}
                      className="space-y-1 cursor-pointer hover:opacity-85 transition"
                      title="Clique para ver a linha do tempo completa do cliente"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                          bInfo.isToday ? 'bg-pink-500 text-white animate-pulse' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {bInfo.badgeLabel}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">{bInfo.dayMonth}</span>
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="hover:underline">{cliente.nome}</span>
                        <button
                          type="button"
                          onClick={(e) => handleVanguardClick(e, cliente.cpf)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md transition"
                          title="Copiar CPF e abrir Vanguard"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Vanguard</span>
                        </button>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Completando <strong className="text-teal-700 dark:text-teal-400">{bInfo.turningAge} anos</strong> · {cliente.convenioPrincipal}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300 flex items-center justify-center font-black text-lg border border-pink-200 dark:border-pink-800">
                      🎁
                    </div>
                  </div>

                  {/* Client active proposals display */}
                  {clientProposals.length > 0 && (
                    <div 
                      onClick={() => setSelectedTimelineClient({ clienteCpf: cliente.cpf, clienteNome: cliente.nome })}
                      className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition"
                      title="Clique para ver a linha do tempo completa do cliente"
                    >
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">
                        Contratos deste Aniversariante:
                      </span>
                      <div className="space-y-1">
                        {clientProposals.map(p => (
                          <div key={p.id} className="text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-1 pb-1 border-b border-slate-100 dark:border-slate-855 last:border-0 last:pb-0">
                            <span>{p.operacao} ({p.banco})</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {p.mesesPagos}m pagos · {formatCurrency(p.valorEmprestimo)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

          {filteredAllGroupedAlertas.map(alerta => (
            <div key={alerta.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div 
                  onClick={() => setSelectedTimelineClient({ clienteCpf: alerta.clienteCpf, clienteNome: alerta.clienteNome })}
                  className="space-y-0.5 cursor-pointer hover:opacity-85 transition"
                  title="Clique para ver a linha do tempo completa do cliente"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      Grupo Consolidado
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      alerta.status === 'nova' ? 'bg-amber-100 text-amber-900' :
                      alerta.status === 'em_contato' ? 'bg-blue-100 text-blue-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {alerta.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="hover:underline">{alerta.clienteNome}</span>
                    <button
                      type="button"
                      onClick={(e) => handleVanguardClick(e, alerta.clienteCpf)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md transition"
                      title="Copiar CPF e abrir Vanguard"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Vanguard</span>
                    </button>
                  </h3>
                  <p className="text-xs text-slate-400">
                    CPF: {formatCPF(alerta.clienteCpf)} · Tel: {formatPhone(alerta.clienteTelefone)}
                  </p>
                </div>
              </div>

              {/* Proposals details listing instead of generic static reason text */}
              <div 
                onClick={() => setSelectedTimelineClient({ clienteCpf: alerta.clienteCpf, clienteNome: alerta.clienteNome })}
                className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition"
                title="Clique para ver a linha do tempo completa do cliente"
              >
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">
                  Todas as Propostas Elegíveis deste Cliente:
                </span>
                <div className="space-y-1.5">
                  {alerta.propostas.map(p => (
                    <div key={p.id} className="text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-slate-100 dark:border-slate-850 last:border-0 last:pb-0">
                      <div>
                        <span className="font-extrabold text-[#0F5C63] dark:text-teal-400">{p.operacao}</span>
                        <span className="text-slate-400"> no </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{p.banco}</span>
                        <span className="text-slate-400"> (Contrato #{p.numeroContrato})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px]">
                          {p.mesesPagos} meses pagos
                        </span>
                        <span className="font-black text-slate-850 dark:text-slate-100">
                          {formatCurrency(p.valorEmprestimo)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Productivity Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAlertaMessageGrouped(alerta)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Disparar Mensagem</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const cleanCpf = alerta.clienteCpf.replace(/\D/g, '');
                      const affectedAlerts = alertas.filter(a => a.clienteCpf.replace(/\D/g, '') === cleanCpf);
                      affectedAlerts.forEach(a => {
                        updateAlertaStatus(a.id, 'convertida');
                      });
                      if (onConverterEmProposta) {
                        const pseudoAlert: AlertaOportunidade = {
                          id: alerta.id,
                          clienteCpf: alerta.clienteCpf,
                          clienteNome: alerta.clienteNome,
                          clienteTelefone: alerta.clienteTelefone,
                          tipo: 'portabilidade',
                          motivo: `Oportunidade convertida.`,
                          vendedoraResponsavel: alerta.vendedoraResponsavel,
                          status: 'convertida',
                          dataCriacao: todayStr
                        };
                        onConverterEmProposta(pseudoAlert);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
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
                <div className="space-y-3">
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
                    <div className="mt-1 text-[10px] text-slate-500 leading-normal">
                      Ex: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">liviacredsaude.digisac.io</code> (sem https://)
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      URL do Servidor do CRM (Backend API):
                    </label>
                    <input
                      type="url"
                      placeholder="https://sua-url-do-crm.run.app"
                      value={msgSettings.backendApiUrl || ''}
                      onChange={(e) => setMsgSettings({ ...msgSettings, backendApiUrl: e.target.value })}
                      className="w-full px-3 py-2 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                    <div className="mt-1 text-[10px] text-slate-500 leading-normal">
                      Preencher <strong>somente</strong> se estiver usando o CRM no GitHub Pages. Informe a URL principal do CRM (Cloud Run/AI Studio) contendo <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">https://</code>. Se rodar direto na URL principal, pode deixar em branco.
                    </div>
                  </div>
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

      {/* MODAL: CLIENT TIMELINE & DETAILED PROPOSALS */}
      {selectedTimelineClient && (() => {
        const cleanCpf = selectedTimelineClient.clienteCpf.replace(/\D/g, '');
        const clientObj = clientes.find(c => c.cpf.replace(/\D/g, '') === cleanCpf);
        const clientPropostas = propostas
          .filter(p => p.cpf.replace(/\D/g, '') === cleanCpf)
          .sort((a, b) => new Date(b.dataDigitacao).getTime() - new Date(a.dataDigitacao).getTime());
        const totalContratado = clientPropostas
          .filter(p => p.status === 'Paga')
          .reduce((acc, p) => acc + p.valorEmprestimo, 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>{selectedTimelineClient.clienteNome}</span>
                      <button
                        type="button"
                        onClick={(e) => handleVanguardClick(e, selectedTimelineClient.clienteCpf)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md transition"
                        title="Copiar CPF e abrir Vanguard"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Vanguard</span>
                      </button>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      {clientObj?.convenioPrincipal || 'Consignado'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 tabular-nums">
                    <span>CPF: <strong>{formatCPF(selectedTimelineClient.clienteCpf)}</strong></span>
                    {clientObj?.telefone && <span>Tel: {formatPhone(clientObj.telefone)}</span>}
                    {clientObj?.cidade && <span>{clientObj.cidade}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTimelineClient(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Financial History Overview (Without troco estimado) */}
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

              {/* Notes */}
              {clientObj?.observacoes && 
               clientObj.observacoes.trim() !== '' && 
               !clientObj.observacoes.toLowerCase().includes('cliente importado via planilha') && (
                <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs">
                  <span className="font-bold text-amber-800 dark:text-amber-300 font-extrabold">Observações de Atendimento:</span>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{clientObj.observacoes}</p>
                </div>
              )}

              {/* Visual Timeline of Proposals */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Linha do Tempo de Propostas ({clientPropostas.length})</span>
                </h4>

                {clientPropostas.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">Nenhuma proposta cadastrada para este CPF ainda.</p>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 max-h-[40vh] overflow-y-auto pr-1">
                    {clientPropostas.map((prop) => {
                      const diffDays = prop.dataPagamentoCliente || prop.dataDigitacao ? getDiffDays(prop.dataPagamentoCliente || prop.dataDigitacao) : 0;
                      const mesesPagos = Math.floor(diffDays / 30);
                      return (
                        <div key={prop.id} className="relative flex items-start gap-3 pl-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 text-white ${
                            prop.status === 'Paga' ? 'bg-emerald-500' :
                            prop.status === 'Cancelada' ? 'bg-rose-500' :
                            'bg-slate-400 text-slate-800'
                          }`}>
                            <Check className="w-3.5 h-3.5" />
                          </div>

                          <div className="flex-1 bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs font-extrabold text-[#0F5C63] dark:text-teal-400">
                                {prop.operacao} · {prop.banco}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                prop.status === 'Paga' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                prop.status === 'Cancelada' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                'bg-slate-100 text-slate-850 dark:text-slate-300'
                              }`}>
                                {prop.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400">Valor Operação:</span>
                                <p className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                                  {formatCurrency(prop.valorEmprestimo)}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400">Contrato:</span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={prop.numeroContrato}>
                                  #{prop.numeroContrato || '—'}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400">Tempo de Vigência:</span>
                                <p className="font-bold text-teal-800 dark:text-teal-300">
                                  {mesesPagos} meses pagos
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTimelineClient(null)}
                  className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition"
                >
                  Fechar Linha do Tempo
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
