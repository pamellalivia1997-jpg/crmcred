import { Proposta, MetaVendedora, User, StatusProposta, ComissaoPromotora, ContaPagar } from '../types';
import { isSameSeller, normalizeSellerName } from './formatters';
import { calculateTotalExpensesFromSheet, calculateSellerCostFromSheet } from '../services/expensesSheetService';

export interface SellerRankingItem {
  nome: string;
  vendas: number;
  taxa: number;
  count: number;
  meta: number;
}

export interface EmployeeProfitabilityItem {
  nome: string;
  vendas: number;
  taxas: number;
  comissaoPromotora: number;
  custo: number;
  rentabilidadeLiquida: number;
}

export interface DashboardMetrics {
  filteredPropostas: Proposta[];
  totalVendas: number;
  totalTaxas: number;
  totalComissoesPromotoras: number;
  totalDespesas: number;
  lucroLiquido: number;
  vendasPorVendedora: Record<string, number>;
  taxasPorVendedora: Record<string, number>;
  contratosPorVendedora: Record<string, number>;
  contratosFormalizadosEPagos: Proposta[];
  propostasPorEtapa: Record<StatusProposta, number>;
  metaPeriodo: number;
  rankingVendedoras: SellerRankingItem[];
  employeeProfitability: EmployeeProfitabilityItem[];
}

/**
 * Normaliza qualquer formato de data (YYYY-MM-DD ou DD/MM/YYYY) para ISO YYYY-MM-DD
 */
export function normalizeDateToISO(dateStr?: string | null): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim().split(' ')[0].replace(/\./g, '/').replace(/-/g, '/');
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        // DD/MM/YYYY
        let year = parts[2];
        if (year.length === 2) year = `20${year}`;
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  return str.substring(0, 10);
}

/**
 * Determina se a proposta representa uma contratação formalizada e paga.
 * Inclui:
 * 1. Status 'Paga' / 'Pago' (qualquer variação de maiúsculas/minúsculas)
 * 2. Status 'Formalizada', 'Liquidada', 'Concluída', 'Finalizada' ou contendo 'PAG'
 * 3. Propostas com clientePagouTaxa ou taxaPaga confirmadas (assessoria / comissão liquidada)
 * 4. Propostas com data de pagamento ao cliente confirmada
 * 5. Operações de Assessoria formalizadas
 * Exclui:
 * Canceladas e Simulações sem pagamento.
 */
export function isContratoPago(p: Proposta): boolean {
  if (!p) return false;
  const statusStr = String(p.status || '').trim().toUpperCase();

  // Cancelamento explícito sem pagamento de taxa
  if (statusStr === 'CANCELADA' || statusStr === 'CANCELADO' || statusStr.includes('CANCEL')) {
    return false;
  }

  // 1. Status pago direto ou formalizado
  if (
    statusStr === 'PAGA' ||
    statusStr === 'PAGO' ||
    statusStr.includes('PAG') ||
    statusStr === 'LIQUIDADA' ||
    statusStr === 'LIQUIDADO' ||
    statusStr === 'FORMALIZADA' ||
    statusStr === 'FORMALIZADO' ||
    statusStr === 'CONCLUIDA' ||
    statusStr === 'CONCLUÍDA' ||
    statusStr === 'FINALIZADA'
  ) {
    return true;
  }

  // 2. Se a taxa da contratação foi paga (assessoria liquidada)
  if (isTaxaPaga(p)) {
    return true;
  }

  // 3. Se possui data de pagamento confirmada ao cliente
  if (p.dataPagamentoCliente && p.dataPagamentoCliente.trim() !== '' && p.dataPagamentoCliente !== '0') {
    return true;
  }

  // 4. Operação de assessoria formalizada
  const opStr = String(p.operacao || '').trim().toUpperCase();
  if (opStr.includes('ASSESSORIA')) {
    return true;
  }

  return false;
}

/**
 * Helper to accurately match a proposal seller with an application user.
 */
export function matchesSeller(pSeller: string | undefined | null, emp: User): boolean {
  if (!pSeller) return false;
  const pLower = pSeller.toLowerCase().trim();
  const empNameLower = (emp.name || '').toLowerCase().trim();
  const empSalesLower = (emp.salesName || '').toLowerCase().trim();

  // If proposal seller is Igarassu / Loja, match to Bianca or user with Loja Igarassu
  const isPropIgarassu = pLower.includes('igarassu') || pLower.includes('loja');
  const isEmpBianca =
    empNameLower.includes('bianca') ||
    empSalesLower.includes('bianca') ||
    empSalesLower.includes('igarassu') ||
    empNameLower.includes('igarassu') ||
    emp.id === 'user-bianca';
  if (isPropIgarassu && isEmpBianca) return true;

  // Specific name checks
  if (pLower.includes('hellen') && (empNameLower.includes('hellen') || empSalesLower.includes('hellen') || emp.id === 'user-hellen')) return true;
  if (
    (pLower.includes('luc') || pLower.includes('lucelia') || pLower.includes('lucélia') || pLower.includes('lucilia') || pLower.includes('lucília')) &&
    (empNameLower.includes('luc') || empSalesLower.includes('luc') || emp.id === 'user-lucilia' || emp.id === 'user-lucelia')
  )
    return true;
  if (pLower.includes('taciana') && (empNameLower.includes('taciana') || empSalesLower.includes('taciana') || emp.id === 'user-taciana')) return true;
  if (pLower.includes('ana') && (empNameLower.includes('ana') || empSalesLower.includes('ana') || emp.id === 'user-ana')) return true;

  const normP = normalizeSellerName(pSeller);
  const normName = normalizeSellerName(emp.name);
  const normSales = normalizeSellerName(emp.salesName);
  return normP === normName || normP === normSales || normP.includes(normName) || normName.includes(normP);
}

/**
 * Relacionamento preciso entre proposta, vendedora e digitadora:
 * Prioriza a vendedora declarada. Se a vendedora for genérica ou apontar para
 * a digitadora (ex: Ana Paula), recorre ao campo digitador para identificar
 * a vendedora responsável pela contratação, garantindo que propostas digitadas
 * pela equipe de apoio sejam atribuídas corretamente à consultora.
 */
export function matchProposalToSeller(p: Proposta, emp: User): boolean {
  if (!p) return false;

  // 1. Verificação direta pelo campo vendedora
  if (p.vendedora && matchesSeller(p.vendedora, emp)) {
    return true;
  }

  // 2. Se a vendedora estiver vazia ou for a digitadora, ou se o digitador for a consultora
  if (p.digitador && matchesSeller(p.digitador, emp)) {
    return true;
  }

  return false;
}

/**
 * Helper for robust tax payment detection
 */
export function isTaxaPaga(p: Proposta): boolean {
  if (!p) return false;
  const val = p.taxaPaga;
  const cliVal = p.clientePagouTaxa;
  if (val === true || cliVal === true) return true;
  const sVal = String(val || '').toUpperCase().trim();
  const sCliVal = String(cliVal || '').toUpperCase().trim();
  return sVal === 'SIM' || sVal === 'S' || sVal === 'TRUE' || sVal === 'PAGA' || sVal === 'PAGO' ||
         sCliVal === 'SIM' || sCliVal === 'S' || sCliVal === 'TRUE' || sCliVal === 'PAGA' || sCliVal === 'PAGO';
}

/**
 * Standardizes a seller name. Maps "Loja Igarassu" or variations of "Igarassu" to "Bianca".
 */
export function getStandardizedSellerName(name?: string): string {
  if (!name) return 'Outros';
  const clean = name.trim();
  const lower = clean.toLowerCase();
  if (lower.includes('igarassu') || lower.includes('loja')) {
    return 'Loja Igarassu';
  }
  // Standardize common names
  if (lower.includes('hellen')) return 'Hellen';
  if (lower.includes('taciana')) return 'Taciana';
  if (lower.includes('lucelia') || lower.includes('lucélia')) return 'Lucélia';
  if (lower.includes('ana') && lower.includes('paula')) return 'Ana Paula';
  return clean;
}

/**
 * Checks if a period (dataInicio to dataFim) is a full closed month.
 */
export function isFullClosedMonth(dataInicio: string, dataFim: string): boolean {
  if (!dataInicio || !dataFim) return false;
  const cleanStart = dataInicio.substring(0, 10);
  const cleanEnd = dataFim.substring(0, 10);
  const startParts = cleanStart.split('-');
  const endParts = cleanEnd.split('-');
  if (startParts.length !== 3 || endParts.length !== 3) return false;

  // Must start on day 01
  if (startParts[2] !== '01') return false;

  // Must be same year and month
  if (startParts[0] !== endParts[0] || startParts[1] !== endParts[1]) return false;

  // Must end on the last day of that month
  const year = parseInt(startParts[0]);
  const month = parseInt(startParts[1]);
  const lastDay = new Date(year, month, 0).getDate();
  return parseInt(endParts[2]) === lastDay;
}

/**
 * Calculates the meta for a given period.
 */
export function calculateMetaForPeriod(
  dataInicio: string,
  dataFim: string,
  metas: MetaVendedora[],
  users: User[]
): number {
  if (!dataInicio || !dataFim) return 400000;

  const activeCompetenceMonth = dataInicio.substring(0, 7);
  const savedMetasForMonth = metas.filter(m => m.mesAno === activeCompetenceMonth);
  const masterLojaMeta = savedMetasForMonth.find(m => m.vendedoraId === 'loja');
  
  let storeMetaMonthly = 400000; // Default fallback

  if (masterLojaMeta && masterLojaMeta.metaVenda > 0) {
    storeMetaMonthly = masterLojaMeta.metaVenda;
  } else {
    const activeSellerIds = new Set(users.filter(u => u.role === 'vendedora').map(u => u.id));
    const uniqueMetasMap = new Map<string, number>();
    
    savedMetasForMonth.forEach(m => {
      if (m.vendedoraId !== 'loja' && m.isAtivoNoMes !== false && activeSellerIds.has(m.vendedoraId)) {
        uniqueMetasMap.set(m.vendedoraId, m.metaVenda || 0);
      }
    });

    // Valid if all active sellers have a meta > 0 saved
    const allActiveSellersHaveSavedMeta = activeSellerIds.size > 0 && Array.from(activeSellerIds).every(id => (uniqueMetasMap.get(id) || 0) > 0);

    if (allActiveSellersHaveSavedMeta) {
      const sum = Array.from(uniqueMetasMap.values()).reduce((acc, val) => acc + val, 0);
      if (sum > 0) {
        storeMetaMonthly = sum;
      }
    } else {
      storeMetaMonthly = 400000;
    }
  }

  if (isFullClosedMonth(dataInicio, dataFim)) {
    return storeMetaMonthly;
  }

  const cleanStart = dataInicio.substring(0, 10);
  const cleanEnd = dataFim.substring(0, 10);
  const sParts = cleanStart.split('-');
  const eParts = cleanEnd.split('-');
  const sDate = new Date(parseInt(sParts[0]), parseInt(sParts[1]) - 1, parseInt(sParts[2]));
  const eDate = new Date(parseInt(eParts[0]), parseInt(eParts[1]) - 1, parseInt(eParts[2]));
  const diffDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const periodMultiplier = diffDays / 30;

  return storeMetaMonthly * periodMultiplier;
}

/**
 * Centralized dashboard metrics calculation function.
 * Receives the list of proposals and the date range filter, and returns all computed statistics.
 */
export function calculateDashboardMetrics(
  propostas: Proposta[],
  dataInicio: string,
  dataFim: string,
  metas: MetaVendedora[],
  users: User[],
  comissoesPromotoras: ComissaoPromotora[] = [],
  sheetExpenses: any[] = [],
  contasPagar: ContaPagar[] = []
): DashboardMetrics {
  const cleanStart = dataInicio.substring(0, 10);
  const cleanEnd = dataFim.substring(0, 10);

  // 1. Filtro de propostas por período financeiro de competência
  // Considera a data de formalização / pagamento ao cliente prioritariamente,
  // ou a data de digitação do contrato.
  const filteredPropostas = propostas.filter(p => {
    const digiIso = normalizeDateToISO(p.dataDigitacao);
    const pagtoIso = normalizeDateToISO(p.dataPagamentoCliente);

    const inDigi = Boolean(digiIso && digiIso >= cleanStart && digiIso <= cleanEnd);
    const inPagto = Boolean(pagtoIso && pagtoIso >= cleanStart && pagtoIso <= cleanEnd);

    return inDigi || inPagto;
  });

  // 2. Contratos Formalizados e Pagos (regras reais de liquidação de crédito e assessoria)
  const contratosFormalizadosEPagos = filteredPropostas.filter(isContratoPago);

  // 3. Total de Vendas (Soma do valor do empréstimo de todos os contratos formalizados/pagos no período)
  const totalVendas = contratosFormalizadosEPagos.reduce((acc, p) => acc + Number(p.valorEmprestimo || 0), 0);

  // 4. Total de Taxas (Soma do valor da taxa de contratos com taxa quitada no período)
  const totalTaxas = filteredPropostas
    .filter(isTaxaPaga)
    .reduce((acc, p) => acc + Number(p.valorTaxa || 0), 0);

  const activeCompetenceMonth = dataInicio.substring(0, 7);

  // 4. Determine Active sellers considering temporal admission and deactivation rules
  const activeSellers = users.filter(u => {
    if (u.role !== 'vendedora') return false;

    const admissaoMes = u.dataAdmissao ? u.dataAdmissao.trim().substring(0, 7) : '';
    const desativacaoMes = u.dataDesativacao ? u.dataDesativacao.trim().substring(0, 7) : '';

    // If admitted in a future month relative to competence month, not eligible
    if (admissaoMes && activeCompetenceMonth < admissaoMes) return false;

    // If deactivated before or in this month relative to competence month, not eligible
    if (desativacaoMes && activeCompetenceMonth >= desativacaoMes) return false;

    const foundMeta = metas.find(m => 
      m.mesAno === activeCompetenceMonth && (
        m.vendedoraId === u.id || 
        isSameSeller(m.vendedoraNome, u.name) ||
        (u.salesName && isSameSeller(m.vendedoraNome, u.salesName))
      )
    );

    if (foundMeta) {
      if (foundMeta.isAtivoNoMes === false) return false;
    } else if (u.status !== 'ativo') {
      return false;
    }

    return true;
  });

  // 5. Proportionality for Meta
  const sParts = cleanStart.split('-');
  const eParts = cleanEnd.split('-');
  const sDate = new Date(parseInt(sParts[0]), parseInt(sParts[1]) - 1, parseInt(sParts[2]));
  const eDate = new Date(parseInt(eParts[0]), parseInt(eParts[1]) - 1, parseInt(eParts[2]));
  const diffDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const periodMultiplier = isFullClosedMonth(dataInicio, dataFim) ? 1.0 : (diffDays / 30);

  const activeSellerIds = new Set(activeSellers.map(u => u.id));
  const savedMetasForMonth = metas.filter(m => m.mesAno === activeCompetenceMonth);
  const allActiveSellersHaveSavedMeta = activeSellerIds.size > 0 && Array.from(activeSellerIds).every(id => {
    const m = savedMetasForMonth.find(sm => sm.vendedoraId === id || isSameSeller(sm.vendedoraNome, users.find(u => u.id === id)?.name || ''));
    return m && (m.metaVenda || 0) > 0;
  });

  const getSellerPeriodMeta = (user: any): number => {
    if (allActiveSellersHaveSavedMeta) {
      const foundMeta = savedMetasForMonth.find(m => 
        (m.vendedoraId === user.id || isSameSeller(m.vendedoraNome, user.name))
      );
      if (foundMeta && foundMeta.metaVenda > 0) {
        return foundMeta.metaVenda * periodMultiplier;
      }
    }
    const count = Math.max(1, activeSellers.length);
    return Math.round(400000 / count) * periodMultiplier;
  };

  // 6. Sales and Fees grouped by standardized vendedora name using looser matching
  const rankingVendedorasMap = new Map<string, SellerRankingItem>();
  activeSellers.forEach(u => {
    rankingVendedorasMap.set(u.id, { 
      nome: u.salesName || u.name, 
      vendas: 0, 
      taxa: 0, 
      count: 0, 
      meta: getSellerPeriodMeta(u) 
    });
  });

  let outrosVendas = 0;
  let outrosTaxa = 0;
  let outrosCount = 0;

  // Process sales from paid contracts with accurate seller & digitador matching
  contratosFormalizadosEPagos.forEach(p => {
    const activeSeller = activeSellers.find(emp => matchProposalToSeller(p, emp));
    const val = Number(p.valorEmprestimo || 0);
    if (activeSeller) {
      const item = rankingVendedorasMap.get(activeSeller.id);
      if (item) {
        item.vendas += val;
        item.count += 1;
      }
    } else {
      outrosVendas += val;
      outrosCount += 1;
    }
  });

  // Process taxes from all proposals where tax is paid with accurate seller & digitador matching
  filteredPropostas.filter(isTaxaPaga).forEach(p => {
    const activeSeller = activeSellers.find(emp => matchProposalToSeller(p, emp));
    const taxaVal = Number(p.valorTaxa || 0);
    if (activeSeller) {
      const item = rankingVendedorasMap.get(activeSeller.id);
      if (item) {
        item.taxa += taxaVal;
      }
    } else {
      outrosTaxa += taxaVal;
    }
  });

  const rankingVendedoras = Array.from(rankingVendedorasMap.values());
  if (outrosCount > 0 || outrosVendas > 0 || outrosTaxa > 0) {
    rankingVendedoras.push({
      nome: 'Outros',
      vendas: outrosVendas,
      taxa: outrosTaxa,
      count: outrosCount,
      meta: 0
    });
  }
  rankingVendedoras.sort((a, b) => b.vendas - a.vendas);

  // Synchronize Record-based mappings for legacy components
  const vendasPorVendedora: Record<string, number> = {};
  const taxasPorVendedora: Record<string, number> = {};
  const contratosPorVendedora: Record<string, number> = {};

  rankingVendedoras.forEach(r => {
    vendasPorVendedora[r.nome] = r.vendas;
    taxasPorVendedora[r.nome] = r.taxa;
    contratosPorVendedora[r.nome] = r.count;
  });

  // 8. Stage/Funnel counts
  const propostasPorEtapa: Record<StatusProposta, number> = {
    'Simuladas': 0,
    'Em análise': 0,
    'Paga': 0,
    'Cancelada': 0
  };

  filteredPropostas.forEach(p => {
    const status = p.status as StatusProposta;
    if (propostasPorEtapa[status] !== undefined) {
      propostasPorEtapa[status] += 1;
    } else {
      propostasPorEtapa['Em análise'] += 1;
    }
  });

  const metaPeriodo = calculateMetaForPeriod(dataInicio, dataFim, metas, users);

  // 9. Total commissions directly from proposals (single-source of truth) with legacy fallback
  const totalComissoesPromotoras = contratosFormalizadosEPagos.reduce((acc, p) => {
    const directVal = Number(p.valorRepasse || 0);
    if (directVal > 0) return acc + directVal;
    const legacyCom = comissoesPromotoras.find(c => c.propostaId === p.id && c.status === 'confirmada');
    return acc + (legacyCom ? Number(legacyCom.valorRecebido || 0) : 0);
  }, 0);

  let totalDespesas = 0;
  if (sheetExpenses && sheetExpenses.length > 0) {
    totalDespesas = calculateTotalExpensesFromSheet(sheetExpenses, cleanStart, cleanEnd);
  } else {
    const cp = contasPagar.filter(c => {
      if (!c.vencimento) return false;
      return c.vencimento >= cleanStart && c.vencimento <= cleanEnd;
    });
    totalDespesas = cp.reduce((acc, c) => acc + c.valor, 0);
  }

  const faturamentoBruto = totalTaxas + totalComissoesPromotoras;
  const lucroLiquido = faturamentoBruto - totalDespesas;

  // 10. Rentabilidade Líquida por Atendente (Employee Profitability)
  const employeeProfitability = activeSellers.map(emp => {
    const empProps = contratosFormalizadosEPagos.filter(p => matchProposalToSeller(p, emp));
    const empTaxProps = filteredPropostas.filter(p => isTaxaPaga(p) && matchProposalToSeller(p, emp));

    const vendas = empProps.reduce((acc, p) => acc + (p.valorEmprestimo || 0), 0);
    const taxas = empTaxProps.reduce((acc, p) => acc + (p.valorTaxa || 0), 0);

    const comissaoPromotora = empProps.reduce((acc, p) => {
      const directVal = Number(p.valorRepasse || 0);
      if (directVal > 0) return acc + directVal;
      const legacyCom = comissoesPromotoras.find(c => c.propostaId === p.id && c.status === 'confirmada');
      return acc + (legacyCom ? Number(legacyCom.valorRecebido || 0) : 0);
    }, 0);

    let custo = 0;
    if (sheetExpenses && sheetExpenses.length > 0) {
      custo = calculateSellerCostFromSheet(sheetExpenses, emp, cleanStart, cleanEnd);
    }

    const rentabilidadeLiquida = (taxas + comissaoPromotora) - custo;

    return {
      nome: emp.salesName || emp.name,
      vendas,
      taxas,
      comissaoPromotora,
      custo,
      rentabilidadeLiquida
    };
  }).sort((a, b) => b.rentabilidadeLiquida - a.rentabilidadeLiquida);

  return {
    filteredPropostas,
    totalVendas,
    totalTaxas,
    totalComissoesPromotoras,
    totalDespesas,
    lucroLiquido,
    vendasPorVendedora,
    taxasPorVendedora,
    contratosPorVendedora,
    contratosFormalizadosEPagos,
    propostasPorEtapa,
    metaPeriodo,
    rankingVendedoras,
    employeeProfitability
  };
}
