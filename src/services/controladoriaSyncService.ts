import * as XLSX from 'xlsx';
import type { Proposta, ComissaoPromotora } from '../types/index.ts';

const SPREADSHEET_URL =
  (typeof process !== 'undefined' && process.env?.GOOGLE_SHEETS_CONTROLADORIA_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_SHEETS_CONTROLADORIA_URL) ||
  'https://docs.google.com/spreadsheets/d/1cjVYDhH1U6tP7ou81bZmUp_XUhcqgpvPjWT3QIbWQhE/export?format=xlsx';

function parseMoney(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (!str) return 0;
  str = str.replace(/R\$|\$|\s/g, '');
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

function cleanDigits(val: any): string {
  return String(val || '').replace(/\D/g, '');
}

function parseDate(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  if (!isNaN(Number(str)) && Number(str) > 20000 && Number(str) < 60000) {
    const date = new Date((Number(str) - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return str.split('T')[0] || '';
}

function matchesPromotora(propPromotora: string | undefined, target: 'J2' | 'Sempre' | 'DG' | 'GFT'): boolean {
  if (!propPromotora) return false;
  const p = propPromotora.toLowerCase().trim();
  if (target === 'J2') {
    return p.includes('j2');
  }
  if (target === 'Sempre') {
    return p.includes('sempre');
  }
  if (target === 'DG') {
    return p.includes('dg');
  }
  if (target === 'GFT') {
    return p.includes('gft');
  }
  return false;
}

export interface ProcessResult {
  commissions: ComissaoPromotora[];
  totalRowsRead: number;
}

export async function processControladoriaGoogleSheetsWithStats(propostas: Proposta[]): Promise<ProcessResult> {
  const response = await fetch(SPREADSHEET_URL);
  if (!response.ok) {
    throw new Error(`Erro ao acessar planilha do Google Sheets: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

  const newCommissions: ComissaoPromotora[] = [];
  const matchedProposalIds = new Set<string>();
  let totalRowsRead = 0;

  // 1. Process J2 Sheet - Filtrando apenas propostas J2 do CRM
  if (workbook.Sheets['J2']) {
    const j2Propostas = propostas.filter(p => matchesPromotora(p.promotora, 'J2'));
    const j2Rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['J2'], { header: 1 });
    totalRowsRead += Math.max(0, j2Rows.length - 1);

    for (let i = 1; i < j2Rows.length; i++) {
      const r = j2Rows[i];
      if (!r || r.length === 0) continue;
      const clienteNome = String(r[0] || '').trim();
      const cpf = cleanDigits(r[1]);
      const dataDig = parseDate(r[2]);
      const contrato = cleanDigits(r[5]);
      const operacaoBanco = String(r[7] || '').toLowerCase().trim();
      const valorLib = parseMoney(r[8]);
      const repasse = parseMoney(r[11]);

      if (repasse <= 0) continue;

      let matchedProp: Proposta | undefined = undefined;

      // Regra 1: Número do Contrato Exato (dentro das propostas J2)
      if (contrato && contrato.length >= 4) {
        matchedProp = j2Propostas.find(p => !matchedProposalIds.has(p.id) && cleanDigits(p.numeroContrato) === contrato);
      }

      // Regra 2 (Fallback 1): CPF + Data Digitação + Valor Liberado (dentro das propostas J2)
      if (!matchedProp && cpf && cpf.length === 11) {
        matchedProp = j2Propostas.find(p => {
          if (matchedProposalIds.has(p.id)) return false;
          const pCpf = cleanDigits(p.cpf);
          const pData = parseDate(p.dataDigitacao);
          const pVal = p.valorEmprestimo || 0;
          return pCpf === cpf && (!dataDig || pData === dataDig) && (valorLib <= 0 || Math.abs(pVal - valorLib) < 10);
        });
      }

      // Regra 3 (Fallback 2): CPF + Data Digitação + Operação/Banco (dentro das propostas J2)
      if (!matchedProp && cpf && cpf.length === 11) {
        matchedProp = j2Propostas.find(p => {
          if (matchedProposalIds.has(p.id)) return false;
          const pCpf = cleanDigits(p.cpf);
          const pData = parseDate(p.dataDigitacao);
          const pOp = String(p.operacao || '').toLowerCase();
          return pCpf === cpf && (!dataDig || pData === dataDig) && (operacaoBanco.includes(pOp) || pOp.includes(operacaoBanco));
        });
      }

      const deterministicId = matchedProp
        ? `com-j2-${matchedProp.id}`
        : `com-j2-row-${contrato || cpf || i}`;

      if (matchedProp) {
        matchedProposalIds.add(matchedProp.id);
      }

      newCommissions.push({
        id: deterministicId,
        propostaId: matchedProp?.id || '',
        numeroContrato: matchedProp?.numeroContrato || contrato || 'J2',
        clienteNome: matchedProp?.nomeCliente || clienteNome || 'Cliente J2',
        promotora: 'J2 Promotora',
        valorRecebido: repasse,
        dataRecebimento: new Date().toISOString().split('T')[0],
        tipo: 'fixo',
        status: 'confirmada',
        observacao: 'Sincronizado via Google Sheets (Aba J2)'
      });
    }
  }

  // 2. Process Sempre Sheet - Filtrando apenas propostas Sempre do CRM
  if (workbook.Sheets['Sempre']) {
    const semprePropostas = propostas.filter(p => matchesPromotora(p.promotora, 'Sempre'));
    const sempreRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['Sempre'], { header: 1 });
    totalRowsRead += Math.max(0, sempreRows.length - 1);

    for (let i = 1; i < sempreRows.length; i++) {
      const r = sempreRows[i];
      if (!r || r.length === 0) continue;
      const cpf = cleanDigits(r[0]);
      const nomeCliente = String(r[1] || '').trim().toLowerCase();
      const taxaColF = String(r[5] || '').trim();
      const taxaLast3 = taxaColF.slice(-3);
      const valor = parseMoney(r[9]);
      const repasse = parseMoney(r[11]);
      const dataPag = parseDate(r[12]);

      if (repasse <= 0) continue;

      let matchedProp: Proposta | undefined = undefined;

      // 1ª Tentativa: Nome do Cliente + Valor (dentro das propostas Sempre)
      if (nomeCliente && nomeCliente.length >= 3) {
        matchedProp = semprePropostas.find(p => {
          if (matchedProposalIds.has(p.id)) return false;
          const pNome = String(p.nomeCliente || '').toLowerCase().trim();
          const pVal = p.valorEmprestimo || 0;
          return (pNome.includes(nomeCliente) || nomeCliente.includes(pNome)) && (valor <= 0 || Math.abs(pVal - valor) < 10);
        });
      }

      // 2ª Tentativa: CPF + Valor (dentro das propostas Sempre)
      if (!matchedProp && cpf && cpf.length === 11) {
        matchedProp = semprePropostas.find(p => {
          if (matchedProposalIds.has(p.id)) return false;
          const pCpf = cleanDigits(p.cpf);
          const pVal = p.valorEmprestimo || 0;
          return pCpf === cpf && (valor <= 0 || Math.abs(pVal - valor) < 10);
        });
      }

      // 3ª Tentativa: Data + Valor + Taxa (últimos 3 caracteres) (dentro das propostas Sempre)
      if (!matchedProp && dataPag) {
        matchedProp = semprePropostas.find(p => {
          if (matchedProposalIds.has(p.id)) return false;
          const pData = parseDate(p.dataPagamentoCliente || p.dataDigitacao);
          const pVal = p.valorEmprestimo || 0;
          const pTaxaStr = String(p.percentualTaxa || p.valorTaxa || '');
          return pData === dataPag && (valor <= 0 || Math.abs(pVal - valor) < 10) && (taxaLast3 && pTaxaStr.endsWith(taxaLast3));
        });
      }

      // 4ª Tentativa: Data + Valor (dentro das propostas Sempre)
      if (!matchedProp && dataPag) {
        matchedProp = semprePropostas.find(p => {
          if (matchedProposalIds.has(p.id)) return false;
          const pData = parseDate(p.dataPagamentoCliente || p.dataDigitacao);
          const pVal = p.valorEmprestimo || 0;
          return pData === dataPag && (valor <= 0 || Math.abs(pVal - valor) < 10);
        });
      }

      const deterministicId = matchedProp
        ? `com-sem-${matchedProp.id}`
        : `com-sem-row-${cpf || i}`;

      if (matchedProp) {
        matchedProposalIds.add(matchedProp.id);
      }

      newCommissions.push({
        id: deterministicId,
        propostaId: matchedProp?.id || '',
        numeroContrato: matchedProp?.numeroContrato || 'Sempre',
        clienteNome: matchedProp?.nomeCliente || String(r[1] || 'Cliente Sempre').trim(),
        promotora: 'Sempre',
        valorRecebido: repasse,
        dataRecebimento: new Date().toISOString().split('T')[0],
        tipo: 'fixo',
        status: 'confirmada',
        observacao: 'Sincronizado via Google Sheets (Aba Sempre)'
      });
    }
  }

  // 3. Process DG & GFT Sheets - Filtrando apenas propostas DG e GFT do CRM
  for (const promotoraName of ['DG', 'GFT'] as const) {
    if (workbook.Sheets[promotoraName]) {
      const targetPropostas = propostas.filter(p => matchesPromotora(p.promotora, promotoraName));
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[promotoraName], { header: 1 });
      totalRowsRead += Math.max(0, rows.length - 1);
      const contractSumMap = new Map<string, { sum: number; clientName: string }>();

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;
        const contrato = cleanDigits(r[2]);
        const repasse = parseMoney(r[14]);
        const clientName = String(r[0] || '').trim();

        if (!contrato || contrato.length < 3 || repasse <= 0) continue;

        const existing = contractSumMap.get(contrato) || { sum: 0, clientName };
        existing.sum += repasse;
        if (clientName && !existing.clientName) existing.clientName = clientName;
        contractSumMap.set(contrato, existing);
      }

      contractSumMap.forEach((val, contrato) => {
        const matchedProp = targetPropostas.find(p => !matchedProposalIds.has(p.id) && cleanDigits(p.numeroContrato) === contrato);
        const deterministicId = matchedProp
          ? `com-${promotoraName.toLowerCase()}-${matchedProp.id}`
          : `com-${promotoraName.toLowerCase()}-ctr-${contrato}`;

        if (matchedProp) {
          matchedProposalIds.add(matchedProp.id);
        }

        newCommissions.push({
          id: deterministicId,
          propostaId: matchedProp?.id || '',
          numeroContrato: matchedProp?.numeroContrato || contrato,
          clienteNome: matchedProp?.nomeCliente || val.clientName || `Cliente ${promotoraName}`,
          promotora: promotoraName as any,
          valorRecebido: val.sum,
          dataRecebimento: new Date().toISOString().split('T')[0],
          tipo: 'fixo',
          status: 'confirmada',
          observacao: `Sincronizado via Google Sheets (Aba ${promotoraName})`
        });
      });
    }
  }

  return { commissions: newCommissions, totalRowsRead };
}

export async function processControladoriaGoogleSheets(propostas: Proposta[]): Promise<ComissaoPromotora[]> {
  const result = await processControladoriaGoogleSheetsWithStats(propostas);
  return result.commissions;
}

export interface SyncStatsResult {
  success: boolean;
  lidos: number;
  novos: number;
  atualizados: number;
  totalFinal: number;
  mensagem: string;
}

export async function executeControladoriaSyncWithBackup(
  propostas: Proposta[],
  currentCommissions: ComissaoPromotora[],
  saveComissaoBatchFn: (commissions: ComissaoPromotora[]) => void
): Promise<SyncStatsResult> {
  // 1. Guardar cópia de segurança antes da sincronização
  try {
    localStorage.setItem('lviacred_comissoes_backup', JSON.stringify(currentCommissions));
  } catch (e) {
    console.warn('Backup local não pôde ser gravado:', e);
  }

  // 2. Ler planilha (se falhar, lança erro e nada muda)
  const { commissions: sheetCommissions, totalRowsRead } = await processControladoriaGoogleSheetsWithStats(propostas);

  // 3. Substituir a sincronização anterior pela nova lista com matching estrito por promotora, mantendo apenas lançamentos manuais
  const manualCommissions = currentCommissions.filter(c => !c.observacao?.includes('Sincronizado via Google Sheets'));

  const finalCommissionsMap = new Map<string, ComissaoPromotora>();
  manualCommissions.forEach(c => finalCommissionsMap.set(c.id, c));
  sheetCommissions.forEach(c => finalCommissionsMap.set(c.id, c));

  const finalCommissionsList = Array.from(finalCommissionsMap.values());

  // 4. Salvar nova lista reprocessada
  saveComissaoBatchFn(finalCommissionsList);

  return {
    success: true,
    lidos: totalRowsRead,
    novos: sheetCommissions.length,
    atualizados: 0,
    totalFinal: finalCommissionsList.length,
    mensagem: `Sincronização reprocessada com sucesso! Linhas lidas: ${totalRowsRead} | Repasses reclassificados por promotora: ${sheetCommissions.length} | Total no sistema: ${finalCommissionsList.length}`
  };
}
