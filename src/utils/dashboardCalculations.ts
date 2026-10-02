import { Proposta, MetaVendedora, User, StatusProposta } from '../types';

export interface SellerRankingItem {
  nome: string;
  vendas: number;
  taxa: number;
  count: number;
  meta: number;
}

export interface DashboardMetrics {
  filteredPropostas: Proposta[];
  totalVendas: number;
  totalTaxas: number;
  vendasPorVendedora: Record<string, number>;
  taxasPorVendedora: Record<string, number>;
  contratosPorVendedora: Record<string, number>;
  contratosFormalizadosEPagos: Proposta[];
  propostasPorEtapa: Record<StatusProposta, number>;
  metaPeriodo: number;
  rankingVendedoras: SellerRankingItem[];
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
  const startParts = dataInicio.split('-');
  const endParts = dataFim.split('-');
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

  const startMs = new Date(dataInicio).getTime();
  const endMs = new Date(dataFim).getTime();
  const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
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
  users: User[]
): DashboardMetrics {
  // 1. Filter proposals strictly within dateRange by dataDigitacao and excluding "ASSESSORIA" promotora
  const filteredPropostas = propostas.filter(p => {
    const dataDigi = p.dataDigitacao ? p.dataDigitacao.substring(0, 10) : '';
    if (!dataDigi) return false;

    const dentroDoPeriodo = dataDigi >= dataInicio && dataDigi <= dataFim;

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
      (m.vendedoraId === u.id || 
       m.vendedoraNome.toLowerCase().trim() === u.name.toLowerCase().trim() ||
       (u.salesName && m.vendedoraNome.toLowerCase().trim() === u.salesName.toLowerCase().trim())) && 
      m.mesAno === activeCompetenceMonth
    );
    if (foundMeta && foundMeta.isAtivoNoMes === false) return false;
    return true;
  });

  // 5. Proportionality for Meta
  const startMs = new Date(dataInicio).getTime();
  const endMs = new Date(dataFim).getTime();
  const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
  const periodMultiplier = isFullClosedMonth(dataInicio, dataFim) ? 1.0 : (diffDays / 30);

  const getSellerPeriodMeta = (user: any): number => {
    const foundMeta = metas.find(m => 
      (m.vendedoraId === user.id || m.vendedoraNome.toLowerCase().trim() === user.name.toLowerCase().trim()) && 
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
      u.name === stdName || 
      (u.salesName && u.salesName === stdName) ||
      getStandardizedSellerName(u.name) === stdName ||
      (u.salesName && getStandardizedSellerName(u.salesName) === stdName)
    );

    const isTaxaPaid = p.taxaPaga === true || String(p.taxaPaga).toUpperCase() === 'SIM' || p.clientePagouTaxa === true;

    if (activeSeller) {
      vendasPorVendedora[activeSeller.name] = (vendasPorVendedora[activeSeller.name] || 0) + Number(p.valorEmprestimo || 0);
      contratosPorVendedora[activeSeller.name] = (contratosPorVendedora[activeSeller.name] || 0) + 1;
      if (isTaxaPaid) {
        taxasPorVendedora[activeSeller.name] = (taxasPorVendedora[activeSeller.name] || 0) + Number(p.valorTaxa || 0);
      }

      const rep = sellersMap.get(activeSeller.name);
      if (rep) {
        rep.vendas += Number(p.valorEmprestimo || 0);
        if (isTaxaPaid) {
          rep.taxa += Number(p.valorTaxa || 0);
        }
        rep.count += 1;
      }
    } else {
      vendasPorVendedora['Outros'] = (vendasPorVendedora['Outros'] || 0) + Number(p.valorEmprestimo || 0);
      contratosPorVendedora['Outros'] = (contratosPorVendedora['Outros'] || 0) + 1;
      if (isTaxaPaid) {
        taxasPorVendedora['Outros'] = (taxasPorVendedora['Outros'] || 0) + Number(p.valorTaxa || 0);
      }

      outrosVendas += Number(p.valorEmprestimo || 0);
      if (isTaxaPaid) {
        outrosTaxa += Number(p.valorTaxa || 0);
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

  return {
    filteredPropostas,
    totalVendas,
    totalTaxas,
    vendasPorVendedora,
    taxasPorVendedora,
    contratosPorVendedora,
    contratosFormalizadosEPagos,
    propostasPorEtapa,
    metaPeriodo,
    rankingVendedoras
  };
}
