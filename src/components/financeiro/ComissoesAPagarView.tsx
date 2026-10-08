import React, { useState } from 'react';
import {
  Receipt,
  DollarSign,
  Calendar,
  CheckCircle2,
  Users,
  Building2,
  Calculator,
  ShieldCheck,
  Award
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';

export const ComissoesAPagarView: React.FC = () => {
  const { propostas, comissoesPromotoras } = useCRM();
  const { allUsers } = useAuth();

  const [activeTab, setActiveTab] = useState<'vendedoras' | 'digitador' | 'adm'>('vendedoras');

  // Next month calculation
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonthName = nextMonthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  // Filter sellers, digitadores, adm users
  const vendedoras = allUsers.filter(u => u.role === 'vendedora' && u.status === 'ativo');
  const digitadores = allUsers.filter(u => u.role === 'digitador' && u.status === 'ativo');
  const admUsers = allUsers.filter(u => (u.role === 'adm' || u.role === 'proprietaria' || u.role === 'financeiro') && u.status === 'ativo');

  return (
    <div className="space-y-5 pb-20 md:pb-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B2A4A] via-[#0F5C63] to-[#1B8A8F] p-5 sm:p-7 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-xs font-bold">
              <Receipt className="w-3.5 h-3.5" />
              <span>Previsão de Pagamentos & Comissões</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Comissões a Pagar ({nextMonthName})
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed max-w-xl">
              Consolidado financeiro e projeções de comissões calculadas para o fechamento do próximo mês para Vendedoras, Digitadores e ADM.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20">
            <Calendar className="w-5 h-5 text-emerald-300" />
            <div>
              <span className="text-[10px] text-teal-200 uppercase font-bold block">Competência</span>
              <span className="text-sm font-extrabold capitalize">{nextMonthName}</span>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl w-fit shadow-xs">
        <button
          onClick={() => setActiveTab('vendedoras')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'vendedoras'
              ? 'bg-[#0F5C63] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Vendedoras ({vendedoras.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('digitador')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'digitador'
              ? 'bg-[#0F5C63] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Digitadoras ({digitadores.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('adm')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'adm'
              ? 'bg-[#0F5C63] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>ADM & Gerência ({admUsers.length})</span>
        </button>
      </div>

      {/* Content Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white capitalize">
              Comissões Projetadas · {activeTab}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Valores calculados com base nas metas e propostas pagas do ciclo anterior para pagamento em {nextMonthName}.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Colaborador(a)</th>
                <th className="py-2.5 px-3">Cargo / Perfil</th>
                <th className="py-2.5 px-3">Propostas Pagas</th>
                <th className="py-2.5 px-3">Volume Produzido</th>
                <th className="py-2.5 px-3 text-right">Comissão Projetada (Próx. Mês)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {activeTab === 'vendedoras' && vendedoras.map(u => {
                const props = propostas.filter(p => p.vendedora === u.name && p.status === 'Paga');
                const volume = props.reduce((acc, p) => acc + p.valorEmprestimo, 0);
                const comissaoEst = volume * 0.015; // Projeção preliminar
                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{u.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        Vendedora
                      </span>
                    </td>
                    <td className="py-3 px-3 tabular-nums">{props.length} contratos</td>
                    <td className="py-3 px-3 tabular-nums font-bold text-slate-800 dark:text-slate-200">{formatCurrency(volume)}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(comissaoEst)}
                    </td>
                  </tr>
                );
              })}

              {activeTab === 'digitador' && digitadores.map(u => {
                const props = propostas.filter(p => p.digitador === u.name);
                const volume = props.reduce((acc, p) => acc + p.valorEmprestimo, 0);
                const comissaoEst = props.length * 25; // Exemplo de taxa por digitação
                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{u.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                        Digitadora
                      </span>
                    </td>
                    <td className="py-3 px-3 tabular-nums">{props.length} digitadas</td>
                    <td className="py-3 px-3 tabular-nums font-bold text-slate-800 dark:text-slate-200">{formatCurrency(volume)}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(comissaoEst)}
                    </td>
                  </tr>
                );
              })}

              {activeTab === 'adm' && admUsers.map(u => {
                const volumeTotal = propostas.filter(p => p.status === 'Paga').reduce((acc, p) => acc + p.valorEmprestimo, 0);
                const comissaoEst = volumeTotal * 0.005;
                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{u.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 tabular-nums">Consolidado Geral</td>
                    <td className="py-3 px-3 tabular-nums font-bold text-slate-800 dark:text-slate-200">{formatCurrency(volumeTotal)}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(comissaoEst)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
