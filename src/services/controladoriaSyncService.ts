import * as XLSX from 'xlsx';
import type { Proposta, ComissaoPromotora } from '../types';

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
      const dataPgto = parseDate(r[3]) || parseDate(r[4]) || dataDig;
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

      if (matchedProp) {
        matchedProposalIds.add(matchedProp.id);
        const finalDate = dataPgto || matchedProp.dataPagamentoCliente || matchedProp.dataDigitacao || '2026-09-29';
        newCommissions.push({
          id: `com-j2-${matchedProp.id}`,
          propostaId: matchedProp.id,
          numeroContrato: matchedProp.numeroContrato || contrato,
          clienteNome: matchedProp.nomeCliente,
          promotora: 'J2 Promotora',
          valorRecebido: repasse,
          dataRecebimento: finalDate,
          tipo: 'fixo',
          status: 'confirmada',
          observacao: 'Sincronizado via Google Sheets (Aba J2)'
        });
      }
    }
  }

  // 2. Process Sempre Sheet - Conciliação inteligente para propostas Sempre
  if (workbook.Sheets['Sempre']) {
    const semprePropostas = propostas.filter(p => matchesPromotora(p.promotora, 'Sempre'));
    const sempreRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['Sempre'], { header: 1 });
    totalRowsRead += Math.max(0, sempreRows.length - 1);

    for (let i = 1; i < sempreRows.length; i++) {
      const r = sempreRows[i];
      if (!r || r.length === 0) continue;
      const cpf = cleanDigits(r[0]);
      const nomeClienteRaw = String(r[1] || '').trim();
      const nomeCliente = nomeClienteRaw.toLowerCase();
      const taxaColF = String(r[5] || '').trim();
      
      // Extrai percentual numérico da taxa (ex: '20%', '17%', '18,8%')
      let taxaPercent = 0;
      const pctMatch = taxaColF.match(/(\d+(?:[.,]\d+)?)\s*%/);
      if (pctMatch) {
        taxaPercent = parseFloat(pctMatch[1].replace(',', '.'));
      } else {
        taxaPercent = parseMoney(r[7]);
      }

      const valorLiq = parseMoney(r[8]);
      const valorBruto = parseMoney(r[9]);
      const repasse = parseMoney(r[11]);
      const dataPag = parseDate(r[12]) || parseDate(r[13]);

      if (repasse <= 0) continue;

      let matchedProp: Proposta | undefined = undefined;

      // 1ª Tentativa: Contrato exato (se houver contrato válido)
      const contratoDig = cleanDigits(r[2]);
      if (contratoDig && contratoDig.length >= 4) {
        matchedProp = semprePropostas.find(p => !matchedProposalIds.has(p.id) && cleanDigits(p.numeroContrato) === contratoDig);
      }

      // 2ª Tentativa (REGRA DE CONCILIAÇÃO OFICIAL DA SEMPRE): Valor + Data + Porcentagem da Taxa
      // Resolve com precisão absoluta clientes sem nome, sem CPF ou com nomes fictícios/qwerty
      if (!matchedProp) {
        matchedProp = semprePropostas.find(p => {
          if (matchedProposalIds.has(p.id)) return false;
          const pVal = p.valorEmprestimo || 0;
          const matchVal = (valorLiq > 0 && Math.abs(pVal - valorLiq) < 15) || (valorBruto > 0 && Math.abs(pVal - valorBruto) < 15);
          if (!matchVal) return false;

          const pData = parseDate(p.dataPagamentoCliente || p.dataDigitacao);
          const pTaxa = p.percentualTaxa || (p.valorTaxa && pVal > 0 ? (p.valorTaxa / pVal) * 100 : 0);

          const matchTaxa = taxaPercent > 0 ? Math.abs(pTaxa - taxaPercent) < 2.0 : true;
          const matchData = dataPag ? (pData === dataPag || pData.substring(0, 7) === dataPag.substring(0, 7)) : true;

          return matchTaxa && matchData;
        });
      }

      // 3ª Tentativa: CPF válido + Valor (Líquido ou Bruto)
      if (!matchedProp && cpf && cpf.length === 11 && cpf !== '00000000000' && !cpf.startsWith('000000')) {
        matchedProp = semprePropostas.find(p => {
          if (matchedProposalIds.has(p.id)) return false;
          const pCpf = cleanDigits(p.cpf);
          const pVal = p.valorEmprestimo || 0;
          const matchVal = (valorLiq > 0 && Math.abs(pVal - valorLiq) < 15) || (valorBruto > 0 && Math.abs(pVal - valorBruto) < 15);
          return pCpf === cpf && matchVal;
        });
      }

      // 4ª Tentativa: Valor + Data (dentro de +/- 3 dias ou mesmo mês)
      if (!matchedProp && dataPag) {
        matchedProp = semprePropostas.find(p => {
          if (matchedProposalIds.has(p.id)) return false;
          const pData = parseDate(p.dataPagamentoCliente || p.dataDigitacao);
          const pVal = p.valorEmprestimo || 0;
          const matchVal = (valorLiq > 0 && Math.abs(pVal - valorLiq) < 15) || (valorBruto > 0 && Math.abs(pVal - valorBruto) < 15);
          return matchVal && (pData === dataPag || pData.substring(0, 7) === dataPag.substring(0, 7));
        });
      }

      // 5ª Tentativa: Nome do Cliente + Valor (exceto se for 'qwerty' ou nome genérico)
      if (!matchedProp && nomeCliente && nomeCliente.length >= 4 && !nomeCliente.includes('qwerty') && !nomeCliente.includes('cliente')) {
        matchedProp = semprePropostas.find(p => {
          if (matchedProposalIds.has(p.id)) return false;
          const pNome = String(p.nomeCliente || '').toLowerCase().trim();
          const pVal = p.valorEmprestimo || 0;
          const matchVal = (valorLiq > 0 && Math.abs(pVal - valorLiq) < 15) || (valorBruto > 0 && Math.abs(pVal - valorBruto) < 15);
          return (pNome.includes(nomeCliente) || nomeCliente.includes(pNome)) && matchVal;
        });
      }

      if (matchedProp) {
        matchedProposalIds.add(matchedProp.id);
        const finalDate = dataPag || matchedProp.dataPagamentoCliente || matchedProp.dataDigitacao || '2026-09-29';
        newCommissions.push({
          id: `com-sem-${matchedProp.id}`,
          propostaId: matchedProp.id,
          numeroContrato: matchedProp.numeroContrato || 'Sempre',
          clienteNome: matchedProp.nomeCliente, // Nome oficial do CRM vinculado
          promotora: 'Sempre',
          valorRecebido: repasse,
          dataRecebimento: finalDate,
          tipo: 'fixo',
          status: 'confirmada',
          observacao: `Conciliado com proposta #${matchedProp.numeroContrato || matchedProp.id} via Regra Valor/Data/Taxa`
        });
      }
      // Se não houver correspondência no CRM, a linha NÃO é adicionada para evitar repasses falsos na Controladoria.
    }
  }

  // 3. Process DG & GFT Sheets - Filtrando apenas propostas DG e GFT do CRM
  for (const promotoraName of ['DG', 'GFT'] as const) {
    if (workbook.Sheets[promotoraName]) {
      const targetPropostas = propostas.filter(p => matchesPromotora(p.promotora, promotoraName));
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[promotoraName], { header: 1 });
      totalRowsRead += Math.max(0, rows.length - 1);
      const contractSumMap = new Map<string, { sum: number; clientName: string; date: string }>();

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;
        const contrato = cleanDigits(r[3]) || cleanDigits(r[2]);
        const repasse = parseMoney(r[14]);
        const clientName = String(r[4] || r[0] || '').trim();
        const dateCredit = parseDate(r[9]) || parseDate(r[31]) || parseDate(r[30]);

        if (!contrato || contrato.length < 3 || repasse <= 0) continue;

        const existing = contractSumMap.get(contrato) || { sum: 0, clientName, date: dateCredit };
        existing.sum += repasse;
        if (clientName && !existing.clientName) existing.clientName = clientName;
        if (dateCredit && !existing.date) existing.date = dateCredit;
        contractSumMap.set(contrato, existing);
      }

      contractSumMap.forEach((val, contrato) => {
        const matchedProp = targetPropostas.find(p => !matchedProposalIds.has(p.id) && cleanDigits(p.numeroContrato) === contrato);
        if (matchedProp) {
          matchedProposalIds.add(matchedProp.id);
          const finalDate = val.date || matchedProp.dataPagamentoCliente || matchedProp.dataDigitacao || '2026-09-29';
          newCommissions.push({
            id: `com-${promotoraName.toLowerCase()}-${matchedProp.id}`,
            propostaId: matchedProp.id,
            numeroContrato: matchedProp.numeroContrato || contrato,
            clienteNome: matchedProp.nomeCliente,
            promotora: promotoraName as any,
            valorRecebido: val.sum,
            dataRecebimento: finalDate,
            tipo: 'fixo',
            status: 'confirmada',
            observacao: `Sincronizado via Google Sheets (Aba ${promotoraName})`
          });
        }
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
