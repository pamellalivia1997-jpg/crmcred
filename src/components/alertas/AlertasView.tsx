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
  X
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { AlertaOportunidade } from '../../types';
import { formatCurrency, formatPhone, formatCPF } from '../../utils/formatters';

interface Props {
  onConverterEmProposta?: (alerta: AlertaOportunidade) => void;
}

export const AlertasView: React.FC<Props> = ({ onConverterEmProposta }) => {
  const { alertas, updateAlertaStatus } = useCRM();
  const { currentUser } = useAuth();

  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [whatsappModalAlerta, setWhatsappModalAlerta] = useState<AlertaOportunidade | null>(null);
  const [whatsappMsg, setWhatsappMsg] = useState('');

  const isVendedora = currentUser?.role === 'vendedora';

  // Filter alerts
  const filteredAlertas = useMemo(() => {
    return alertas.filter(a => {
      // If seller, show only her alerts
      const matchSeller = isVendedora ? a.vendedoraResponsavel === currentUser?.name : true;
      const matchTipo = filterTipo === 'todos' || a.tipo === filterTipo;
      const matchStatus = filterStatus === 'todos' || a.status === filterStatus;
      return matchSeller && matchTipo && matchStatus;
    });
  }, [alertas, isVendedora, currentUser, filterTipo, filterStatus]);

  // Conversion statistics
  const stats = useMemo(() => {
    const list = isVendedora
      ? alertas.filter(a => a.vendedoraResponsavel === currentUser?.name)
      : alertas;

    const total = list.length;
    const novas = list.filter(a => a.status === 'nova').length;
    const contatadas = list.filter(a => a.status === 'em_contato').length;
    const convertidas = list.filter(a => a.status === 'convertida').length;
    const potencialTotal = list.reduce((acc, a) => acc + (a.valorPotencial || 0), 0);
    const taxaConversao = total > 0 ? (convertidas / total) * 100 : 0;

    return { total, novas, contatadas, convertidas, potencialTotal, taxaConversao };
  }, [alertas, isVendedora, currentUser]);

  // Open WhatsApp template modal
  const handleOpenWhatsAppModal = (alerta: AlertaOportunidade) => {
    const nomePrimeiro = alerta.clienteNome.split(' ')[0];
    let msgPadrao = '';

    if (alerta.tipo === 'portabilidade') {
      msgPadrao = `Olá ${nomePrimeiro}, tudo bem? Aqui é ${currentUser?.name} da Lívia Cred Saúde. Verificamos em nosso sistema que seu contrato no convênio já atingiu o prazo para Portabilidade com redução da taxa e liberação de um excelente troco em dinheiro! Gostaria de uma simulação rápida sem compromisso?`;
    } else if (alerta.tipo === 'refin') {
      msgPadrao = `Olá ${nomePrimeiro}, como vai? Temos uma novidade ótima: seu contrato consignado já permite Refinanciamento liberando valor na sua conta mantendo a mesma parcela mensal. Posso calcular para você hoje?`;
    } else if (alerta.tipo === 'aniversario') {
      msgPadrao = `Parabéns, ${nomePrimeiro}! 🎉 Toda a equipe da Lívia Cred Saúde deseja muita saúde, paz e realizações no seu aniversário! Preparamos condições exclusivas de crédito caso precise de apoio em seus projetos neste novo ciclo.`;
    } else if (alerta.tipo === 'cartao_credito') {
      msgPadrao = `Olá ${nomePrimeiro}! Identificamos que você possui margem exclusiva para ativação do Cartão Benefício Consignado com saque imediato. É sem anuidade e sem consulta ao SPC/Serasa. Podemos emitir?`;
    } else {
      msgPadrao = `Olá ${nomePrimeiro}, tudo bem? Aqui é da Lívia Cred Saúde. Entramos em contato para verificar se podemos lhe ajudar com alguma simulação ou andamento de sua proposta.`;
    }

    setWhatsappMsg(msgPadrao);
    setWhatsappModalAlerta(alerta);
  };

  const handleSendWhatsApp = () => {
    if (!whatsappModalAlerta) return;
    const cleanPhone = whatsappModalAlerta.clienteTelefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
    updateAlertaStatus(whatsappModalAlerta.id, 'em_contato');
    setWhatsappModalAlerta(null);
  };

  const tipoIcons: Record<string, any> = {
    portabilidade: RefreshCw,
    refin: TrendingUp,
    cartao_credito: CreditCard,
    reativacao: Sparkles,
    aniversario: Cake,
    proposta_parada: Clock,
    taxa_pendente: AlertTriangle,
    meta_alerta: BellRing,
  };

  const tipoLabels: Record<string, string> = {
    portabilidade: 'Portabilidade Elegível',
    refin: 'Refinanciamento Disponível',
    cartao_credito: 'Cartão Benefício Livre',
    reativacao: 'Reativação de Cliente',
    aniversario: 'Aniversariante',
    proposta_parada: 'Proposta Parada',
    taxa_pendente: 'Taxa Pendente',
    meta_alerta: 'Alerta de Ritmo de Meta',
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BellRing className="w-6 h-6 text-amber-500" />
            <span>Motor de Oportunidades & Alertas Inteligentes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Geração automática de leads da carteira: clientes elegíveis para portabilidade, refin e reativação
          </p>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 w-fit">
          {stats.novas} Oportunidades Pendentes
        </span>
      </div>

      {/* Conversion KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total de Oportunidades</span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {stats.total}
          </p>
          <p className="text-[11px] text-slate-400">Identificadas pelo CRM</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Potencial Estimado</span>
          <p className="text-xl font-extrabold text-teal-700 dark:text-teal-400 tabular-nums mt-0.5">
            {formatCurrency(stats.potencialTotal)}
          </p>
          <p className="text-[11px] text-slate-400">Em novos contratos</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Em Contato / Follow-up</span>
          <p className="text-xl font-extrabold text-blue-600 tabular-nums mt-0.5">
            {stats.contatadas}
          </p>
          <p className="text-[11px] text-slate-400">Abordadas no WhatsApp</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Taxa de Conversão</span>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            {stats.taxaConversao.toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-400">{stats.convertidas} convertidas em venda</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilterTipo('todos')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              filterTipo === 'todos'
                ? 'bg-[#0F5C63] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Todos os Alertas
          </button>
          <button
            onClick={() => setFilterTipo('portabilidade')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              filterTipo === 'portabilidade'
                ? 'bg-[#0F5C63] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Portabilidade
          </button>
          <button
            onClick={() => setFilterTipo('refin')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              filterTipo === 'refin'
                ? 'bg-[#0F5C63] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Refin
          </button>
          <button
            onClick={() => setFilterTipo('cartao_credito')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              filterTipo === 'cartao_credito'
                ? 'bg-[#0F5C63] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Cartão de Crédito
          </button>
          <button
            onClick={() => setFilterTipo('aniversario')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              filterTipo === 'aniversario'
                ? 'bg-[#0F5C63] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Aniversários
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="todos">Todos</option>
            <option value="nova">Nova</option>
            <option value="em_contato">Em contato</option>
            <option value="convertida">Convertida</option>
            <option value="descartada">Descartada</option>
          </select>
        </div>
      </div>

      {/* Alerts Cards Feed */}
      <div className="space-y-3">
        {filteredAlertas.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              Nenhuma oportunidade pendente neste filtro
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Todos os clientes do filtro já foram atendidos ou convertidos.
            </p>
          </div>
        ) : (
          filteredAlertas.map((alerta) => {
            const Icon = tipoIcons[alerta.tipo] || BellRing;

            return (
              <div
                key={alerta.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#0F5C63] dark:text-[#28B0B7] flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {tipoLabels[alerta.tipo] || alerta.tipo}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          alerta.status === 'nova' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          alerta.status === 'em_contato' ? 'bg-blue-100 text-blue-800' :
                          alerta.status === 'convertida' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {alerta.status === 'nova' ? 'Nova' : alerta.status === 'em_contato' ? 'Em Contato' : alerta.status === 'convertida' ? 'Convertida' : 'Descartada'}
                        </span>
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                        {alerta.clienteNome}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        CPF: {formatCPF(alerta.clienteCpf)} · Tel: {formatPhone(alerta.clienteTelefone)} · Responsável: <strong>{alerta.vendedoraResponsavel}</strong>
                      </p>
                    </div>
                  </div>

                  {alerta.valorPotencial && (
                    <div className="sm:text-right shrink-0 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Potencial Liberado</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(alerta.valorPotencial)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Motivo do alerta */}
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 leading-relaxed">
                  {alerta.motivo}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    {/* Chamar no WhatsApp */}
                    <button
                      onClick={() => handleOpenWhatsAppModal(alerta)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Chamar no WhatsApp</span>
                    </button>

                    {/* Marcar como contatado */}
                    {alerta.status === 'nova' && (
                      <button
                        onClick={() => updateAlertaStatus(alerta.id, 'em_contato')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                      >
                        Marcar Contatado
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Converter em Proposta */}
                    {alerta.status !== 'convertida' && (
                      <button
                        onClick={() => {
                          updateAlertaStatus(alerta.id, 'convertida');
                          if (onConverterEmProposta) onConverterEmProposta(alerta);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all active:scale-95"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
                        <span>Converter em Proposta</span>
                      </button>
                    )}

                    {/* Descartar */}
                    {alerta.status !== 'descartada' && (
                      <button
                        onClick={() => updateAlertaStatus(alerta.id, 'descartada')}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Descartar oportunidade"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* WhatsApp Message Modal */}
      {whatsappModalAlerta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Mensagem WhatsApp Personalizada
                </h3>
              </div>
              <button
                onClick={() => setWhatsappModalAlerta(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">
                Destinatário: <strong>{whatsappModalAlerta.clienteNome}</strong> ({formatPhone(whatsappModalAlerta.clienteTelefone)})
              </p>
              <textarea
                rows={5}
                value={whatsappMsg}
                onChange={(e) => setWhatsappMsg(e.target.value)}
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setWhatsappModalAlerta(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendWhatsApp}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Abrir no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
