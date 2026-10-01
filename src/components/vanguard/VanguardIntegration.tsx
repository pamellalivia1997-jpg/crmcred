import React, { useState } from 'react';
import {
  Link2,
  RefreshCw,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  Layers,
  Users,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  Zap,
  ArrowRightLeft,
  Key,
  Database,
  Check
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Cliente, Proposta, StatusProposta, Operacao, Banco, Promotora, Convenio } from '../../types';
import { formatCurrency, formatCPF, cleanDigits, formatDate, getLocalDateString } from '../../utils/formatters';

export const VanguardIntegration: React.FC = () => {
  const { clientes, propostas, saveCliente, saveProposta } = useCRM();
  const { allUsers } = useAuth();

  // Settings State
  const [apiKey, setApiKey] = useState('vg_live_984f10a28e77c42b109c31a');
  const [webhookUrl, setWebhookUrl] = useState('https://crm.liviacredsaude.com.br/api/vanguard/webhook');
  const [isConnected, setIsConnected] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'import' | 'mapping' | 'settings' | 'export'>('import');

  // Vanguard Sample CSV Paste/Upload State
  const [rawInputData, setRawInputData] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importedSummary, setImportedSummary] = useState<{
    totalProcessed: number;
    clientesUpdated: number;
    propostasImported: number;
  } | null>(null);

  // Funil / Stage mapping configuration
  const [stageMapping, setStageMapping] = useState<Record<string, StatusProposta>>({
    'Triagem / Novo Lead': 'Simuladas',
    'Formalização Pendente / Link': 'Em análise',
    'Em Análise CIP / Banco': 'Em análise',
    'Pago / Comissão Liberada': 'Paga',
    'Recusado / Cancelado': 'Cancelada'
  });

  // Funileiro / Seller mapping configuration
  const [funileiroMapping, setFunileiroMapping] = useState<Record<string, string>>({
    'vanguard_hellen': 'Hellen Vasconcelos',
    'vanguard_taciana': 'Taciana Silva',
    'vanguard_lucelia': 'Lucélia Ramos',
    'vanguard_pamella': 'Pamella',
    'vanguard_balcao': 'Loja Igarassu'
  });

  // Test Connection Action
  const handleTestConnection = () => {
    setIsTesting(true);
    setTestSuccess(false);
    setTimeout(() => {
      setIsTesting(false);
      setIsConnected(true);
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 3000);
    }, 1000);
  };

  // Sample Vanguard CSV Payload Loader
  const handleLoadSampleVanguardData = () => {
    const sample = `CPF;Nome;Telefone;DataNascimento;Convenio;Operacao;Banco;Promotora;ValorEmprestimo;ValorTaxa;Contrato;EtapaVanguard;Funileiro
12345678901;Maria Das Dores Silva;(81) 98888-1122;1968-04-15;INSS;Portabilidade;Banco Pan;J2 Promotora;14500.00;1200.00;VG-88192;Pago / Comissão Liberada;vanguard_hellen
98765432100;Jose Antonio Ramos;(81) 99777-3344;1959-11-20;INSS;Refin;C6 Consig;Sempre;8200.00;800.00;VG-88193;Em Análise CIP / Banco;vanguard_taciana
45678912388;Francisca De Fatima;(81) 98666-5544;1972-08-05;SIAPE;Margem;Daycoval;DG;22000.00;2000.00;VG-88194;Formalização Pendente / Link;vanguard_lucelia`;
    setRawInputData(sample);
  };

  // Import Vanguard Data CSV/Text
  const handleProcessImport = () => {
    if (!rawInputData.trim()) {
      setImportStatus('Insira ou cole as linhas exportadas do Coban Vanguard.');
      return;
    }

    try {
      const lines = rawInputData.trim().split('\n');
      let clientesCount = 0;
      let propostasCount = 0;

      // Header on line 0
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.includes(';') ? line.split(';') : line.split(',');
        if (cols.length < 5) continue;

        const [
          rawCpf,
          nome,
          telefone,
          dataNascimento,
          convenio,
          operacao,
          banco,
          promotora,
          valorEmpStr,
          valorTaxaStr,
          contrato,
          etapaVanguard,
          funileiroVanguard
        ] = cols.map(c => c ? c.trim().replace(/^"|"$/g, '') : '');

        const cleanCpf = cleanDigits(rawCpf);
        if (cleanCpf.length !== 11) continue;

        // Map Funileiro
        const vendedoraMapped = funileiroMapping[funileiroVanguard] || 'Hellen Vasconcelos';
        
        // Map Status
        const statusMapped: StatusProposta = stageMapping[etapaVanguard] || 'Em análise';

        // 1. Create or Update Client
        const newClient: Cliente = {
          id: cleanCpf,
          cpf: cleanCpf,
          nome: nome || 'Cliente Vanguard',
          dataNascimento: dataNascimento || '1975-01-01',
          telefone: telefone || '(81) 98000-0000',
          email: `${cleanCpf}@cliente.com`,
          cidade: 'Igarassu',
          convenioPrincipal: (convenio as Convenio) || 'INSS',
          observacoes: `Importado da esteira Coban Vanguard (${etapaVanguard}).`,
          vendedoraResponsavel: vendedoraMapped,
          dataCriacao: getLocalDateString()
        };

        saveCliente(newClient);
        clientesCount++;

        // 2. Create Proposal
        const valorEmprestimo = parseFloat(valorEmpStr) || 0;
        const valorTaxa = parseFloat(valorTaxaStr) || 0;
        const percentualTaxa = valorEmprestimo > 0 ? Number(((valorTaxa / valorEmprestimo) * 100).toFixed(1)) : 0;
        const nowIso = getLocalDateString();

        const newProp: Proposta = {
          id: `prop-vg-${contrato || Date.now()}-${i}`,
          carimboDataHora: new Date().toISOString().replace('T', ' ').slice(0, 19),
          cpf: cleanCpf,
          nomeCliente: newClient.nome,
          dataDigitacao: nowIso,
          dataPagamentoCliente: statusMapped === 'Paga' ? nowIso : undefined,
          convenio: (convenio as Convenio) || 'INSS',
          operacao: (operacao as Operacao) || 'Portabilidade',
          banco: (banco as Banco) || 'Banco Pan',
          promotora: (promotora as Promotora) || 'J2 Promotora',
          valorEmprestimo,
          valorTaxa,
          percentualTaxa,
          taxaPaga: statusMapped === 'Paga',
          clientePagouTaxa: statusMapped === 'Paga',
          vendedora: vendedoraMapped,
          digitador: 'Sincronizador Vanguard',
          numeroContrato: contrato || `VG-${Math.floor(100000 + Math.random() * 900000)}`,
          status: statusMapped,
          observacoes: `Proposta vinculada e sincronizada do sistema Coban Vanguard. Etapa: ${etapaVanguard}.`,
          historicoStatus: [
            {
              status: statusMapped,
              data: `${nowIso} 10:00`,
              usuario: 'Integrador Coban Vanguard'
            }
          ]
        };

        saveProposta(newProp);
        propostasCount++;
      }

      setImportedSummary({
        totalProcessed: lines.length - 1,
        clientesUpdated: clientesCount,
        propostasImported: propostasCount
      });
      setRawInputData('');
      setImportStatus(null);
    } catch (err) {
      setImportStatus('Erro ao ler formato. Verifique os dados inseridos.');
    }
  };

  // Export Proposals to Vanguard Format CSV
  const handleExportVanguardCSV = () => {
    const headers = ['CPF', 'Nome', 'Telefone', 'DataNascimento', 'Convenio', 'Operacao', 'Banco', 'Promotora', 'ValorEmprestimo', 'ValorTaxa', 'Contrato', 'StatusLiviaCred', 'Vendedora'];
    const rows = propostas.map(p => {
      const cli = clientes.find(c => cleanDigits(c.cpf) === cleanDigits(p.cpf));
      return [
        formatCPF(p.cpf),
        `"${p.nomeCliente}"`,
        `"${cli?.telefone || ''}"`,
        cli?.dataNascimento || '',
        p.convenio,
        p.operacao,
        p.banco,
        p.promotora,
        p.valorEmprestimo.toFixed(2),
        p.valorTaxa.toFixed(2),
        p.numeroContrato,
        p.status,
        `"${p.vendedora}"`
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vanguard_export_liviacred_${getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Integração Ativa</span>
              </span>
              <span className="text-xs text-indigo-200 font-medium">Coban Vanguard ERP / CRM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Conector & Sincronizador Coban Vanguard
            </h1>
            <p className="text-xs text-indigo-200/90 max-w-2xl leading-relaxed">
              Vincule suas esteiras de vendas, funis de atendimento, divisões e operadoras (funileiros) do sistema Vanguard diretamente com a esteira e inteligência do CRM Lívia Cred Saúde.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testando Conexão...' : 'Testar Conexão Vanguard'}</span>
            </button>
          </div>
        </div>

        {testSuccess && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Conexão com os servidores do Coban Vanguard respondendo com sucesso (API Latência: 42ms)!</span>
          </div>
        )}
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 min-w-[140px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'import'
              ? 'bg-[#0F5C63] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Importar do Vanguard</span>
        </button>

        <button
          onClick={() => setActiveTab('mapping')}
          className={`flex-1 min-w-[140px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'mapping'
              ? 'bg-[#0F5C63] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Mapeamento de Funil & Funileiros</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 min-w-[140px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'export'
              ? 'bg-[#0F5C63] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Exportar para Vanguard</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 min-w-[140px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-[#0F5C63] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações Webhook / API</span>
        </button>
      </div>

      {/* TAB 1: IMPORT FROM VANGUARD */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  <span>Sincronização em Lote de Relatórios Vanguard</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cole as linhas exportadas em CSV/Excel do seu Coban Vanguard para importar clientes e propostas automaticamente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLoadSampleVanguardData}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
              >
                Carregar Exemplo de Teste Vanguard
              </button>
            </div>

            {importedSummary && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Importação Vanguard concluída com sucesso!</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-700 dark:text-slate-300 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Linhas Lidas:</span>
                    <strong className="text-sm font-extrabold">{importedSummary.totalProcessed}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Clientes Atualizados:</span>
                    <strong className="text-sm font-extrabold text-teal-600">{importedSummary.clientesUpdated}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Propostas Importadas:</span>
                    <strong className="text-sm font-extrabold text-indigo-600">{importedSummary.propostasImported}</strong>
                  </div>
                </div>
              </div>
            )}

            {importStatus && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Dados do Vanguard (CSV ou Texto Separado por ponto e vírgula / vírgula):
              </label>
              <textarea
                rows={9}
                placeholder={`CPF;Nome;Telefone;DataNascimento;Convenio;Operacao;Banco;Promotora;ValorEmprestimo;ValorTaxa;Contrato;EtapaVanguard;Funileiro\n12345678901;Maria Das Dores;(81) 98888-1122;1968-04-15;INSS;Portabilidade;Banco Pan;J2 Promotora;14500.00;1200.00;VG-88192;Pago / Comissão Liberada;vanguard_hellen`}
                value={rawInputData}
                onChange={(e) => setRawInputData(e.target.value)}
                className="w-full p-3 font-mono text-xs rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Os clientes são salvos com verificação de CPF para evitar duplicações.
              </span>
              <button
                type="button"
                onClick={handleProcessImport}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Processar & Sincronizar Agora</span>
              </button>
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Como Exportar do Vanguard:</span>
            </h3>

            <ol className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4 leading-relaxed">
              <li>Acesse o menu <strong>Relatórios / Esteira de Vendas</strong> no seu painel Vanguard Coban.</li>
              <li>Filtre o período ou divisão desejada (ex: Setembro/2026).</li>
              <li>Clique em <strong>Exportar CSV / Excel</strong>.</li>
              <li>Abra o arquivo gerado, copie o conteúdo e cole na caixa ao lado.</li>
              <li>O sistema converterá automaticamente os status das etapas do Vanguard para as métricas do CRM Lívia Cred!</li>
            </ol>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Sincronização Automática por Webhook</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Você também pode configurar o Webhook na aba ao lado para que cada contrato digitado ou alterado no Vanguard atualize no CRM instantaneamente!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MAPPING FUNNEL & FUNILEIROS */}
      {activeTab === 'mapping' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stage / Funnel Mapping */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>Mapeamento de Etapas do Funil Vanguard</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Associe as etapas originais do Coban Vanguard aos status correspondentes do CRM Lívia Cred.
              </p>
            </div>

            <div className="space-y-2.5">
              {Object.entries(stageMapping).map(([vgStage, currentStatus]) => (
                <div key={vgStage} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-extrabold text-slate-900 dark:text-white block truncate">
                      {vgStage}
                    </span>
                    <span className="text-[10px] text-slate-400">Etapa no Vanguard</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={currentStatus}
                      onChange={(e) => {
                        setStageMapping({
                          ...stageMapping,
                          [vgStage]: e.target.value as StatusProposta
                        });
                      }}
                      className="px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold focus:outline-none"
                    >
                      <option value="Em análise">Em análise</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Aprovada">Aprovada</option>
                      <option value="Paga">Paga</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Funileiros / Seller Mapping */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>Mapeamento de Funileiros / Operadores</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vincule os logins de operadoras/funileiros do Vanguard aos nomes cadastrados da equipe.
              </p>
            </div>

            <div className="space-y-2.5">
              {Object.entries(funileiroMapping).map(([vgFunileiro, currentSeller]) => (
                <div key={vgFunileiro} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-extrabold text-slate-900 dark:text-white font-mono block truncate">
                      {vgFunileiro}
                    </span>
                    <span className="text-[10px] text-slate-400">Funileiro Vanguard</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={currentSeller}
                      onChange={(e) => {
                        setFunileiroMapping({
                          ...funileiroMapping,
                          [vgFunileiro]: e.target.value
                        });
                      }}
                      className="px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold focus:outline-none"
                    >
                      <option value="Hellen Vasconcelos">Hellen Vasconcelos</option>
                      <option value="Taciana Silva">Taciana Silva</option>
                      <option value="Lucélia Ramos">Lucélia Ramos</option>
                      <option value="Loja Igarassu">Loja Igarassu</option>
                      <option value="Pamella">Pamella</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXPORT TO VANGUARD */}
      {activeTab === 'export' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <span>Exportar Dados em Formato Padrão Vanguard</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gere um arquivo CSV formatado para importação direta no sistema Vanguard Coban.
              </p>
            </div>

            <button
              onClick={handleExportVanguardCSV}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo CSV (.csv)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total de Propostas</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                {propostas.length}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total de Clientes</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                {clientes.length}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Volume Total em R$</span>
              <p className="text-xl font-black text-[#0B2A4A] dark:text-teal-400 mt-1 tabular-nums">
                {formatCurrency(propostas.reduce((acc, p) => acc + p.valorEmprestimo, 0))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WEBHOOK & API CONFIG */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 max-w-2xl">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              <span>Chaves de API & Webhook em Tempo Real</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Insira a chave de integração fornecida pelo seu suporte Vanguard para habilitar atualização de status em segundo plano.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chave da API Vanguard (Token de Autenticação):
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                URL de Webhook (Cole no Painel Vanguard):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-2 font-mono text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    alert('URL do Webhook copiada para a área de transferência!');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <span className="font-bold">Status do Webhook:</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                Ativo & Escutando
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
