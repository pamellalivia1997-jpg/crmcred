import assert from 'node:assert/strict';
import {
  calculateDashboardMetrics,
  isContratoPago,
  matchProposalToSeller,
  isTaxaPaga,
} from '../src/utils/dashboardCalculations';
import type { Proposta, User } from '../src/types';

const lucelia: User = {
  id: 'user-lucelia', name: 'Lucélia', salesName: 'Lucélia',
  email: 'lucelia@example.com', phone: '', role: 'vendedora', status: 'ativo',
};
const taciana: User = {
  id: 'user-taciana', name: 'Taciana', salesName: 'Taciana',
  email: 'taciana@example.com', phone: '', role: 'vendedora', status: 'ativo',
};

const base = {
  cpf: '123', nomeCliente: 'Cliente de teste', convenio: 'INSS' as const,
  operacao: 'Margem' as const, banco: 'Daycoval' as const,
  promotora: 'J2 Promotora' as const, percentualTaxa: 0,
  numeroContrato: 'CTR-TESTE', historicoStatus: [],
};

const luceliaDigitadaPorAna: Proposta = {
  ...base, id: 'p-lucelia-ana', carimboDataHora: '2026-09-10T12:00:00.000Z',
  dataDigitacao: '2026-09-10', dataPagamentoCliente: '', valorEmprestimo: 11788.70,
  valorTaxa: 0, taxaPaga: false, clientePagouTaxa: false,
  vendedora: 'Lucélia', digitador: 'Ana', status: 'Paga',
};

const pendenteComTaxaPaga: Proposta = {
  ...base, id: 'p-pendente', carimboDataHora: '2026-09-11T12:00:00.000Z',
  dataDigitacao: '2026-09-11', dataPagamentoCliente: '', valorEmprestimo: 5000,
  valorTaxa: 1500, percentualTaxa: 30, taxaPaga: true, clientePagouTaxa: true,
  vendedora: 'Lucélia', digitador: 'Ana', status: 'Em análise',
};

const digitadoForaMasPagoEmSetembro: Proposta = {
  ...base, id: 'p-fora-periodo', carimboDataHora: '2026-08-31T12:00:00.000Z',
  dataDigitacao: '2026-08-31', dataPagamentoCliente: '2026-09-01', valorEmprestimo: 9000,
  valorTaxa: 900, percentualTaxa: 10, taxaPaga: true, clientePagouTaxa: true,
  vendedora: 'Lucélia', digitador: 'Ana', status: 'Paga',
};

assert.equal(isContratoPago(luceliaDigitadaPorAna), true);
assert.equal(isContratoPago(pendenteComTaxaPaga), false);
assert.equal(isTaxaPaga(pendenteComTaxaPaga), true);
const withLegacyStatus = (status: string): Proposta => ({
  ...luceliaDigitadaPorAna,
  status: status as Proposta['status']
});
assert.equal(isContratoPago(withLegacyStatus('Formalizada')), true);
assert.equal(isContratoPago(withLegacyStatus('Liquidada')), true);
assert.equal(isContratoPago(withLegacyStatus('Pagamento pendente')), false);
assert.equal(matchProposalToSeller(luceliaDigitadaPorAna, lucelia), true);
assert.equal(matchProposalToSeller(luceliaDigitadaPorAna, taciana), false);

const metrics = calculateDashboardMetrics(
  [luceliaDigitadaPorAna, pendenteComTaxaPaga, digitadoForaMasPagoEmSetembro],
  '2026-09-01', '2026-09-30', [], [lucelia, taciana],
);

assert.equal(metrics.filteredPropostas.length, 2, 'somente Data da Digitação define a competência');
assert.equal(metrics.totalVendas, 11788.70, 'venda pendente não entra no total');
assert.equal(metrics.totalTaxas, 1500, 'taxa fica separada da venda');
assert.equal(metrics.contratosFormalizadosEPagos.length, 1);
assert.equal(metrics.vendasPorVendedora['Lucélia'], 11788.70);
assert.equal(metrics.vendasPorVendedora['Taciana'] ?? 0, 0);
assert.equal(
  Object.values(metrics.vendasPorVendedora).reduce((sum, value) => sum + value, 0),
  metrics.totalVendas,
  'o total mensal deve ser a soma do ranking por vendedora'
);

console.log('OK: regras oficiais de competência, vendedor, contrato pago e taxa paga.');
