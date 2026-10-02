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
 * Standardizes a seller name. Maps "Loja Igarassu" or variations of "Igarassu" to "Bianca".
 */
export function getStandardizedSellerName(name?: string): string {
  if (!name) return 'Outros';
  const clean = name.trim();
  const lower = clean.toLowerCase();
  if (lower.includes('igarassu') || lower.includes('loja')) {
    return 'Bianca';
  }
  // Standardize common names
  if (lower.includes('hellen')) return 'Hellen Vasconcelos';
  if (lower.includes('taciana')) return 'Taciana Silva';
  if (lower.includes('lucelia') || lower.includes('lucélia')) return 'Lucélia Ramos';
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

    const sum = Array.from(uniqueMetasMap.values()).reduce((acc, val) => acc + val, 0);
    if (sum > 0) {
      storeMetaMonthly = sum;
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

  // 1. Filter proposals strictly within dateRange by dataDigitacao and excluding "ASSESSORIA" promotora
  const filteredPropostas = propostas.filter(p => {
    const dataDigi = p.dataDigitacao ? p.dataDigitacao.substring(0, 10) : '';
    if (!dataDigi) return false;

    const dentroDoPeriodo = dataDigi >= cleanStart && dataDigi <= cleanEnd;

    const promotoraUpper = (p.promotora || '').toUpperCase().trim();
    const naoEhAssessoria = promotoraUpper !== 'ASSESSORIA' && !promotoraUpper.includes('ASSESSORIA');

    return dentroDoPeriodo && naoEhAssessoria;
  });

  // 2. Total sales (Sum of valorEmprestimo)
  const totalVendas = filteredPropostas.reduce((acc, p) => acc + Number(p.valorEmprestimo || 0), 0);

  // 3. Total fees (Sum of valorTaxa where paid)
  const totalTaxas = filteredPropostas
    .filter(p => p.taxaPaga === true || String(p.taxaPaga).toUpperCase() === 'SIM' || p.clientePagouTaxa === true)
    .reduce((acc, p) => acc + Number(p.valorTaxa || 0), 0);

  const activeCompetenceMonth = dataInicio.substring(0, 7);

  // 4. Determine Active sellers
  const activeSellers = users.filter(u => {
    if (u.role !== 'vendedora') return false;
    if (u.status !== 'ativo') return false;
    const foundMeta = metas.find(m => 
      m.vendedoraId === u.id || 
      isSameSeller(m.vendedoraNome, u.name) ||
      (u.salesName && isSameSeller(m.vendedoraNome, u.salesName))
    );
    if (foundMeta && foundMeta.isAtivoNoMes === false) return false;
    return true;
  });

  // 5. Proportionality for Meta
  const sParts = cleanStart.split('-');
  const eParts = cleanEnd.split('-');
  const sDate = new Date(parseInt(sParts[0]), parseInt(sParts[1]) - 1, parseInt(sParts[2]));
  const eDate = new Date(parseInt(eParts[0]), parseInt(eParts[1]) - 1, parseInt(eParts[2]));
  const diffDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const periodMultiplier = isFullClosedMonth(dataInicio, dataFim) ? 1.0 : (diffDays / 30);

  const getSellerPeriodMeta = (user: any): number => {
    const foundMeta = metas.find(m => 
      (m.vendedoraId === user.id || isSameSeller(m.vendedoraNome, user.name)) && 
      m.mesAno === activeCompetenceMonth
    );
    return (foundMeta && foundMeta.metaVenda > 0) 
      ? foundMeta.metaVenda * periodMultiplier
      : 0;
  };

  // 6. Sales and Fees grouped by standardized vendedora name
  const vendasPorVendedora: Record<string, number> = {};
  const taxasPorVendedora: Record<string, number> = {};
  const contratosPorVendedora: Record<string, number> = {};

  activeSellers.forEach(u => {
    vendasPorVendedora[u.name] = 0;
    taxasPorVendedora[u.name] = 0;
    contratosPorVendedora[u.name] = 0;
  });
  vendasPorVendedora['Outros'] = 0;
  taxasPorVendedora['Outros'] = 0;
  contratosPorVendedora['Outros'] = 0;

  // Build ranking sellersMap
  const sellersMap = new Map<string, SellerRankingItem>();
  activeSellers.forEach(u => {
    sellersMap.set(u.name, { 
      nome: u.name, 
      vendas: 0, 
      taxa: 0, 
      count: 0, 
      meta: getSellerPeriodMeta(u) 
    });
  });

  let outrosVendas = 0;
  let outrosTaxa = 0;
  let outrosCount = 0;

  filteredPropostas.forEach(p => {
    const stdName = getStandardizedSellerName(p.vendedora);
    
    // Find active seller matching this standardized name
    const activeSeller = activeSellers.find(u => 
      isSameSeller(u.name, stdName) || (u.salesName && isSameSeller(u.salesName, stdName))
    );

    const isTaxaPaid = p.taxaPaga === true || String(p.taxaPaga).toUpperCase() === 'SIM' || p.clientePagouTaxa === true;
    const val = Number(p.valorEmprestimo || 0);
    const taxaVal = Number(p.valorTaxa || 0);

    if (activeSeller) {
      vendasPorVendedora[activeSeller.name] = (vendasPorVendedora[activeSeller.name] || 0) + val;
      contratosPorVendedora[activeSeller.name] = (contratosPorVendedora[activeSeller.name] || 0) + 1;
      if (isTaxaPaid) {
        taxasPorVendedora[activeSeller.name] = (taxasPorVendedora[activeSeller.name] || 0) + taxaVal;
      }

      const rep = sellersMap.get(activeSeller.name);
      if (rep) {
        rep.vendas += val;
        if (isTaxaPaid) {
          rep.taxa += taxaVal;
        }
        rep.count += 1;
      }
    } else {
      vendasPorVendedora['Outros'] = (vendasPorVendedora['Outros'] || 0) + val;
      contratosPorVendedora['Outros'] = (contratosPorVendedora['Outros'] || 0) + 1;
      if (isTaxaPaid) {
        taxasPorVendedora['Outros'] = (taxasPorVendedora['Outros'] || 0) + taxaVal;
      }

      outrosVendas += val;
      if (isTaxaPaid) {
        outrosTaxa += taxaVal;
      }
      outrosCount += 1;
    }
  });

  const rankingVendedoras = Array.from(sellersMap.values());
  if (outrosCount > 0) {
    rankingVendedoras.push({
      nome: 'Outros',
      vendas: outrosVendas,
      taxa: outrosTaxa,
      count: outrosCount,
      meta: 0
    });
  }
  rankingVendedoras.sort((a, b) => b.vendas - a.vendas);

  // 7. Contracts with status 'Paga'
  const contratosFormalizadosEPagos = filteredPropostas.filter(p => p.status === 'Paga');

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

  // 9. Total commissions and expenses
  const paidIds = new Set(contratosFormalizadosEPagos.map(p => p.id));
  const totalComissoesPromotoras = comissoesPromotoras
    .filter(c => paidIds.has(c.propostaId) && c.status === 'confirmada')
    .reduce((acc, c) => acc + (c.valorRecebido || 0), 0);

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
    const empProps = contratosFormalizadosEPagos.filter(p => {
      if (!p.vendedora) return false;
      const vLower = p.vendedora.toLowerCase();
      const isEmpBianca = emp.name.toLowerCase().includes('bianca') || (emp.salesName && emp.salesName.toLowerCase().includes('bianca'));
      const isPropIgarassu = vLower.includes('igarassu') || vLower.includes('loja');
      if (isEmpBianca && isPropIgarassu) return true;

      const normP = normalizeSellerName(p.vendedora);
      const normName = normalizeSellerName(emp.name);
      const normSales = normalizeSellerName(emp.salesName);
      return normP === normName || normP === normSales || normP.includes(normName) || normName.includes(normP);
    });

    const vendas = empProps.reduce((acc, p) => acc + p.valorEmprestimo, 0);
    const taxas = empProps
      .filter(p => p.taxaPaga === true || p.clientePagouTaxa === true)
      .reduce((acc, p) => acc + p.valorTaxa, 0);

    const comissaoPromotora = comissoesPromotoras
      .filter(c => empProps.some(p => p.id === c.propostaId) && c.status === 'confirmada')
      .reduce((acc, c) => acc + c.valorRecebido, 0);

    let custo = 0;
    if (sheetExpenses && sheetExpenses.length > 0) {
      custo = calculateSellerCostFromSheet(sheetExpenses, emp, cleanStart, cleanEnd);
    }
    if (custo === 0 && emp.baseSalaryCost) {
      custo = emp.baseSalaryCost;
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
