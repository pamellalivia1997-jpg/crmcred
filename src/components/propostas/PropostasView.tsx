import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Kanban,
  Table as TableIcon,
  Search,
  Filter,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  TrendingUp,
  Percent,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  UploadCloud,
  RotateCcw,
  Sparkles,
  X,
  Database,
  Trash2,
  Loader2
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Proposta, StatusProposta, Operacao, Banco, Promotora } from '../../types';
import { formatCurrency, formatPercent, formatDate, formatCPF, cleanPersonName, isSameSeller } from '../../utils/formatters';
import { DetalhePropostaModal } from './DetalhePropostaModal';
import { CPFValidationBadge } from '../common/CPFValidationBadge';
import { SmartFilter } from '../common/SmartFilter';

interface PropostasViewProps {
  initialProposta?: Proposta | null;
  initialSearchTerm?: string;
}

type SortField =
  | 'numeroContrato'
  | 'dataDigitacao'
  | 'dataPagamentoCliente'
  | 'nomeCliente'
  | 'operacao'
  | 'banco'
  | 'promotora'
  | 'valorEmprestimo'
  | 'valorTaxa'
  | 'percentualTaxa'
  | 'vendedora'
  | 'status'
  | 'taxaPaga'
  | 'repasse';

// Robust TSV/CSV text parser that handles multiline quoted fields
function parseSpreadsheetRawText(rawText: string): string[][] {
  // A planilha oficial é TSV. Algumas células copiadas pelo Excel trazem
  // aspas soltas em uma célula vizinha; nesse caso, respeitar as aspas como
  // delimitador faria a linha perder colunas e deslocaria empréstimo/status.
  // Para TSV, a tabulação é a fonte de verdade das colunas.
  if (rawText.includes('\t')) {
    return rawText.split(/\r?\n/)
      .map(line => line.split('\t').map(cell => cell.trim().replace(/^"|"$/g, '')))
      .filter(row => row.some(cell => cell.length > 0));
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const isTab = rawText.includes('\t');
  const delimiter = isTab ? '\t' : ',';

  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];
    const nextChar = rawText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Dynamic header and value column detector
function parseArrayRowsToSpreadsheetInputRows(allRows: any[][], defaultUser: string): any[] {
  if (!allRows || allRows.length === 0) return [];

  let headerRow: string[] | null = null;
  let dataRowsIndex = 0;

  // Algumas planilhas começam com uma ou mais linhas de instruções antes do
  // cabeçalho. Nunca tratar essas instruções como colunas: localizar a linha
  // que contém os campos financeiros e de competência da tabela real.
  const headerIndex = allRows.findIndex(row => {
    const text = row.map(cell => String(cell || '')).join(' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return text.includes('data da digitacao') &&
      text.includes('valor do emprestimo') &&
      (text.includes('vendedor') || text.includes('status do contrato'));
  });

  if (headerIndex >= 0) {
    // No arquivo oficial, CPF/nome/telefone ficam nas duas primeiras linhas
    // e as datas/valores/status na terceira. Reunir essas células preserva o
    // alinhamento com as linhas de dados (inclusive no formato Google Forms).
    const headerCells = allRows.slice(0, headerIndex + 1).flat()
      .map(cell => String(cell || '').replace(/^"|"$/g, '').trim())
      .filter(cell => cell.length > 0);
    headerRow = headerCells.map(h => h.toLowerCase().trim());
    dataRowsIndex = headerIndex + 1;
  } else {
    // Compatibilidade com tabelas antigas sem cabeçalho completo.
    const firstLineStr = allRows[0].join(' ').toLowerCase();
    if (firstLineStr.includes('cpf') || firstLineStr.includes('nome') || firstLineStr.includes('cliente') || firstLineStr.includes('vendedor') || firstLineStr.includes('contrato') || firstLineStr.includes('banco')) {
      headerRow = allRows[0].map(h => String(h || '').toLowerCase().trim());
      dataRowsIndex = 1;
    }
  }

  let colCpf = -1;
  let colNome = -1;
  let colTel = -1;
  let colDataDig = -1;
  let colDataPag = -1;
  let colConvenio = -1;
  let colOperacao = -1;
  let colBanco = -1;
  let colPromotora = -1;
  let colValorEmp = -1;
  let colValorTaxa = -1;
  let colClientePagou = -1;
  let colPercentTaxa = -1;
  let colVendedora = -1;
  let colDigitador = -1;
  let colContrato = -1;
  let colLink = -1;
  let colStatus = -1;
  let colObs = -1;

  if (headerRow) {
    headerRow.forEach((h, idx) => {
      const raw = h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const clean = raw.replace(/[^a-z0-9]/g, '');

      // Specific multi-word detection to prevent cross-contamination
      if (clean.includes('cpf')) {
        colCpf = idx;
      } else if (clean.includes('nomedocliente') || (clean.startsWith('nome') && !clean.includes('promotora') && !clean.includes('banco') && !clean.includes('mae'))) {
        colNome = idx;
      } else if (clean.includes('telefone') || clean.includes('celular') || clean.includes('fone') || clean.includes('whatsapp')) {
        colTel = idx;
      } else if (clean.includes('digitacao') || clean.includes('datadagitacao')) {
        colDataDig = idx;
      } else if (clean.includes('datapagamento') || clean.includes('datadopagamento') || (clean.includes('pagamento') && clean.includes('cliente'))) {
        colDataPag = idx;
      } else if (clean.includes('pagamento') && !clean.includes('taxa')) {
        colDataPag = idx;
      } else if (clean.includes('clientepagou') || clean.includes('pagouataxa')) {
        colClientePagou = idx;
      } else if (clean.includes('taxadocartao') || clean.includes('percentual') || clean.includes('taxacartao')) {
        colPercentTaxa = idx;
      } else if (clean.includes('valordataxa') || clean.includes('taxadaassessoria') || (clean.includes('taxa') && !clean.includes('cartao'))) {
        colValorTaxa = idx;
      } else if (clean.includes('valordoemprestimo') || clean.includes('emprestimoliberado') || clean.includes('valorliberado') || clean.includes('emprestimo')) {
        colValorEmp = idx;
      } else if (clean.includes('anexar') || clean.includes('capa') || clean.includes('print') || clean.includes('link') || clean.includes('drive')) {
        colLink = idx;
      } else if (clean.includes('statusdocontrato') || clean.includes('status') || clean.includes('situacao')) {
        colStatus = idx;
      } else if (clean.includes('nocontrato') || clean.includes('ndocontrato') || clean.includes('numerocontrato') || (clean.includes('contrato') && !clean.includes('status') && !clean.includes('capa'))) {
        colContrato = idx;
      } else if (clean.includes('digitador')) {
        colDigitador = idx;
      } else if (clean.includes('vendedor') || clean.includes('vendedora') || clean.includes('consultor')) {
        colVendedora = idx;
      } else if (clean.includes('convenio')) {
        colConvenio = idx;
      } else if (clean.includes('operacao') && !clean.includes('capa') && !clean.includes('print')) {
        colOperacao = idx;
      } else if (clean.includes('promotora')) {
        colPromotora = idx;
      } else if (clean.includes('banco')) {
        colBanco = idx;
      } else if (clean.includes('observacao') || clean.includes('observacoes')) {
        colObs = idx;
      }
    });
  }

  // Value-based fallback scanner only for still unmapped columns
  const sampleDataRow = allRows[dataRowsIndex] || [];
  sampleDataRow.forEach((valCell, cIdx) => {
    const val = String(valCell || '').trim();
    if (!val) return;
    const cleanDigits = val.replace(/\D/g, '');

    if (colCpf < 0 && (cleanDigits.length === 11 || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val))) {
      colCpf = cIdx;
    } else if (colLink < 0 && val.toLowerCase().includes('http')) {
      colLink = cIdx;
    } else if (colDataDig < 0 && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      colDataDig = cIdx;
    } else if (colDataPag < 0 && /^\d{2}\/\d{2}\/\d{4}$/.test(val) && cIdx !== colDataDig) {
      colDataPag = cIdx;
    } else if (colConvenio < 0 && /INSS|FGTS|CARTÃO|CREDITO|GOVERNO|CAIXA/i.test(val)) {
      colConvenio = cIdx;
    } else if (colOperacao < 0 && /MARGEM|REFIN|PORTABILIDADE|Assessoria|SAQUE/i.test(val)) {
      colOperacao = cIdx;
    } else if (colBanco < 0 && /DAYCOVAL|C6|PAN|CREFAZ|BMG|FACTA|BRB|AGIBANK|DIGIO|ICRED|INBURSA|ITAÚ|SAFRA/i.test(val)) {
      colBanco = cIdx;
    } else if (colPromotora < 0 && /J2 PROMOTORA|SEMPRE PROMOTORA|GFT|DG PROMOTORA/i.test(val)) {
      colPromotora = cIdx;
    } else if (colStatus < 0 && /PAGO|PAGA|EM ANÁLISE|EM ANALISE|CANCELADA|SIMULADAS/i.test(val)) {
      colStatus = cIdx;
    } else if (colTel < 0 && /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(val) && cIdx !== colCpf) {
      colTel = cIdx;
    }
  });

  const resultRows = [];
  for (let i = dataRowsIndex; i < allRows.length; i++) {
    const cols = allRows[i];
    if (!cols || cols.length < 2) continue;

    const rawCpf = colCpf >= 0 ? String(cols[colCpf] || '').trim() : '';
    const rawNome = colNome >= 0 ? String(cols[colNome] || '').trim() : '';
    const cleanNome = rawNome.replace(/^[\"\'\t\r\n\s]+|[\"\'\t\r\n\s]+$/g, '').trim();
    const cleanCpf = rawCpf.replace(/^[\"\'\t\r\n\s]+|[\"\'\t\r\n\s]+$/g, '').trim();
    const rawContrato = colContrato >= 0 ? String(cols[colContrato] || '').trim() : '';
    const cleanContrato = rawContrato.replace(/^[\"\'\t\r\n\s]+|[\"\'\t\r\n\s]+$/g, '').trim();
    const rawValorEmp = colValorEmp >= 0 ? String(cols[colValorEmp] || '').trim() : '';
    const rawValorTaxa = colValorTaxa >= 0 ? String(cols[colValorTaxa] || '').trim() : '';

    // Ignore row ONLY if completely empty (no CPF, no Nome, no Contrato, and no financial values)
    const hasAnyContent = cleanCpf || cleanNome || (cleanContrato && cleanContrato !== '0') || (rawValorEmp && rawValorEmp !== '0') || (rawValorTaxa && rawValorTaxa !== '0');
    if (!hasAnyContent) continue;

    let finalNome = cleanNome;
    if (!finalNome) {
      if (cleanContrato && cleanContrato !== '0' && cleanContrato !== '-') {
        finalNome = `Contrato #${cleanContrato}`;
      } else if (cleanCpf && cleanCpf !== '00000000000') {
        finalNome = `Cliente (${cleanCpf})`;
      } else {
        finalNome = `Cliente Sem Nome (Linha ${i + 1})`;
      }
    }

    resultRows.push({
      cpf: cleanCpf,
      nomeCliente: finalNome,
      telefone: colTel >= 0 ? String(cols[colTel] || '').trim() : '',
      dataDigitacao: colDataDig >= 0 ? String(cols[colDataDig] || '').trim() : '',
      dataPagamentoCliente: colDataPag >= 0 ? String(cols[colDataPag] || '').trim() : '',
      convenio: colConvenio >= 0 ? String(cols[colConvenio] || '').trim() || 'INSS' : 'INSS',
      operacao: colOperacao >= 0 ? String(cols[colOperacao] || '').trim() || 'Margem' : 'Margem',
      banco: colBanco >= 0 ? String(cols[colBanco] || '').trim() || 'Daycoval' : 'Daycoval',
      promotora: colPromotora >= 0 ? String(cols[colPromotora] || '').trim() || 'J2 Promotora' : 'J2 Promotora',
      valorEmprestimo: colValorEmp >= 0 ? String(cols[colValorEmp] || '').trim() || '0' : '0',
      valorTaxa: colValorTaxa >= 0 ? String(cols[colValorTaxa] || '').trim() || '0' : '0',
      percentualTaxa: colPercentTaxa >= 0 ? String(cols[colPercentTaxa] || '').trim() : '',
      clientePagou: colClientePagou >= 0 ? String(cols[colClientePagou] || '').trim() || 'NÃO' : 'NÃO',
      vendedora: colVendedora >= 0 ? String(cols[colVendedora] || '').trim() || defaultUser : defaultUser,
      digitador: colDigitador >= 0 ? String(cols[colDigitador] || '').trim() || defaultUser : defaultUser,
      numeroContrato: colContrato >= 0 ? String(cols[colContrato] || '').trim() : '',
      linkDocumento: colLink >= 0 ? String(cols[colLink] || '').trim() : '',
      status: colStatus >= 0 ? String(cols[colStatus] || '').trim() || 'PAGA' : 'PAGA'
    });
  }

  return resultRows;
}

function parseTextToSpreadsheetInputRows(rawText: string, defaultUser: string): any[] {
  const allRows = parseSpreadsheetRawText(rawText);
  return parseArrayRowsToSpreadsheetInputRows(allRows, defaultUser);
}

export const PropostasView: React.FC<PropostasViewProps> = ({ initialProposta = null, initialSearchTerm = '' }) => {
  const {
    propostas,
    updateStatusProposta,
    dashboardMetrics,
    dataInicioPersonalizada,
    setDataInicioPersonalizada,
    dataFimPersonalizada,
    setDataFimPersonalizada,
    comissoesPromotoras,
    importFullSpreadsheetRows,
    clearFunilData
  } = useCRM();
  const { currentUser } = useAuth();

  const canViewRepasse = Boolean(
    currentUser && (currentUser.role === 'proprietaria' || currentUser.role === 'adm' || currentUser.role === 'financeiro')
  );

  const isFinanceiro = Boolean(currentUser && currentUser.role === 'financeiro');

  const [viewMode, setViewMode] = useState<'kanban' | 'tabela'>('kanban');
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  // Modal State for Importing Portfolio
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Modal State for Clearing Test Data (Funil)
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearNotice, setClearNotice] = useState<string | null>(null);
  const [isClearingData, setIsClearingData] = useState(false);

  // Column dropdown filters - Pre-selected with logged-in seller if vendedora
  const [filterVendedora, setFilterVendedora] = useState(() => {
    if (currentUser?.role === 'vendedora' && currentUser?.name) {
      return cleanPersonName(currentUser.name);
    }
    return 'todas';
  });

  useEffect(() => {
    if (currentUser?.role === 'vendedora' && currentUser?.name) {
      setFilterVendedora(cleanPersonName(currentUser.name));
    } else {
      setFilterVendedora('todas');
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.name]);
  const [filterOperacao, setFilterOperacao] = useState('todas');
  const [filterBanco, setFilterBanco] = useState('todos');
  const [filterPromotora, setFilterPromotora] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterTaxaPaga, setFilterTaxaPaga] = useState<'todas' | 'sim' | 'nao'>('todas');
  const [filterRepasse, setFilterRepasse] = useState<'todos' | 'sim' | 'nao'>('todos');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('dataDigitacao');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(initialProposta);

  // Map proposal IDs to their confirmed commission amount (strictly linked by propostaId)
  const commissionByProposta = useMemo(() => {
    const map = new Map<string, number>();
    (comissoesPromotoras || [])
      .filter(c => c.status === 'confirmada' && (c.valorRecebido || 0) > 0 && c.propostaId)
      .forEach(c => {
        map.set(c.propostaId, (map.get(c.propostaId) || 0) + c.valorRecebido);
      });
    return map;
  }, [comissoesPromotoras]);

  const getRepasseValue = (prop: Proposta): number => {
    if (prop.id && commissionByProposta.has(prop.id)) {
      return commissionByProposta.get(prop.id) || 0;
    }
    return 0;
  };

  React.useEffect(() => {
    if (initialProposta) {
      setSelectedProposta(initialProposta);
    }
  }, [initialProposta]);

  // Kanban Columns
  const kanbanColumns: { status: StatusProposta; title: string; color: string; badgeColor: string }[] = [
    { status: 'Simuladas', title: 'Simuladas', color: 'border-slate-400 bg-slate-50/30 dark:bg-slate-950/20', badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
    { status: 'Em análise', title: 'Em análise', color: 'border-cyan-400 bg-cyan-50/30 dark:bg-cyan-950/20', badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
    { status: 'Paga', title: 'Paga', color: 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    { status: 'Cancelada', title: 'Cancelada', color: 'border-rose-400 bg-rose-50/30 dark:bg-rose-950/20', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  ];

  const handleMoveProposta = React.useCallback((id: string, newStatus: StatusProposta) => {
    updateStatusProposta(id, newStatus, `Movida via arrastar e soltar (Kanban) para o funil ${newStatus}`);
  }, [updateStatusProposta]);

  const isDigitador = currentUser?.role === 'digitador';

  // Filter propostas
  const filteredPropostas = useMemo(() => {
    return dashboardMetrics.filteredPropostas.filter(p => {
      // If digitador, only show proposals typed by this user
      if (isDigitador) {
        const matchDigitador =
          p.digitador === currentUser?.name ||
          p.digitador === 'Ana Paula' ||
          (currentUser?.name && p.digitador && p.digitador.toLowerCase().includes(currentUser.name.toLowerCase()));
        if (!matchDigitador) return false;
      }

      // Search match
      const matchSearch =
        !searchTerm ||
        p.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf.includes(searchTerm.replace(/\D/g, '')) ||
        (p.numeroContrato && p.numeroContrato.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchVendedora =
        filterVendedora === 'todas' ||
        isSameSeller(p.vendedora, filterVendedora) ||
        p.vendedora === filterVendedora;
      const matchOperacao = filterOperacao === 'todas' || p.operacao === filterOperacao;
      const matchBanco = filterBanco === 'todos' || p.banco === filterBanco;
      const matchPromotora = filterPromotora === 'todas' || p.promotora === filterPromotora;
      const matchStatus = filterStatus === 'todos' || p.status === filterStatus;

      // Taxa Paga filter
      const isPaidTax = p.taxaPaga === true || p.clientePagouTaxa === true;
      let matchTaxa = true;
      if (filterTaxaPaga === 'sim') matchTaxa = isPaidTax;
      if (filterTaxaPaga === 'nao') matchTaxa = !isPaidTax;

      // Repasse filter (Apenas ADMs, Gerência e Financeiro)
      let matchRepasse = true;
      if (canViewRepasse) {
        const hasRepasse = getRepasseValue(p) > 0;
        if (filterRepasse === 'sim') matchRepasse = hasRepasse;
        if (filterRepasse === 'nao') matchRepasse = !hasRepasse;
      }

      return matchSearch && matchVendedora && matchOperacao && matchBanco && matchPromotora && matchStatus && matchTaxa && matchRepasse;
    });
  }, [
    dashboardMetrics.filteredPropostas,
    searchTerm,
    filterVendedora,
    filterOperacao,
    filterBanco,
    filterPromotora,
    filterStatus,
    filterTaxaPaga,
    filterRepasse,
    canViewRepasse,
    commissionByProposta,
    isDigitador,
    currentUser
  ]);

  // Sort propostas by selected column
  const sortedPropostas = useMemo(() => {
    return [...filteredPropostas].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'numeroContrato':
          valA = a.numeroContrato || '';
          valB = b.numeroContrato || '';
          break;
        case 'dataDigitacao':
          valA = a.dataDigitacao || '';
          valB = b.dataDigitacao || '';
          break;
        case 'dataPagamentoCliente':
          valA = a.dataPagamentoCliente || '';
          valB = b.dataPagamentoCliente || '';
          break;
        case 'nomeCliente':
          valA = a.nomeCliente.toLowerCase();
          valB = b.nomeCliente.toLowerCase();
          break;
        case 'operacao':
          valA = a.operacao.toLowerCase();
          valB = b.operacao.toLowerCase();
          break;
        case 'banco':
          valA = a.banco.toLowerCase();
          valB = b.banco.toLowerCase();
          break;
        case 'promotora':
          valA = (a.promotora || '').toLowerCase();
          valB = (b.promotora || '').toLowerCase();
          break;
        case 'valorEmprestimo':
          valA = a.valorEmprestimo || 0;
          valB = b.valorEmprestimo || 0;
          break;
        case 'valorTaxa':
          valA = a.valorTaxa || 0;
          valB = b.valorTaxa || 0;
          break;
        case 'percentualTaxa':
          valA = a.percentualTaxa || 0;
          valB = b.percentualTaxa || 0;
          break;
        case 'vendedora':
          valA = a.vendedora.toLowerCase();
          valB = b.vendedora.toLowerCase();
          break;
        case 'status':
          valA = a.status.toLowerCase();
          valB = b.status.toLowerCase();
          break;
        case 'taxaPaga':
          valA = (a.taxaPaga === true || a.clientePagouTaxa === true) ? 1 : 0;
          valB = (b.taxaPaga === true || b.clientePagouTaxa === true) ? 1 : 0;
          break;
        case 'repasse':
          valA = getRepasseValue(a);
          valB = getRepasseValue(b);
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPropostas, sortField, sortDirection, commissionByProposta]);

  // Unique lists for filter dropdowns
  const vendedorasList = useMemo(() => Array.from(new Set(propostas.map(p => p.vendedora).filter(Boolean))), [propostas]);
  const operacoesList = useMemo(() => Array.from(new Set(propostas.map(p => p.operacao).filter(Boolean))), [propostas]);
  const bancosList = useMemo(() => Array.from(new Set(propostas.map(p => p.banco).filter(Boolean))), [propostas]);
  const promotorasList = useMemo(() => Array.from(new Set(propostas.map(p => p.promotora).filter(Boolean))), [propostas]);

  // Aggregates of filtered results - Sync with Management Panel KPIs
  const isTaxaPaga = (p: Proposta) => {
    const val = p.taxaPaga;
    const cliVal = p.clientePagouTaxa;
    if (val === true || cliVal === true) return true;
    const sVal = String(val || '').toUpperCase().trim();
    const sCliVal = String(cliVal || '').toUpperCase().trim();
    return sVal === 'SIM' || sVal === 'S' || sVal === 'TRUE' || sVal === 'PAGA' || sVal === 'PAGO' ||
           sCliVal === 'SIM' || sCliVal === 'S' || sCliVal === 'TRUE' || sCliVal === 'PAGA' || sCliVal === 'PAGO';
  };

  const totalVolume = filteredPropostas
    .filter(p => p.status === 'Paga')
    .reduce((acc, p) => acc + p.valorEmprestimo, 0);
  const totalTaxasPagas = filteredPropostas
    .filter(isTaxaPaga)
    .reduce((acc, p) => acc + p.valorTaxa, 0);
  const totalTaxasPendentes = filteredPropostas
    .filter(p => !isTaxaPaga(p))
    .reduce((acc, p) => acc + p.valorTaxa, 0);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 inline ml-1 opacity-60 hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-teal-600 dark:text-teal-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-teal-600 dark:text-teal-400 inline ml-1" />
    );
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Top Header & View Switcher */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{isDigitador ? 'Minhas Propostas & Simulações Digitadas' : 'Funil de Propostas Consignadas'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isDigitador
              ? 'Acompanhamento restrito às propostas e simulações cadastradas por você'
              : 'Acompanhamento esteira a esteira com controle de data de pagamento e quitação de taxas'}
          </p>
        </div>

        {/* Kanban vs Table Mode & Financeiro Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {isFinanceiro && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Importar</span>
              </button>
              <button
                onClick={() => setIsClearModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Zerar</span>
              </button>
            </div>
          )}

          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-2xs">
            <button
              onClick={() => setViewMode('tabela')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'tabela'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern & Clean Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Main Search & Period Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box (Reduced width) */}
          <div className="relative w-full sm:w-64 lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar CPF, nome ou contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-7 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Period Selector (Exactly like management panel) */}
          <div className="flex-1 w-full max-w-2xl">
            <SmartFilter
              dataInicio={dataInicioPersonalizada}
              dataFim={dataFimPersonalizada}
              onChangeRange={(range) => {
                setDataInicioPersonalizada(range.dataInicio);
                setDataFimPersonalizada(range.dataFim);
              }}
            />
          </div>
        </div>

        {/* Secondary Clean Filter Grid */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 ${canViewRepasse ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-2 text-xs`}>
          {/* Vendedora Filter */}
          <select
            value={filterVendedora}
            onChange={(e) => setFilterVendedora(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todas">Vendedora: Todas</option>
            {vendedorasList.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {/* Operacao Filter */}
          <select
            value={filterOperacao}
            onChange={(e) => setFilterOperacao(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todas">Operação: Todas</option>
            {operacoesList.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>

          {/* Banco Filter */}
          <select
            value={filterBanco}
            onChange={(e) => setFilterBanco(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todos">Banco: Todos</option>
            {bancosList.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Promotora Filter */}
          <select
            value={filterPromotora}
            onChange={(e) => setFilterPromotora(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todas">Promotora: Todas</option>
            {promotorasList.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todos">Status: Todos</option>
            <option value="Simuladas">Simuladas</option>
            <option value="Em análise">Em análise</option>
            <option value="Paga">Paga</option>
            <option value="Cancelada">Cancelada</option>
          </select>

          {/* Taxa Paga Filter */}
          <select
            value={filterTaxaPaga}
            onChange={(e) => setFilterTaxaPaga(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="todas">Taxa: Todas</option>
            <option value="sim">Taxa: Paga (Sim)</option>
            <option value="nao">Taxa: Pendente (Não)</option>
          </select>

          {/* Repasse Filter (Apenas ADMs, Gerência e Financeiro) */}
          {canViewRepasse && (
            <select
              value={filterRepasse}
              onChange={(e) => setFilterRepasse(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-teal-800 dark:text-teal-300 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="todos">Repasse: Todos</option>
              <option value="sim">Repasse: Recebido (Sim)</option>
              <option value="nao">Repasse: Não Recebido (Não)</option>
            </select>
          )}
        </div>

        {/* Aggregate Stats Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100 dark:border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {filteredPropostas.filter(p => p.status === 'Paga').length} contratos pagos
              {filteredPropostas.length > filteredPropostas.filter(p => p.status === 'Paga').length && 
                ` (${filteredPropostas.length} no total)`}
            </span>
            {(filterVendedora !== 'todas' || filterOperacao !== 'todas' || filterBanco !== 'todos' || filterPromotora !== 'todas' || filterStatus !== 'todos' || filterTaxaPaga !== 'todas' || (canViewRepasse && filterRepasse !== 'todos') || searchTerm) && (
              <button
                onClick={() => {
                  setFilterVendedora('todas');
                  setFilterOperacao('todas');
                  setFilterBanco('todos');
                  setFilterPromotora('todas');
                  setFilterStatus('todos');
                  setFilterTaxaPaga('todas');
                  setFilterRepasse('todos');
                  setSearchTerm('');
                }}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700 underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
            <span className="flex items-center gap-1">
              Volume Pago: <strong className="text-slate-900 dark:text-white tabular-nums font-black">{formatCurrency(totalVolume)}</strong>
            </span>
            <span className="flex items-center gap-1">
              Taxas Pagas: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums font-black">{formatCurrency(totalTaxasPagas)}</strong>
            </span>
            {totalTaxasPendentes > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                Taxas Pendentes: <strong className="tabular-nums font-black">{formatCurrency(totalTaxasPendentes)}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-start overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colPropostas = sortedPropostas.filter(p => p.status === col.status);
            const colVolume = colPropostas.reduce((acc, p) => acc + p.valorEmprestimo, 0);

            return (
              <div
                key={col.status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const propId = e.dataTransfer.getData('text/plain');
                  if (propId) {
                    handleMoveProposta(propId, col.status);
                  }
                }}
                className={`flex flex-col rounded-3xl border-t-4 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs min-h-[450px] ${col.color}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {col.title}
                    </h2>
                    <span className="text-[10px] text-slate-400 font-semibold tabular-nums">
                      {formatCurrency(colVolume)}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                    {colPropostas.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-2 flex-1 overflow-y-auto overflow-x-hidden max-h-[68vh] pr-0.5 scrollbar-none">
                  {colPropostas.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-8">
                      Nenhuma proposta
                    </p>
                  ) : (
                    colPropostas.map((prop) => {
                      const isTaxPaid = prop.taxaPaga === true || prop.clientePagouTaxa === true;
                      const pctTax = Number(prop.percentualTaxa || 0).toFixed(2);

                      return (
                        <div
                          key={prop.id}
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', prop.id);
                          }}
                          onClick={() => setSelectedProposta(prop)}
                          className="group p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer space-y-1.5 active:cursor-grabbing"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {prop.nomeCliente}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              #{prop.numeroContrato}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{prop.operacao}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{prop.banco}</span>
                          </div>

                          <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                            <div>
                              <span className="text-[10px] text-slate-400 block leading-none">Venda</span>
                              <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                                {formatCurrency(prop.valorEmprestimo)}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block leading-none">Taxa ({pctTax}%)</span>
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                {formatCurrency(prop.valorTaxa)}
                              </span>
                            </div>
                          </div>

                          {/* Taxa Paga Status Badge */}
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 dark:border-slate-700/40">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                              isTaxPaid
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              Taxa: {isTaxPaid ? 'Paga (Sim)' : 'Pendente (Não)'}
                            </span>
                            <span className="text-slate-400 font-semibold">{prop.vendedora}</span>
                          </div>

                          {/* Dates: Digitação + Pagamento ao Cliente */}
                          <div className="text-[9px] text-slate-400 flex flex-wrap items-center justify-between pt-0.5">
                            <span>Dig: {formatDate(prop.dataDigitacao)}</span>
                            {prop.dataPagamentoCliente && (
                              <span className="text-teal-600 dark:text-teal-400 font-bold">
                                Pgto: {formatDate(prop.dataPagamentoCliente)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: FULL DATA TABLE WITH ADVANCED SORTING ON EVERY COLUMN */}
      {viewMode === 'tabela' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[980px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider select-none">
                  {/* Contrato */}
                  <th
                    onClick={() => toggleSort('numeroContrato')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Contrato</span>
                    {renderSortIcon('numeroContrato')}
                  </th>

                  {/* Data (Digitação e Pagamento) */}
                  <th
                    onClick={() => toggleSort('dataDigitacao')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Datas (Dig. / Pgto)</span>
                    {renderSortIcon('dataDigitacao')}
                  </th>

                  {/* Cliente / CPF */}
                  <th
                    onClick={() => toggleSort('nomeCliente')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Cliente / CPF</span>
                    {renderSortIcon('nomeCliente')}
                  </th>

                  {/* Operação */}
                  <th
                    onClick={() => toggleSort('operacao')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Operação</span>
                    {renderSortIcon('operacao')}
                  </th>

                  {/* Banco */}
                  <th
                    onClick={() => toggleSort('banco')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Banco</span>
                    {renderSortIcon('banco')}
                  </th>

                  {/* Promotora */}
                  <th
                    onClick={() => toggleSort('promotora')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Promotora</span>
                    {renderSortIcon('promotora')}
                  </th>

                  {/* Venda (R$) */}
                  <th
                    onClick={() => toggleSort('valorEmprestimo')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Venda (R$)</span>
                    {renderSortIcon('valorEmprestimo')}
                  </th>

                  {/* Taxa (R$) */}
                  <th
                    onClick={() => toggleSort('valorTaxa')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Taxa (R$)</span>
                    {renderSortIcon('valorTaxa')}
                  </th>

                  {/* % Taxa */}
                  <th
                    onClick={() => toggleSort('percentualTaxa')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>% Taxa</span>
                    {renderSortIcon('percentualTaxa')}
                  </th>

                  {/* Taxa Paga (Sim/Não) */}
                  <th
                    onClick={() => toggleSort('taxaPaga')}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Taxa Paga</span>
                    {renderSortIcon('taxaPaga')}
                  </th>

                  {/* Vendedora */}
                  <th
                    onClick={() => toggleSort('vendedora')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Vendedora</span>
                    {renderSortIcon('vendedora')}
                  </th>

                  {/* Status */}
                  <th
                    onClick={() => toggleSort('status')}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </th>

                  {/* Repasse (Apenas ADMs, Gerência e Financeiro) */}
                  {canViewRepasse && (
                    <th
                      onClick={() => toggleSort('repasse')}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <span>Repasse</span>
                      {renderSortIcon('repasse')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {sortedPropostas.length === 0 ? (
                  <tr>
                    <td colSpan={canViewRepasse ? 13 : 12} className="py-12 text-center text-slate-400">
                      Nenhuma proposta encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  sortedPropostas.map((prop) => {
                    const isTaxPaid = prop.taxaPaga === true || prop.clientePagouTaxa === true;
                    const pctTax = Number(prop.percentualTaxa || 0).toFixed(2);
                    const repasseVal = getRepasseValue(prop);

                    return (
                      <tr
                        key={prop.id}
                        onClick={() => setSelectedProposta(prop)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        {/* Contrato */}
                        <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                          #{prop.numeroContrato}
                        </td>

                        {/* Datas (Digitação e Pagamento ao Cliente) */}
                        <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">
                          <p className="text-slate-900 dark:text-white font-semibold">
                            {formatDate(prop.dataDigitacao)}
                          </p>
                          {prop.dataPagamentoCliente ? (
                            <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                              Pgto: {formatDate(prop.dataPagamentoCliente)}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400">Pgto pendente</p>
                          )}
                        </td>

                        {/* Cliente / CPF */}
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                            {prop.nomeCliente}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              {formatCPF(prop.cpf)}
                            </span>
                            <CPFValidationBadge cpf={prop.cpf} />
                          </div>
                        </td>

                        {/* Operação */}
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
                          {prop.operacao}
                        </td>

                        {/* Banco */}
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {prop.banco}
                        </td>

                        {/* Promotora */}
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {prop.promotora || '—'}
                        </td>

                        {/* Venda (R$) */}
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                          {formatCurrency(prop.valorEmprestimo)}
                        </td>

                        {/* Taxa (R$) */}
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums whitespace-nowrap text-amber-600 dark:text-amber-400">
                          {formatCurrency(prop.valorTaxa)}
                        </td>

                        {/* % Taxa (Arredondado a no máximo 2 casas decimais) */}
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {pctTax}%
                        </td>

                        {/* Taxa Paga (Sim/Não) */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isTaxPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {isTaxPaid ? 'Sim (Paga)' : 'Não (Pendente)'}
                          </span>
                        </td>

                        {/* Vendedora */}
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium">
                          {prop.vendedora}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prop.status === 'Paga'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : prop.status === 'Em análise'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : prop.status === 'Simuladas'
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {prop.status}
                          </span>
                        </td>

                        {/* Repasse (Apenas ADMs, Gerência e Financeiro) */}
                        {canViewRepasse && (
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {repasseVal > 0 ? (
                              <div>
                                <span className="font-extrabold text-teal-700 dark:text-teal-400 tabular-nums">
                                  {formatCurrency(repasseVal)}
                                </span>
                                <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                                  Recebido (Sim)
                                </span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                Não Recebido
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proposal Detail Modal */}
      <DetalhePropostaModal
        proposta={selectedProposta}
        onClose={() => setSelectedProposta(null)}
      />

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-teal-600" />
                <span>Importar Planilha de Contratos</span>
              </h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Você pode enviar seu arquivo Excel diretamente (<strong>.xlsx, .xls, .csv</strong>) ou colar os dados da planilha abaixo. O sistema identifica automaticamente as colunas de CPF, Nome, Empréstimo, Banco, Operação, Status e Contrato.
            </p>

            {/* Direct File Selector */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
              <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-2">
                <FileSpreadsheet className="w-7 h-7 text-teal-600" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Clique aqui para selecionar seu arquivo Excel (.xlsx, .xls, .csv)
                </span>
                <span className="text-[10px] text-slate-400">Suporta arquivos de qualquer tamanho</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      try {
                        const data = evt.target?.result;
                        const workbook = XLSX.read(data, { type: 'binary' });
                        const firstSheet = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheet];
                        const arrayRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                        if (!arrayRows || arrayRows.length === 0) {
                          setImportNotice('Nenhuma linha encontrada na planilha.');
                          return;
                        }

                        const mappedRows = parseArrayRowsToSpreadsheetInputRows(arrayRows, currentUser?.name || 'Hellen Vasconcelos');
                        const res = importFullSpreadsheetRows(mappedRows);
                        setImportNotice(`Importação concluída! ${res.totalRows - 1} linhas lidas do arquivo. ${res.clientsCreated + res.clientsUpdated} clientes localizados (${res.clientsCreated} novos criados) e ${res.proposalsCreated} propostas salvas no funil.`);
                      } catch (err: any) {
                        setImportNotice(`Erro ao ler arquivo Excel: ${err.message}`);
                      }
                    };
                    reader.readAsBinaryString(file);
                  }}
                />
              </label>
            </div>

            <div className="relative">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                Ou cole o texto copiado da planilha abaixo:
              </span>
              <textarea
                rows={8}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Cole aqui as linhas da sua planilha..."
                className="w-full p-3 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {importNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold leading-relaxed">
                {importNotice}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  try {
                    const parsedRows = parseTextToSpreadsheetInputRows(importText, currentUser?.name || 'Hellen Vasconcelos');
                    if (parsedRows.length === 0) {
                      setImportNotice('Nenhuma linha válida encontrada. Selecione um arquivo Excel ou cole as linhas acima.');
                      return;
                    }

                    const res = importFullSpreadsheetRows(parsedRows);
                    setImportNotice(`Importação concluída! ${parsedRows.length} linhas lidas. ${res.clientsCreated + res.clientsUpdated} clientes localizados (${res.clientsCreated} novos criados) e ${res.proposalsCreated} propostas salvas no funil.`);
                    setTimeout(() => {
                      setIsImportModalOpen(false);
                      setImportNotice(null);
                      setImportText('');
                    }, 3500);
                  } catch (err: any) {
                    setImportNotice(`Erro ao processar dados: ${err.message}`);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
              >
                Processar {importText.split('\n').filter(l => l.trim()).length} Linhas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Funil Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Zerar Funil e Clientes?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Deseja realmente zerar o funil? Esta ação apagará <strong>todas as propostas</strong> e <strong>todos os clientes cadastrados</strong> no banco de dados da nuvem.
              </p>
            </div>

            {clearNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold leading-relaxed">
                {clearNotice}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                disabled={isClearingData}
                onClick={() => {
                  setIsClearModalOpen(false);
                  setClearNotice(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                disabled={isClearingData}
                onClick={async () => {
                  try {
                    setIsClearingData(true);
                    setClearNotice('Limpando propostas, clientes e alertas no banco de dados...');
                    await clearFunilData();
                    setClearNotice('Funil e clientes zerados com sucesso!');
                    setTimeout(() => {
                      setIsClearModalOpen(false);
                      setClearNotice(null);
                      setIsClearingData(false);
                    }, 1200);
                  } catch (err: any) {
                    setClearNotice(`Erro ao zerar: ${err.message}`);
                    setIsClearingData(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isClearingData ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Zerando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Zerar Tudo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
