/**
 * Regras e Tabelas de Cálculo de Comissão - Lívia Cred Saúde CRM
 * 
 * NOTA DE ARQUITETURA:
 * Este arquivo isola todas as regras de negócio para cálculo de:
 * 1. Comissões das Vendedoras (comissão sobre taxas, bônus de digitação, cartões e bônus de meta de loja)
 * 2. Comissões estimadas a receber das Promotoras (J2, Sempre, DG, GFT, bancos parceiros)
 * 
 * Qualquer mudança nas porcentagens, faixas de metas ou premiações pode ser feita diretamente aqui
 * sem impactar os componentes de interface.
 */

import { Operacao, Proposta, MetaVendedora, ComissaoVendedora } from '../types';

export interface ParametrosComissao {
  // Faixas de comissão sobre a taxa cobrada
  faixasTaxa: {
    minAtingimentoMeta: number; // Ex: 0.0 (0%), 0.8 (80%), 1.0 (100%), 1.2 (120%)
    percentualComissaoTaxa: number; // Ex: 0.20 (20%), 0.25 (25%), 0.30 (30%)
  }[];
  // Valor fixo por contrato digitado e pago
  bonusPorContratoDigitado: number;
  // Bônus fixo por cartão novo / Credcesta
  bonusPorCartaoAtivado: number;
  // Bônus coletivo por atingimento da meta da loja
  bonusMetaLoja: number;
}

export const PARAMETROS_PADRAO: ParametrosComissao = {
  faixasTaxa: [
    { minAtingimentoMeta: 1.2, percentualComissaoTaxa: 0.30 }, // 30% da taxa se atingir 120%+ da meta
    { minAtingimentoMeta: 1.0, percentualComissaoTaxa: 0.25 }, // 25% da taxa se atingir 100% da meta
    { minAtingimentoMeta: 0.8, percentualComissaoTaxa: 0.20 }, // 20% da taxa se atingir 80% da meta
    { minAtingimentoMeta: 0.0, percentualComissaoTaxa: 0.15 }, // 15% da taxa base
  ],
  bonusPorContratoDigitado: 25.00, // R$ 25 por contrato pago
  bonusPorCartaoAtivado: 45.00,    // R$ 45 por cartão emitido
  bonusMetaLoja: 350.00,          // R$ 350 de bônus adicional
};

/**
 * Tabela de comissão estimada das promotoras por operação
 */
export const ESTIMATIVA_PROMOTORAS: Record<Operacao, { tipo: 'percentual' | 'fixo'; valorMedio: number }> = {
  'FGTS': { tipo: 'percentual', valorMedio: 0.045 }, // 4.5% do valor do empréstimo
  'Saque Complementar': { tipo: 'percentual', valorMedio: 0.05 },
  'Refin': { tipo: 'percentual', valorMedio: 0.055 },
  'Conta de Energia Elétrica/Luz': { tipo: 'percentual', valorMedio: 0.08 },
  'Portabilidade': { tipo: 'percentual', valorMedio: 0.038 },
  'Refin da Port': { tipo: 'percentual', valorMedio: 0.045 },
  'Margem': { tipo: 'percentual', valorMedio: 0.05 },
  'Cartão Novo': { tipo: 'fixo', valorMedio: 90.00 }, // R$ 90 fixo por cartão emitido
  'Credcesta': { tipo: 'fixo', valorMedio: 80.00 },
  'Cartão de Crédito': { tipo: 'fixo', valorMedio: 85.00 },
  'Crédito do Trabalhador': { tipo: 'percentual', valorMedio: 0.04 },
  'Pessoal': { tipo: 'percentual', valorMedio: 0.06 },
};

/**
 * Calcula a comissão estimada da promotora para uma proposta
 */
export function estimarComissaoPromotora(proposta: Partial<Proposta>): number {
  if (!proposta.operacao || !proposta.valorEmprestimo) return 0;
  const config = ESTIMATIVA_PROMOTORAS[proposta.operacao];
  if (!config) return proposta.valorEmprestimo * 0.04;

  if (config.tipo === 'percentual') {
    return proposta.valorEmprestimo * config.valorMedio;
  }
  return config.valorMedio;
}

/**
 * Calcula a estimativa de comissão individual de uma proposta para a vendedora
 */
export function estimarComissaoVendedoraProposta(proposta: Partial<Proposta>): number {
  const taxa = proposta.valorTaxa || 0;
  // Média de 20% sobre a taxa cobrada + R$ 25 de contrato
  let comissao = taxa * 0.20 + PARAMETROS_PADRAO.bonusPorContratoDigitado;
  
  if (proposta.operacao === 'Cartão Novo' || proposta.operacao === 'Credcesta' || proposta.operacao === 'Cartão de Crédito') {
    comissao += PARAMETROS_PADRAO.bonusPorCartaoAtivado;
  }
  return comissao;
}

/**
 * Realiza o fechamento mensal das comissões devidas a uma vendedora
 */
export function calcularComissaoVendedoraMes(
  vendedoraId: string,
  vendedoraNome: string,
  mesAno: string,
  propostasPagas: Proposta[],
  meta?: MetaVendedora,
  atingiuMetaLoja = false
): ComissaoVendedora {
  // Filtra as propostas pagas da vendedora no mês especificado
  const propostas = propostasPagas.filter(p => {
    const isVendedora = (p.vendedora === vendedoraNome || p.digitador === vendedoraNome);
    const dataRef = p.dataPagamentoCliente || p.dataDigitacao;
    const isMes = dataRef.startsWith(mesAno);
    return isVendedora && isMes && p.status === 'Paga';
  });

  const totalVendas = propostas.reduce((acc, p) => acc + (p.valorEmprestimo || 0), 0);
  const totalTaxas = propostas.reduce((acc, p) => acc + (p.valorTaxa || 0), 0);

  // Calcula atingimento da meta de vendas
  const metaVenda = meta?.metaVenda || 70000;
  const percentualAtingimento = metaVenda > 0 ? (totalVendas / metaVenda) : 1.0;

  // Encontra a alíquota de comissão sobre a taxa
  let aliquotaTaxa = 0.15;
  for (const faixa of PARAMETROS_PADRAO.faixasTaxa) {
    if (percentualAtingimento >= faixa.minAtingimentoMeta) {
      aliquotaTaxa = faixa.percentualComissaoTaxa;
      break;
    }
  }

  const comissaoTaxas = totalTaxas * aliquotaTaxa;
  const comissaoDigitacao = propostas.length * PARAMETROS_PADRAO.bonusPorContratoDigitado;

  // Cartões
  const qtdCartoes = propostas.filter(p => 
    p.operacao === 'Cartão Novo' || p.operacao === 'Credcesta' || p.operacao === 'Cartão de Crédito'
  ).length;
  const comissaoCartao = qtdCartoes * PARAMETROS_PADRAO.bonusPorCartaoAtivado;

  // Bônus meta da loja
  const bonusMeta = (percentualAtingimento >= 1.0 && atingiuMetaLoja) ? PARAMETROS_PADRAO.bonusMetaLoja : 0;

  const totalAPagar = comissaoTaxas + comissaoDigitacao + comissaoCartao + bonusMeta;

  return {
    vendedoraId,
    vendedoraNome,
    mesAno,
    totalVendas,
    totalTaxas,
    comissaoTaxas,
    comissaoDigitacao,
    comissaoCartao,
    bonusMeta,
    totalAPagar,
    status: 'pendente'
  };
}
