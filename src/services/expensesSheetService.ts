import { User } from '../types';

export interface SheetExpenseRow {
  id: string;
  cnpjCpf: string;
  nome: string;
  fornecedor: string;
  formaPagamentoPix: string;
  tags: string;
  vencimento: string;
  categoria: string;
  obs: string;
  dataPagamento: string; // YYYY-MM-DD (empty if unpaid)
  valorPago: number;
}

const SPREADSHEET_ID = '1MBHNJUfDSqKU0U3_4gBFHtmm524IiEa8umUWcyxcUTk';
const CSV_URL = (import.meta as any).env?.VITE_GOOGLE_SHEETS_EXPENSES_URL || `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;
const CACHE_KEY = 'lviacred_cached_expenses_sheet';
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

let cachedRows: SheetExpenseRow[] | null = null;
let lastFetchTime = 0;
let fetchPromise: Promise<SheetExpenseRow[]> | null = null;

// Clean numbers / currency string (e.g. "-R$ 1.407,00" -> 1407.00)
export function parseSheetCurrency(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.abs(val);
  let str = String(val).trim();
  if (!str) return 0;

  // Remove currency prefix, symbols and negative signs
  str = str.replace(/R\$|\$|\s/g, '').replace(/^-/, '');

  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      return Math.abs(parseFloat(str.replace(/\./g, '').replace(',', '.'))) || 0;
    } else {
      return Math.abs(parseFloat(str.replace(/,/g, ''))) || 0;
    }
  } else if (str.includes(',')) {
    return Math.abs(parseFloat(str.replace(',', '.'))) || 0;
  }
  return Math.abs(parseFloat(str)) || 0;
}

// Convert DD/MM/YYYY to YYYY-MM-DD
export function parseSheetDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const y = match[3];
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return '';
}

// Strict Pix normalization: removes all letters, spaces, symbols, prefix "PIX", DDI (+55) and parentheses, leaving only pure numbers
export function cleanPixDigits(raw: string): string {
  if (!raw) return '';
  let s = raw.toLowerCase()
    .replace(/^pix:?\s*/i, '')
    .replace(/\+55/g, '')
    .replace(/\D/g, '');
  if (s.startsWith('55') && (s.length === 12 || s.length === 13)) {
    s = s.substring(2);
  }
  return s;
}

export function cleanPixString(raw: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/^pix:?\s*/i, '')
    .trim();
}

// Extract email from string if present
export function extractEmail(raw: string): string {
  if (!raw) return '';
  const match = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase().trim() : '';
}

// Simple CSV parser supporting quotes and commas
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // handle CRLF
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export async function fetchGoogleSheetsExpenses(forceRefresh = false): Promise<SheetExpenseRow[]> {
  const now = Date.now();
  if (!forceRefresh && cachedRows && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedRows;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      // Try fetching CSV from Google Sheets
      const response = await fetch(CSV_URL);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const csvText = await response.text();
      const parsedMatrix = parseCSV(csvText);

      if (!parsedMatrix || parsedMatrix.length <= 1) {
        throw new Error('Empty spreadsheet returned');
      }

      // Find header indices or default to standard column indices
      const headers = parsedMatrix[0].map(h => (h || '').toLowerCase().trim());
      const colCpf = headers.findIndex(h => h.includes('cpf') || h.includes('cnpj')) >= 0 ? headers.findIndex(h => h.includes('cpf') || h.includes('cnpj')) : 0;
      const colNome = headers.findIndex(h => h.includes('nome')) >= 0 ? headers.findIndex(h => h.includes('nome')) : 1;
      const colFornecedor = headers.findIndex(h => h.includes('fornecedor')) >= 0 ? headers.findIndex(h => h.includes('fornecedor')) : 2;
      const colFormaPagto = headers.findIndex(h => h.includes('forma de pagamento') || h.includes('pix')) >= 0 ? headers.findIndex(h => h.includes('forma de pagamento') || h.includes('pix')) : 3;
      const colTags = headers.findIndex(h => h.includes('tag')) >= 0 ? headers.findIndex(h => h.includes('tag')) : 4;
      const colVencimento = headers.findIndex(h => h.includes('vencimento')) >= 0 ? headers.findIndex(h => h.includes('vencimento')) : 6;
      const colCategoria = headers.findIndex(h => h.includes('categoria')) >= 0 ? headers.findIndex(h => h.includes('categoria')) : 7;
      const colObs = headers.findIndex(h => h.includes('obs')) >= 0 ? headers.findIndex(h => h.includes('obs')) : 8;
      const colDataPagamento = headers.findIndex(h => h.includes('data do pagamento') || h.includes('data pagamento') || h.includes('data pgto')) >= 0 ? headers.findIndex(h => h.includes('data do pagamento') || h.includes('data pagamento') || h.includes('data pgto')) : 10;
      const colValor = headers.findIndex(h => h === 'valor' || h.includes('valor pago') || (h.includes('valor') && !h.includes('planejado'))) >= 0 ? headers.findIndex(h => h === 'valor' || h.includes('valor pago') || (h.includes('valor') && !h.includes('planejado'))) : 11;

      const rows: SheetExpenseRow[] = [];

      for (let r = 1; r < parsedMatrix.length; r++) {
        const row = parsedMatrix[r];
        if (!row || row.length === 0) continue;

        const rawDataPagamento = (row[colDataPagamento] || '').trim();
        const dataPagamento = parseSheetDate(rawDataPagamento);
        const valorPago = parseSheetCurrency(row[colValor]);

        rows.push({
          id: `sheet-row-${r}`,
          cnpjCpf: (row[colCpf] || '').trim(),
          nome: (row[colNome] || '').trim(),
          fornecedor: (row[colFornecedor] || '').trim(),
          formaPagamentoPix: (row[colFormaPagto] || '').trim(),
          tags: (row[colTags] || '').trim(),
          vencimento: parseSheetDate(row[colVencimento] || ''),
          categoria: (row[colCategoria] || '').trim(),
          obs: (row[colObs] || '').trim(),
          dataPagamento, // empty string if not paid
          valorPago
        });
      }

      cachedRows = rows;
      lastFetchTime = Date.now();
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
      } catch (e) {}

      return rows;
    } catch (err) {
      console.warn('Erro ao carregar despesas diretamente do Google Sheets, usando cache local:', err);
      // Fallback to localStorage cache
      try {
        const local = localStorage.getItem(CACHE_KEY);
        if (local) {
          cachedRows = JSON.parse(local);
          return cachedRows || [];
        }
      } catch (e) {}
      return [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Checks if a spreadsheet row belongs to a specific user (seller) by strict Pix key, CPF, or exact name matching.
 */
export function isExpenseRowForUser(row: SheetExpenseRow, user: User): boolean {
  if (!user) return false;

  const rowColD = row.formaPagamentoPix || '';
  const rowColDDigits = cleanPixDigits(rowColD);
  const rowCpfDigits = cleanPixDigits(row.cnpjCpf);

  const userPixDigits = cleanPixDigits(user.pix || '');
  const userCpfDigits = cleanPixDigits(user.cpf || '');
  const userPhoneDigits = cleanPixDigits(user.phone || '');

  // 1. Strict Pix digits match (exact equality)
  if (userPixDigits.length >= 8 && rowColDDigits === userPixDigits) return true;
  if (userCpfDigits.length === 11 && rowColDDigits === userCpfDigits) return true;
  if (userPhoneDigits.length >= 8 && rowColDDigits === userPhoneDigits) return true;

  // 2. Strict CPF column match
  if (userCpfDigits.length === 11 && rowCpfDigits === userCpfDigits) return true;

  // 3. Strict Name / Fornecedor match (exact or specific full name contains)
  const rowFornecedor = (row.fornecedor || '').toLowerCase().trim();
  const rowNome = (row.nome || '').toLowerCase().trim();
  const userFirst = (user.salesName || user.name || '').split(' ')[0].toLowerCase().trim();

  if (userFirst.includes('bianca')) {
    if (rowFornecedor === 'bianca' || rowNome.includes('bianca torres') || rowFornecedor.includes('igarassu') || rowNome.includes('igarassu')) {
      return true;
    }
  }
  if (userFirst.includes('hellen')) {
    if (rowFornecedor === 'hellen' || rowNome.includes('hellen regina')) {
      return true;
    }
  }
  if (userFirst.includes('taciana')) {
    if (rowFornecedor === 'taciana' || rowNome.includes('taciana silva')) {
      return true;
    }
  }
  if (userFirst.includes('lucel')) {
    if (rowFornecedor === 'lucelia' || rowNome.includes('lucelia barros')) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates total paid expenses from Google Sheets within the given date interval (De / Até).
 * Rule: Coluna K (Data do Pagamento) MUST NOT be empty.
 */
export function calculateTotalExpensesFromSheet(
  rows: SheetExpenseRow[],
  startDate: string,
  endDate: string
): number {
  if (!rows || rows.length === 0) return 0;

  return rows
    .filter(r => {
      // Must be paid (dataPagamento non-empty)
      if (!r.dataPagamento) return false;
      if (startDate && r.dataPagamento < startDate) return false;
      if (endDate && r.dataPagamento > endDate) return false;
      return true;
    })
    .reduce((acc, r) => acc + r.valorPago, 0);
}

/**
 * Calculates the total cost for a specific seller from Google Sheets within the given date interval.
 */
export function calculateSellerCostFromSheet(
  rows: SheetExpenseRow[],
  user: User,
  startDate: string,
  endDate: string
): number {
  if (!user) return 0;

  if (!rows || rows.length === 0) return 0;

  return rows
    .filter(r => {
      // Must have payment date preenchida (Coluna K)
      if (!r.dataPagamento) return false;
      if (startDate && r.dataPagamento < startDate) return false;
      if (endDate && r.dataPagamento > endDate) return false;
      return isExpenseRowForUser(r, user);
    })
    .reduce((acc, r) => acc + r.valorPago, 0);
}
