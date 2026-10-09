import { calculateDashboardMetrics, isContratoPago, isTaxaPaga } from '../src/utils/dashboardCalculations';
import { Proposta, MetaVendedora, User } from '../src/types';

// Simplified mock data for testing
const mockUsers: User[] = [
  { id: 'u1', name: 'Hellen', role: 'vendedora', status: 'ativo' },
  { id: 'u2', name: 'Bianca', role: 'vendedora', status: 'ativo', salesName: 'Loja Igarassu' },
];

const mockMetas: MetaVendedora[] = [
  { mesAno: '2026-09', vendedoraId: 'u1', metaVenda: 100000, metaPercentualTaxa: 20 },
  { mesAno: '2026-09', vendedoraId: 'u2', metaVenda: 100000, metaPercentualTaxa: 20 },
];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Test Failed: ${message}`);
}

// Regression Test 1: Date filters (Dig vs Pag)
const props: Proposta[] = [
  { id: '1', dataDigitacao: '2026-09-01', dataPagamentoCliente: '2026-10-01', valorEmprestimo: 1000, status: 'Paga', vendedora: 'Hellen' },
  { id: '2', dataDigitacao: '2026-10-01', dataPagamentoCliente: '2026-09-01', valorEmprestimo: 2000, status: 'Paga', vendedora: 'Hellen' },
];

const metrics = calculateDashboardMetrics(props, '2026-09-01', '2026-09-30', mockMetas, mockUsers);
assert(metrics.totalVendas === 1000, 'Should only count sale with digitation in Sept');

// Regression Test 2: Status legacy (Formalizada, Liquidada)
const propsStatus: Proposta[] = [
  { id: '3', dataDigitacao: '2026-09-05', valorEmprestimo: 500, status: 'Formalizada', vendedora: 'Hellen' },
  { id: '4', dataDigitacao: '2026-09-06', valorEmprestimo: 600, status: 'Liquidada', vendedora: 'Hellen' },
];
const metricsStatus = calculateDashboardMetrics(propsStatus, '2026-09-01', '2026-09-30', mockMetas, mockUsers);
assert(metricsStatus.totalVendas === 1100, 'Legacy status not counted as paid');

// Regression Test 3: Taxa independence
const propsTaxa: Proposta[] = [
  { id: '5', dataDigitacao: '2026-09-05', valorEmprestimo: 0, valorTaxa: 100, taxaPaga: 'SIM', status: 'Em análise', vendedora: 'Hellen' },
];
const metricsTaxa = calculateDashboardMetrics(propsTaxa, '2026-09-01', '2026-09-30', mockMetas, mockUsers);
assert(metricsTaxa.totalTaxas === 100, 'Taxa should be counted even if contract pending');

console.log('All regression tests passed!');
