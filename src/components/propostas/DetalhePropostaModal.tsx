import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  ShieldAlert,
  Pencil,
  Save,
  Check,
  AlertCircle,
  FileText,
  Building2,
  Calendar,
  User,
  CreditCard,
  DollarSign,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import {
  Proposta,
  StatusProposta,
  Convenio,
  Operacao,
  Banco,
  Promotora
} from '../../types';
import { formatCurrency, formatPercent, formatDate, formatCPF } from '../../utils/formatters';
import { CPFValidationBadge } from '../common/CPFValidationBadge';

interface Props {
  proposta: Proposta | null;
  onClose: () => void;
  onProposalUpdated?: (updated: Proposta) => void;
}

const CONVENIOS_LIST: Convenio[] = [
  'INSS',
  'SIAPE',
  'Prefeitura de Igarassu',
  'Prefeitura do Recife',
  'Governo de PE',
  'FGTS',
  'Forças Armadas',
  'Outros'
];

const OPERACOES_LIST: Operacao[] = [
  'FGTS',
  'Saque Complementar',
  'Refin',
  'Conta de Energia Elétrica/Luz',
  'Portabilidade',
  'Refin da Port',
  'Margem',
  'Cartão Novo',
  'Credcesta',
  'Cartão de Crédito',
  'Crédito do Trabalhador',
  'Pessoal'
];

const BANCOS_LIST: Banco[] = [
  'Banco Pan',
  'C6 Consig',
  'Santander',
  'Itaú Consig',
  'Daycoval',
  'Facta',
  'Master',
  'BMG',
  'Mercantil',
  'Safra',
  'Bradesco',
  'Outro'
];

const PROMOTORAS_LIST: Promotora[] = [
  'J2 Promotora',
  'Sempre',
  'DG',
  'GFT',
  'Direto Banco',
  'Outra'
];

export const DetalhePropostaModal: React.FC<Props> = ({ proposta: initialProposta, onClose, onProposalUpdated }) => {
  const { saveProposta, deleteProposta, propostas } = useCRM();
  const { currentUser, canEditProposal, allUsers } = useAuth();

  // Keep proposta up-to-date from context if it changes
  const proposta = propostas.find(p => p.id === initialProposta?.id) || initialProposta;

  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    numeroContrato: '',
    status: 'Em análise' as StatusProposta,
    nomeCliente: '',
    cpf: '',
    valorEmprestimo: 0,
    valorTaxa: 0,
    percentualTaxa: 0,
    banco: 'Banco Pan' as Banco,
    operacao: 'Portabilidade' as Operacao,
    promotora: 'J2 Promotora' as Promotora,
    convenio: 'INSS' as Convenio,
    vendedora: '',
    digitador: '',
    dataDigitacao: '',
    dataPagamentoCliente: '',
    motivoCancelamento: '',
    observacoes: '',
    linkDocumento: ''
  });

  // Sync state when proposta changes or when opening edit mode
  useEffect(() => {
    if (proposta) {
      setFormData({
        numeroContrato: proposta.numeroContrato || '',
        status: proposta.status || 'Em análise',
        nomeCliente: proposta.nomeCliente || '',
        cpf: proposta.cpf || '',
        valorEmprestimo: proposta.valorEmprestimo || 0,
        valorTaxa: proposta.valorTaxa || 0,
        percentualTaxa: proposta.percentualTaxa || 0,
        banco: proposta.banco || 'Banco Pan',
        operacao: proposta.operacao || 'Portabilidade',
        promotora: proposta.promotora || 'J2 Promotora',
        convenio: proposta.convenio || 'INSS',
        vendedora: proposta.vendedora || '',
        digitador: proposta.digitador || '',
        dataDigitacao: proposta.dataDigitacao || '',
        dataPagamentoCliente: proposta.dataPagamentoCliente || '',
        motivoCancelamento: proposta.motivoCancelamento || '',
        observacoes: proposta.observacoes || '',
        linkDocumento: proposta.linkDocumento || ''
      });
      setIsEditing(false);
      setSaveSuccessNotice(false);
    }
  }, [proposta?.id]);

  if (!proposta) return null;

  const isEditable = canEditProposal(proposta);

  // Auto calculate tax percent when loan or fee change
  const handleLoanChange = (val: number) => {
    const loan = Math.max(0, val);
    const pct = loan > 0 ? Number(((formData.valorTaxa / loan) * 100).toFixed(1)) : 0;
    setFormData(prev => ({
      ...prev,
      valorEmprestimo: loan,
      percentualTaxa: pct
    }));
  };

  const handleFeeChange = (val: number) => {
    const fee = Math.max(0, val);
    const pct = formData.valorEmprestimo > 0 ? Number(((fee / formData.valorEmprestimo) * 100).toFixed(1)) : 0;
    setFormData(prev => ({
      ...prev,
      valorTaxa: fee,
      percentualTaxa: pct
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposta) return;

    // Detect all changed fields for LGPD Audit Log
    const changes: string[] = [];

    if (formData.numeroContrato !== proposta.numeroContrato) {
      changes.push(`Contrato: "${proposta.numeroContrato}" ➔ "${formData.numeroContrato}"`);
    }
    if (formData.status !== proposta.status) {
      changes.push(`Status: "${proposta.status}" ➔ "${formData.status}"`);
    }
    if (formData.valorEmprestimo !== proposta.valorEmprestimo) {
      changes.push(`Valor Venda: ${formatCurrency(proposta.valorEmprestimo)} ➔ ${formatCurrency(formData.valorEmprestimo)}`);
    }
    if (formData.valorTaxa !== proposta.valorTaxa) {
      changes.push(`Taxa: ${formatCurrency(proposta.valorTaxa)} ➔ ${formatCurrency(formData.valorTaxa)}`);
    }
    if (formData.banco !== proposta.banco) {
      changes.push(`Banco: "${proposta.banco}" ➔ "${formData.banco}"`);
    }
    if (formData.operacao !== proposta.operacao) {
      changes.push(`Operação: "${proposta.operacao}" ➔ "${formData.operacao}"`);
    }
    if (formData.promotora !== proposta.promotora) {
      changes.push(`Promotora: "${proposta.promotora}" ➔ "${formData.promotora}"`);
    }
    if (formData.convenio !== proposta.convenio) {
      changes.push(`Convênio: "${proposta.convenio}" ➔ "${formData.convenio}"`);
    }
    if (formData.vendedora !== proposta.vendedora) {
      changes.push(`Vendedora: "${proposta.vendedora}" ➔ "${formData.vendedora}"`);
    }
    if (formData.digitador !== proposta.digitador) {
      changes.push(`Digitador: "${proposta.digitador}" ➔ "${formData.digitador}"`);
    }
    if (formData.nomeCliente !== proposta.nomeCliente) {
      changes.push(`Cliente: "${proposta.nomeCliente}" ➔ "${formData.nomeCliente}"`);
    }
    if (formData.cpf.replace(/\D/g, '') !== proposta.cpf.replace(/\D/g, '')) {
      changes.push(`CPF: "${proposta.cpf}" ➔ "${formData.cpf}"`);
    }
    if (formData.dataDigitacao !== proposta.dataDigitacao) {
      changes.push(`Data Digitação: "${proposta.dataDigitacao}" ➔ "${formData.dataDigitacao}"`);
    }
    if (formData.dataPagamentoCliente !== (proposta.dataPagamentoCliente || '')) {
      changes.push(`Data Pagamento: "${proposta.dataPagamentoCliente || '—'}" ➔ "${formData.dataPagamentoCliente || '—'}"`);
    }
    if (formData.motivoCancelamento !== (proposta.motivoCancelamento || '')) {
      changes.push(`Motivo: "${proposta.motivoCancelamento || '—'}" ➔ "${formData.motivoCancelamento || '—'}"`);
    }
    if (formData.observacoes !== (proposta.observacoes || '')) {
      changes.push(`Observações atualizadas`);
    }

    if (changes.length === 0) {
      setIsEditing(false);
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const actorName = currentUser?.name || 'Administrador';

    // If was simulation and now has loan amount and complete info, convert to formal proposal
    const wasSimulacao = Boolean(proposta.isSimulacao);
    const isNowFinalProposal = formData.valorEmprestimo > 0 && formData.numeroContrato.trim().length > 0;
    const shouldConvertToOfficialProposal = wasSimulacao && isNowFinalProposal;

    if (shouldConvertToOfficialProposal) {
      changes.unshift(`Transformada de Simulação para Proposta Oficial por ${actorName}`);
    }

    const newHistoryItem = {
      status: formData.status,
      data: nowStr,
      usuario: actorName,
      motivo: changes.join(' | ')
    };

    const isPaid = formData.status === 'Paga';

    const updatedProposta: Proposta = {
      ...proposta,
      isSimulacao: shouldConvertToOfficialProposal ? false : (formData.valorEmprestimo > 0 ? false : proposta.isSimulacao),
      origemSimulacao: proposta.origemSimulacao ?? wasSimulacao,
      simulacaoPor: proposta.simulacaoPor || (wasSimulacao ? (proposta.digitador || 'Ana Paula') : undefined),
      dataSimulacao: proposta.dataSimulacao || (wasSimulacao ? (proposta.carimboDataHora || nowStr) : undefined),
      numeroContrato: formData.numeroContrato.trim(),
      status: formData.status,
      nomeCliente: formData.nomeCliente.trim(),
      cpf: formData.cpf.replace(/\D/g, ''),
      valorEmprestimo: formData.valorEmprestimo,
      valorTaxa: formData.valorTaxa,
      percentualTaxa: formData.percentualTaxa,
      taxaPaga: isPaid ? true : proposta.taxaPaga,
      clientePagouTaxa: isPaid ? true : proposta.clientePagouTaxa,
      banco: formData.banco,
      operacao: formData.operacao,
      promotora: formData.promotora,
      convenio: formData.convenio,
      vendedora: formData.vendedora.trim() || proposta.vendedora,
      digitador: formData.digitador.trim() || proposta.digitador,
      dataDigitacao: formData.dataDigitacao || proposta.dataDigitacao,
      dataPagamentoCliente: isPaid ? (formData.dataPagamentoCliente || nowStr.split(' ')[0]) : formData.dataPagamentoCliente,
      motivoCancelamento: formData.motivoCancelamento.trim(),
      observacoes: formData.observacoes.trim(),
      linkDocumento: formData.linkDocumento.trim(),
      historicoStatus: [newHistoryItem, ...(proposta.historicoStatus || [])]
    };

    saveProposta(updatedProposta);

    if (onProposalUpdated) {
      onProposalUpdated(updatedProposta);
    }

    setIsEditing(false);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 4000);
  };

  const statusColors = {
    'Simuladas': 'bg-slate-100 text-slate-700 border-slate-300',
    'Em análise': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
    'Paga': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
    'Cancelada': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                Contrato #{proposta.numeroContrato || 'Sem número'}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[proposta.status as keyof typeof statusColors] || 'bg-slate-100'}`}>
                {proposta.status}
              </span>
              {proposta.isSimulacao && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300">
                  Simulação
                </span>
              )}
              {proposta.origemSimulacao && !proposta.isSimulacao && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  ✨ Originada de Simulação ({proposta.simulacaoPor || 'Ana Paula'})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{proposta.nomeCliente}</span>
              <span>· CPF: {formatCPF(proposta.cpf)}</span>
              <CPFValidationBadge cpf={proposta.cpf} />
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isEditable && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                title="Editar todos os dados da proposta"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/50 dark:hover:text-teal-300 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all border border-slate-200/80 dark:border-slate-700"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {saveSuccessNotice && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-4 py-2.5 flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-in fade-in duration-150">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Proposta e histórico de alterações salvos com sucesso!</span>
          </div>
        )}

        {/* Permission notice if cannot edit */}
        {!isEditable && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center gap-2 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Visualização liberada. Você só pode alterar propostas cadastradas por você ({proposta.vendedora}).
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {isEditing ? (
            /* ================= EDIT MODE FORM ================= */
            <form id="edit-proposta-form" onSubmit={handleSave} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800 flex items-center justify-between">
                <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5 text-xs">
                  <Pencil className="w-3.5 h-3.5" />
                  Edição Geral da Proposta (Todas as alterações geram log de auditoria)
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              {/* Status & Contract Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Número do Contrato / Proposta
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.numeroContrato}
                    onChange={e => setFormData({ ...formData, numeroContrato: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status da Proposta
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as StatusProposta })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Simuladas">Simuladas</option>
                    <option value="Em análise">Em análise</option>
                    <option value="Paga">Paga</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Reason if cancelled/rejected */}
              {(formData.status === 'Cancelada') && (
                <div>
                  <label className="block text-[11px] font-bold text-rose-700 dark:text-rose-400 mb-1">
                    Motivo de Cancelamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Margem insuficiente / Cliente desistiu"
                    value={formData.motivoCancelamento}
                    onChange={e => setFormData({ ...formData, motivoCancelamento: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              )}

              {/* Financials (Valor Venda & Taxa) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                  Valores Financeiros
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Valor da Venda (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.valorEmprestimo}
                      onChange={e => handleLoanChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Taxa Cobrada (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valorTaxa}
                      onChange={e => handleFeeChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-amber-700 dark:text-amber-400 font-extrabold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      % Taxa Extra
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.percentualTaxa}
                      onChange={e => setFormData({ ...formData, percentualTaxa: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bank, Operation, Promoter, Convenio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Banco Parceiro
                  </label>
                  <select
                    value={formData.banco}
                    onChange={e => setFormData({ ...formData, banco: e.target.value as Banco })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  >
                    {BANCOS_LIST.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Operação
                  </label>
                  <select
                    value={formData.operacao}
                    onChange={e => setFormData({ ...formData, operacao: e.target.value as Operacao })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  >
                    {OPERACOES_LIST.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Promotora
                  </label>
                  <select
                    value={formData.promotora}
                    onChange={e => setFormData({ ...formData, promotora: e.target.value as Promotora })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  >
                    {PROMOTORAS_LIST.map(pr => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Convênio
                  </label>
                  <select
                    value={formData.convenio}
                    onChange={e => setFormData({ ...formData, convenio: e.target.value as Convenio })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  >
                    {CONVENIOS_LIST.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Responsible Seller & Typist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vendedora Responsável *
                  </label>
                  <select
                    value={formData.vendedora}
                    onChange={e => setFormData({ ...formData, vendedora: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold"
                  >
                    <option value="">Selecione a Vendedora...</option>
                    {allUsers
                      .filter(u => u.role === 'vendedora' && u.status === 'ativo')
                      .map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    <option value="Loja Igarassu">Loja Igarassu (Balcão)</option>
                    <option value="Outros">Outros</option>
                    {formData.vendedora && !allUsers.some(u => u.name === formData.vendedora) && formData.vendedora !== 'Loja Igarassu' && formData.vendedora !== 'Outros' && (
                      <option value={formData.vendedora}>{formData.vendedora}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Digitador(a) do Atendimento *
                  </label>
                  <select
                    value={formData.digitador}
                    onChange={e => setFormData({ ...formData, digitador: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold"
                  >
                    <option value="">Selecione o Digitador...</option>
                    {allUsers
                      .filter(u => u.status === 'ativo' && (u.role === 'digitador' || u.role === 'vendedora'))
                      .map(u => (
                        <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                      ))}
                    {formData.digitador && !allUsers.some(u => u.name === formData.digitador) && (
                      <option value={formData.digitador}>{formData.digitador}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Digitação
                  </label>
                  <input
                    type="date"
                    value={formData.dataDigitacao}
                    onChange={e => setFormData({ ...formData, dataDigitacao: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Pagamento ao Cliente
                  </label>
                  <input
                    type="date"
                    value={formData.dataPagamentoCliente}
                    onChange={e => setFormData({ ...formData, dataPagamentoCliente: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Client Name & CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nomeCliente}
                    onChange={e => setFormData({ ...formData, nomeCliente: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CPF do Cliente
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cpf}
                    onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Link do Documento no Drive */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Link do Documento no Drive
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.linkDocumento}
                  onChange={e => setFormData({ ...formData, linkDocumento: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Observacoes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações Internas
                </label>
                <textarea
                  rows={2}
                  value={formData.observacoes}
                  onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais da proposta..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] active:scale-98 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-900/10 transition-all"
                >
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </button>
              </div>
            </form>
          ) : (
            /* ================= VIEW MODE ================= */
            <>
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Valor da Venda</span>
                  <p className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {formatCurrency(proposta.valorEmprestimo)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Taxa Arrecadada</span>
                  <p className="text-base font-extrabold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                    {formatCurrency(proposta.valorTaxa)} ({proposta.percentualTaxa}%)
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Banco Parceiro</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {proposta.banco}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 text-[11px]">Operação:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{proposta.operacao}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Promotora:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{proposta.promotora}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Convênio:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{proposta.convenio}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Data Digitação:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{formatDate(proposta.dataDigitacao)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Data Pagamento:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {proposta.dataPagamentoCliente ? formatDate(proposta.dataPagamentoCliente) : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Vendedora:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{proposta.vendedora}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Digitador:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{proposta.digitador}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Taxa Paga:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {proposta.taxaPaga ? 'Sim (Quitada)' : 'Pendente'}
                    </p>
                  </div>
                  {proposta.linkDocumento && (
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-slate-400 text-[11px] block">Documento no Drive:</span>
                      <a
                        href={proposta.linkDocumento.startsWith('http') ? proposta.linkDocumento : `https://${proposta.linkDocumento}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 hover:underline mt-1 text-xs bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-900/60"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Abrir Documento no Drive</span>
                      </a>
                    </div>
                  )}
                  {!proposta.linkDocumento && (
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-slate-400 text-[11px] block">Documento no Drive:</span>
                      <span className="text-slate-400 italic text-xs">Nenhum link adicionado. Clique em "Editar Tudo" para anexar o link.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Observacoes */}
              {proposta.observacoes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Observações:</span>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{proposta.observacoes}</p>
                </div>
              )}

              {/* Motivo Cancelamento */}
              {proposta.motivoCancelamento && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                  <span className="font-bold">Motivo de Cancelamento / Reprovação:</span>
                  <p className="mt-0.5">{proposta.motivoCancelamento}</p>
                </div>
              )}
            </>
          )}

          {/* History of status changes & audit logs (LGPD Audit compliance) */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-teal-600" />
                Histórico de Alterações & Auditoria (LGPD)
              </span>
              <span className="text-[10px] text-slate-400">
                {proposta.historicoStatus?.length || 0} registros
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {proposta.historicoStatus && proposta.historicoStatus.length > 0 ? (
                proposta.historicoStatus.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 dark:text-white">{h.status}</span>
                        <span className="text-slate-500 dark:text-slate-400">· alterado por <strong className="text-slate-700 dark:text-slate-200">{h.usuario}</strong></span>
                      </div>
                      <span className="text-slate-400 tabular-nums text-[10px] shrink-0">{h.data}</span>
                    </div>
                    {h.motivo && (
                      <p className="text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-1.5 rounded-lg text-[10px] border border-slate-100 dark:border-slate-800 leading-relaxed font-mono">
                        {h.motivo}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic text-[11px] p-2 text-center">Nenhuma alteração registrada até o momento.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div className="text-[11px] text-slate-400">
            ID: <span className="font-mono">{proposta.id}</span>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/80 p-1.5 rounded-xl border border-rose-200 dark:border-rose-800">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 px-1">Excluir permanentemente?</span>
                  <button
                    type="button"
                    onClick={() => {
                      deleteProposta(proposta.id);
                      onClose();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 border border-rose-200 dark:border-rose-800 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Proposta</span>
                </button>
              )
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-bold text-xs shadow-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
