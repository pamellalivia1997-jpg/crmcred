import React, { useState } from 'react';
import { X, CheckCircle2, Clock, History, AlertCircle, Edit3, ShieldAlert } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Proposta, StatusProposta } from '../../types';
import { formatCurrency, formatPercent, formatDate, formatCPF } from '../../utils/formatters';
import { CPFValidationBadge } from '../common/CPFValidationBadge';

interface Props {
  proposta: Proposta | null;
  onClose: () => void;
}

export const DetalhePropostaModal: React.FC<Props> = ({ proposta, onClose }) => {
  const { updateStatusProposta } = useCRM();
  const { currentUser, canEditProposal } = useAuth();

  const [novoStatus, setNovoStatus] = useState<StatusProposta>(proposta?.status || 'Em análise');
  const [motivo, setMotivo] = useState(proposta?.motivoCancelamento || '');
  const [showStatusEdit, setShowStatusEdit] = useState(false);

  if (!proposta) return null;

  const isEditable = canEditProposal(proposta);

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStatusProposta(proposta.id, novoStatus, motivo);
    setShowStatusEdit(false);
  };

  const statusColors = {
    'Em análise': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
    'Pendente': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
    'Aprovada': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300',
    'Paga': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
    'Cancelada': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300',
    'Reprovada': 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Contrato #{proposta.numeroContrato}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[proposta.status]}`}>
                {proposta.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
              <span>Cliente: {proposta.nomeCliente} · CPF: {formatCPF(proposta.cpf)}</span>
              <CPFValidationBadge cpf={proposta.cpf} />
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {/* Permission notice if cannot edit */}
          {!isEditable && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Visualização liberada. Você só pode alterar o status de propostas cadastradas por você ({proposta.vendedora}).
              </span>
            </div>
          )}

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

          {/* Details Table */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400">Operação:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{proposta.operacao}</p>
              </div>
              <div>
                <span className="text-slate-400">Promotora:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{proposta.promotora}</p>
              </div>
              <div>
                <span className="text-slate-400">Convênio:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{proposta.convenio}</p>
              </div>
              <div>
                <span className="text-slate-400">Data Digitação:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{formatDate(proposta.dataDigitacao)}</p>
              </div>
              <div>
                <span className="text-slate-400">Vendedora:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{proposta.vendedora}</p>
              </div>
              <div>
                <span className="text-slate-400">Digitador:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{proposta.digitador}</p>
              </div>
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

          {/* Status Change Form */}
          {isEditable && (
            <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  Atualizar Status da Proposta
                </span>
              </div>

              <form onSubmit={handleStatusSubmit} className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={novoStatus}
                    onChange={(e) => setNovoStatus(e.target.value as StatusProposta)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-slate-900 dark:text-white"
                  >
                    <option value="Em análise">Em análise</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Aprovada">Aprovada</option>
                    <option value="Paga">Paga</option>
                    <option value="Cancelada">Cancelada</option>
                    <option value="Reprovada">Reprovada</option>
                  </select>

                  {(novoStatus === 'Cancelada' || novoStatus === 'Reprovada') && (
                    <input
                      type="text"
                      placeholder="Motivo do cancelamento..."
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-rose-300 text-slate-900 dark:text-white"
                    />
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[#0F5C63] hover:bg-[#1B8A8F] text-white font-bold text-xs shadow-xs transition-all"
                  >
                    Confirmar Alteração
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* History of status changes (LGPD Audit compliance) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
              <History className="w-3.5 h-3.5" />
              Histórico de Alterações de Status
            </span>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {proposta.historicoStatus?.map((h, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white">{h.status}</span>
                    <span className="text-slate-400 ml-1.5">por {h.usuario}</span>
                    {h.motivo && <p className="text-rose-600 mt-0.5">{h.motivo}</p>}
                  </div>
                  <span className="text-slate-400 tabular-nums">{h.data}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-teal-600 text-white font-bold text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
