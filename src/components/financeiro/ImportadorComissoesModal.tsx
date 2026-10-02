import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Sparkles,
  Search,
  Check,
  Building2,
  DollarSign,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  ClipboardPaste
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCRM } from '../../context/CRMContext';
import { Proposta, Promotora, ComissaoPromotora } from '../../types';
import { formatCurrency, formatDate, formatCPF } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
}

interface ParsedCommissionRow {
  id: string;
  rawCpf: string;
  cleanCpf: string;
  nomeCliente: string;
  numeroContrato: string;
  promotora: Promotora;
  valorLiberado: number;
  valorComissao: number;
  dataPagamento: string;
  operacao?: string;
  // Match results
  matchedProposta?: Proposta;
  matchScore: number; // 0 to 100
  matchReason: string;
  selected: boolean;
}

// Normalize text for flexible name matching
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Parse currency strings safely
function parseMoney(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;

  // Handle Brazilian formatting "1.234,56" vs English "1234.56"
  if (str.includes(',') && str.includes('.')) {
    // Determine which is decimal
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      return parseFloat(str.replace(/,/g, '')) || 0;
    }
  } else if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
}

// Format date into YYYY-MM-DD
function parseDateString(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  // Check DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const d = brMatch[1].padStart(2, '0');
    const m = brMatch[2].padStart(2, '0');
    const y = brMatch[3];
    return `${y}-${m}-${d}`;
  }
  // Check YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  // Excel serial number
  if (!isNaN(Number(str)) && Number(str) > 20000 && Number(str) < 60000) {
    const date = new Date((Number(str) - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return '';
}

export const ImportadorComissoesModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { propostas, comissoesPromotoras, saveComissaoPromotoraBatch } = useCRM();

  const [step, setStep] = useState<'upload' | 'preview' | 'processing'>('upload');
  const [promotoraDefault, setPromotoraDefault] = useState<Promotora>('J2 Promotora');
  const [parsedRows, setParsedRows] = useState<ParsedCommissionRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Multi-criteria cross-matching engine
  const matchProposta = (
    cpf: string,
    nome: string,
    contrato: string,
    valorLiberado: number,
    data: string,
    promotoraNome: string
  ): { proposta?: Proposta; score: number; reason: string } => {
    const cleanCpf = cpf.replace(/\D/g, '');
    const normNome = normalizeText(nome);
    const cleanContrato = contrato.replace(/\D/g, '');

    // 1. Direct match by exact CPF (highest confidence)
    if (cleanCpf && cleanCpf.length === 11) {
      const byCpf = propostas.filter(p => p.cpf.replace(/\D/g, '') === cleanCpf);
      if (byCpf.length === 1) {
        return { proposta: byCpf[0], score: 100, reason: 'Match 100% por CPF Exato' };
      } else if (byCpf.length > 1) {
        // If multiple, match closest loan value or date
        const matchVal = byCpf.find(p => valorLiberado > 0 && Math.abs(p.valorEmprestimo - valorLiberado) < 5);
        if (matchVal) {
          return { proposta: matchVal, score: 98, reason: 'Match 98% por CPF + Valor da Operação' };
        }
        return { proposta: byCpf[0], score: 95, reason: 'Match por CPF do Cliente' };
      }
    }

    // 2. Direct match by Contract Number
    if (cleanContrato && cleanContrato.length >= 4) {
      const byContract = propostas.find(p => {
        const pContr = (p.numeroContrato || '').replace(/\D/g, '');
        return pContr && (pContr === cleanContrato || pContr.includes(cleanContrato) || cleanContrato.includes(pContr));
      });
      if (byContract) {
        return { proposta: byContract, score: 95, reason: 'Match 95% por Número de Contrato' };
      }
    }

    // 3. Match by Name + Value / Date (Flexible Fuzzy)
    if (normNome && normNome.length >= 5) {
      const nameTokens = normNome.split(' ').filter(t => t.length > 2);
      
      const candidates = propostas.filter(p => {
        const pNorm = normalizeText(p.nomeCliente);
        if (!pNorm) return false;
        // Check if full name contains or matches 2+ significant name tokens
        if (pNorm === normNome || pNorm.includes(normNome) || normNome.includes(pNorm)) return true;
        const matchingTokens = nameTokens.filter(tok => pNorm.includes(tok));
        return matchingTokens.length >= 2;
      });

      if (candidates.length > 0) {
        // Find best candidate by loan amount
        if (valorLiberado > 0) {
          const byVal = candidates.find(c => Math.abs(c.valorEmprestimo - valorLiberado) <= 10);
          if (byVal) {
            return { proposta: byVal, score: 92, reason: 'Match 92% por Nome + Valor Liberado' };
          }
        }

        // Find candidate by promoter
        const byProm = candidates.find(c => c.promotora.toLowerCase().includes(promotoraNome.toLowerCase()));
        if (byProm) {
          return { proposta: byProm, score: 85, reason: 'Match 85% por Nome + Promotora' };
        }

        return { proposta: candidates[0], score: 80, reason: 'Match 80% por Similaridade de Nome' };
      }
    }

    return { score: 0, reason: 'Sem correspondência direta no CRM' };
  };

  // Process rows from 2D Array / JSON
  const processRawRows = (matrix: any[][], detectedPromotora: Promotora) => {
    if (!matrix || matrix.length === 0) return;

    // Find header index
    let headerIdx = 0;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(10, matrix.length); r++) {
      const rowStr = matrix[r].map(c => normalizeText(String(c || ''))).join(' ');
      if (
        rowStr.includes('cpf') ||
        rowStr.includes('cliente') ||
        rowStr.includes('nome') ||
        rowStr.includes('comissao') ||
        rowStr.includes('repasse') ||
        rowStr.includes('contrato')
      ) {
        headerIdx = r;
        headers = matrix[r].map(c => normalizeText(String(c || '')));
        break;
      }
    }

    // Column mapping indices
    const colCpf = headers.findIndex(h => h.includes('cpf') || h.includes('documento'));
    const colNome = headers.findIndex(h => h.includes('nome') || h.includes('cliente') || h.includes('titular'));
    const colContrato = headers.findIndex(h => h.includes('contrato') || h.includes('proposta') || h.includes('ade') || h.includes('numero'));
    const colComissao = headers.findIndex(
      h => h.includes('comiss') || h.includes('repasse') || h.includes('faturad') || h.includes('recebid') || h.includes('liquido')
    );
    const colValor = headers.findIndex(
      h => (h.includes('valor') || h.includes('liberad') || h.includes('emprestimo')) && !h.includes('comiss') && !h.includes('taxa')
    );
    const colData = headers.findIndex(
      h => h.includes('pagamento') || h.includes('pgto') || h.includes('digitacao') || h.includes('data')
    );
    const colOperacao = headers.findIndex(h => h.includes('operacao') || h.includes('produto') || h.includes('tipo'));

    const parsed: ParsedCommissionRow[] = [];

    for (let r = headerIdx + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      const rawCpf = colCpf >= 0 ? String(row[colCpf] || '') : '';
      const cleanCpf = rawCpf.replace(/\D/g, '');
      const nomeCliente = colNome >= 0 ? String(row[colNome] || '').trim() : '';
      const numeroContrato = colContrato >= 0 ? String(row[colContrato] || '').trim() : '';
      const valorComissao = colComissao >= 0 ? parseMoney(row[colComissao]) : 0;
      const valorLiberado = colValor >= 0 ? parseMoney(row[colValor]) : 0;
      const dataPagamento = colData >= 0 ? parseDateString(row[colData]) : new Date().toISOString().split('T')[0];
      const operacao = colOperacao >= 0 ? String(row[colOperacao] || '').trim() : undefined;

      // Ignore empty row
      if (!cleanCpf && !nomeCliente && !numeroContrato && valorComissao === 0) {
        continue;
      }

      // Execute Cross-Matching
      const match = matchProposta(cleanCpf, nomeCliente, numeroContrato, valorLiberado, dataPagamento, detectedPromotora);

      parsed.push({
        id: `row-${r}-${Date.now()}`,
        rawCpf,
        cleanCpf,
        nomeCliente: nomeCliente || (match.proposta ? match.proposta.nomeCliente : 'Cliente Não Identificado'),
        numeroContrato: numeroContrato || (match.proposta ? match.proposta.numeroContrato : `IMP-${r}`),
        promotora: detectedPromotora,
        valorLiberado: valorLiberado || (match.proposta ? match.proposta.valorEmprestimo : 0),
        valorComissao: valorComissao,
        dataPagamento: dataPagamento || (match.proposta?.dataPagamentoCliente || new Date().toISOString().split('T')[0]),
        operacao,
        matchedProposta: match.proposta,
        matchScore: match.score,
        matchReason: match.reason,
        selected: match.score >= 70 && valorComissao > 0
      });
    }

    setParsedRows(parsed);
    setStep('preview');
  };

  // Handle File Upload (.xlsx, .xls, .csv, .txt)
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setFileName(file.name);

    // Auto-detect promoter from filename if present
    const fnLower = file.name.toLowerCase();
    let detectedProm: Promotora = promotoraDefault;
    if (fnLower.includes('j2')) detectedProm = 'J2 Promotora';
    else if (fnLower.includes('sempre')) detectedProm = 'Sempre';
    else if (fnLower.includes('dg')) detectedProm = 'DG';
    else if (fnLower.includes('gft')) detectedProm = 'GFT';
    else if (fnLower.includes('banco') || fnLower.includes('direto')) detectedProm = 'Direto Banco';
    setPromotoraDefault(detectedProm);

    const reader = new FileReader();

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).map(l => l.split(/[,;\t]/));
        processRawRows(lines, detectedProm);
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonSheet = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        processRawRows(jsonSheet, detectedProm);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Handle Pasted Text
  const handleProcessPastedText = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split(/\r?\n/).map(l => l.split(/\t|;/));
    processRawRows(lines, promotoraDefault);
  };

  // Confirm Import & Link Commissions
  const handleConfirmImport = () => {
    const selectedRows = parsedRows.filter(r => r.selected && r.valorComissao > 0);
    if (selectedRows.length === 0) return;

    setStep('processing');

    const commissionsToSave: ComissaoPromotora[] = selectedRows.map(r => ({
      id: `com-rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      propostaId: r.matchedProposta ? r.matchedProposta.id : `prop-gen-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      numeroContrato: r.matchedProposta ? r.matchedProposta.numeroContrato : r.numeroContrato,
      clienteNome: r.matchedProposta ? r.matchedProposta.nomeCliente : r.nomeCliente,
      promotora: r.promotora,
      valorRecebido: r.valorComissao,
      dataRecebimento: r.dataPagamento || new Date().toISOString().split('T')[0],
      tipo: 'fixo',
      status: 'confirmada',
      observacao: `Conciliado automaticamente via importador inteligente (${r.matchReason}).`
    }));

    saveComissaoPromotoraBatch(commissionsToSave);

    setTimeout(() => {
      onSuccess(commissionsToSave.length);
      onClose();
    }, 600);
  };

  const totalComissoesIdentificadas = parsedRows
    .filter(r => r.selected)
    .reduce((acc, r) => acc + r.valorComissao, 0);

  const matchedCount = parsedRows.filter(r => r.matchedProposta).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Importação Inteligente de Comissões & Repasses</span>
              </h2>
              <p className="text-xs text-slate-500">
                Cruzamento automático de extratos de promotoras (J2, Sempre, DG, GFT, etc.) com o CRM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Promoter Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Promotora do Relatório
                  </label>
                  <select
                    value={promotoraDefault}
                    onChange={(e) => setPromotoraDefault(e.target.value as Promotora)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="J2 Promotora">J2 Promotora</option>
                    <option value="Sempre">Sempre</option>
                    <option value="DG">DG</option>
                    <option value="GFT">GFT</option>
                    <option value="Direto Banco">Direto Banco</option>
                    <option value="Outra">Outra Promotora</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <HelpCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    O sistema identifica automaticamente as colunas de CPF, Nome, Contrato, Valor Liberado e Comissão de qualquer layout.
                  </span>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  accept=".xlsx,.xls,.csv,.txt"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>

                <div>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    Clique para selecionar ou arraste o relatório da promotora
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Formatos suportados: Excel (.xlsx, .xls), CSV (.csv) e TXT
                  </p>
                </div>
              </div>

              {/* Alternate: Paste text directly */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasteArea(!showPasteArea)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>{showPasteArea ? 'Ocultar colagem manual' : 'Ou colar dados diretamente do Excel'}</span>
                </button>

                {showPasteArea && (
                  <div className="mt-3 space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <textarea
                      rows={4}
                      placeholder="Copie as linhas da planilha do Excel e cole aqui (Ctrl+V)..."
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      className="w-full p-3 text-xs font-mono rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleProcessPastedText}
                        disabled={!pasteText.trim()}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs"
                      >
                        Processar Dados Colados
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Interactive Preview & Cross-Match Results */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Linhas Lidas</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                    {parsedRows.length} registros
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Cruzamentos com CRM</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {matchedCount} / {parsedRows.length} contratos
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Comissão a Vincular</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(totalComissoesIdentificadas)}
                  </p>
                </div>
              </div>

              {/* Table of Matches */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={parsedRows.length > 0 && parsedRows.every(r => r.selected)}
                            onChange={(e) => {
                              const chk = e.target.checked;
                              setParsedRows(prev => prev.map(r => ({ ...r, selected: chk })));
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                        </th>
                        <th className="py-2.5 px-3">Cliente / CPF</th>
                        <th className="py-2.5 px-3">Contrato Promotora</th>
                        <th className="py-2.5 px-3 text-right">Valor Liberado</th>
                        <th className="py-2.5 px-3 text-right">Comissão (R$)</th>
                        <th className="py-2.5 px-3">Contrato Vinculado no CRM</th>
                        <th className="py-2.5 px-3 text-center">Cruzamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {parsedRows.map((row) => (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            row.selected ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : 'opacity-60'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={(e) => {
                                const chk = e.target.checked;
                                setParsedRows(prev =>
                                  prev.map(r => (r.id === row.id ? { ...r, selected: chk } : r))
                                );
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900 dark:text-white">{row.nomeCliente}</p>
                            <p className="font-mono text-[10px] text-slate-400">{row.cleanCpf ? formatCPF(row.cleanCpf) : '—'}</p>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                            #{row.numeroContrato}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                            {formatCurrency(row.valorLiberado)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-extrabold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(row.valorComissao)}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.matchedProposta ? (
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  #{row.matchedProposta.numeroContrato}
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  {row.matchedProposta.banco} • {row.matchedProposta.operacao}
                                </span>
                              </div>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 text-[11px] italic font-semibold">
                                Novo / Sem proposta prévia
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                                row.matchScore >= 95
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : row.matchScore >= 75
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                              title={row.matchReason}
                            >
                              {row.matchScore > 0 ? `${row.matchScore}% Match` : 'Não vinculado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                Vinculando e conciliando comissões no banco de dados...
              </p>
              <p className="text-xs text-slate-400">
                Atualizando contratos da Controladoria em tempo real.
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          {step === 'preview' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
              >
                Voltar / Trocar Arquivo
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={parsedRows.filter(r => r.selected).length === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar e Vincular {parsedRows.filter(r => r.selected).length} Comissões</span>
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
              >
                Fechar
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
