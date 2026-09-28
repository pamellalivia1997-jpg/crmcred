import React, { useState, useMemo } from 'react';
import { ShieldAlert, Search, Lock, User, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { formatCPF } from '../../utils/formatters';

export const AuditoriaView: React.FC = () => {
  const { auditLogs } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAcao, setFilterAcao] = useState('todas');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchSearch =
        log.usuarioNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.detalhes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.cpfCliente && log.cpfCliente.includes(searchTerm.replace(/\D/g, '')));

      const matchAcao = filterAcao === 'todas' || log.acao === filterAcao;
      return matchSearch && matchAcao;
    });
  }, [auditLogs, searchTerm, filterAcao]);

  const acaoBadges = {
    visualizou: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    criou: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    editou: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    alterou_status: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    excluiu: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-600" />
            <span>Trilha de Auditoria & Conformidade LGPD</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro imutável de todas as consultas de CPFs, visualizações e alterações em dados sensíveis de clientes
          </p>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 w-fit">
          {auditLogs.length} Registros Auditados
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-2 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por usuário, CPF ou detalhes do evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <select
          value={filterAcao}
          onChange={(e) => setFilterAcao(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
        >
          <option value="todas">Todas as Ações</option>
          <option value="visualizou">Visualização de CPF</option>
          <option value="criou">Criação</option>
          <option value="editou">Edição</option>
          <option value="alterou_status">Alteração de Status</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Data e Hora</th>
                <th className="py-2.5 px-3">Usuário Responsável</th>
                <th className="py-2.5 px-3">Ação</th>
                <th className="py-2.5 px-3">CPF Impactado</th>
                <th className="py-2.5 px-3">Descrição Detalhada do Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 tabular-nums text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{log.usuarioNome}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${acaoBadges[log.acao] || 'bg-slate-100 text-slate-700'}`}>
                      {log.acao.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {log.cpfCliente ? formatCPF(log.cpfCliente) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {log.detalhes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
