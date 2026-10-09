import { calculateDashboardMetrics, calculateMetaForPeriod, isContratoPago, isTaxaPaga } from '../src/utils/dashboardCalculations';
import { parseTextToSpreadsheetInputRows } from '../src/components/propostas/PropostasView';
import { Proposta, MetaVendedora, User } from '../src/types';

// Simplified mock data for testing
const mockUsers: User[] = [
  { id: 'u1', name: 'Hellen', role: 'vendedora', status: 'ativo' },
  { id: 'u2', name: 'Bianca', role: 'vendedora', status: 'ativo', salesName: 'Loja Igarassu' },
] as any;

const mockMetas: MetaVendedora[] = [
  { mesAno: '2026-09', vendedoraId: 'u1', metaVenda: 100000, metaPercentualTaxa: 20 },
  { mesAno: '2026-09', vendedoraId: 'u2', metaVenda: 100000, metaPercentualTaxa: 20 },
] as any;

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Test Failed: ${message}`);
}

// Regression Test 1: Date filters (Dig vs Pag)
const props: Proposta[] = [
  { id: '1', dataDigitacao: '2026-09-01', dataPagamentoCliente: '2026-10-01', valorEmprestimo: 1000, status: 'Paga', vendedora: 'Hellen' },
  { id: '2', dataDigitacao: '2026-10-01', dataPagamentoCliente: '2026-09-01', valorEmprestimo: 2000, status: 'Paga', vendedora: 'Hellen' },
] as any;

const metrics = calculateDashboardMetrics(props, '2026-09-01', '2026-09-30', mockMetas, mockUsers);
assert(metrics.totalVendas === 1000, 'Should only count sale with digitation in Sept');

// Regression Test 2: Status legacy (Formalizada, Liquidada)
const propsStatus: Proposta[] = [
  { id: '3', dataDigitacao: '2026-09-05', valorEmprestimo: 500, status: 'Formalizada', vendedora: 'Hellen' },
  { id: '4', dataDigitacao: '2026-09-06', valorEmprestimo: 600, status: 'Liquidada', vendedora: 'Hellen' },
] as any;
const metricsStatus = calculateDashboardMetrics(propsStatus, '2026-09-01', '2026-09-30', mockMetas, mockUsers);
assert(metricsStatus.totalVendas === 1100, 'Legacy status not counted as paid');

// Regression Test 3: Taxa independence
const propsTaxa: Proposta[] = [
  { id: '5', dataDigitacao: '2026-09-05', valorEmprestimo: 0, valorTaxa: 100, taxaPaga: 'SIM', status: 'Em análise', vendedora: 'Hellen' },
] as any;
const metricsTaxa = calculateDashboardMetrics(propsTaxa, '2026-09-01', '2026-09-30', mockMetas, mockUsers);
assert(metricsTaxa.totalTaxas === 100, 'Taxa should be counted even if contract pending');


const content5Row = ['697.240.084-87','"LUZIA MARIA DO NASCIMENTO','"','(81) 98972-9600','21/09/2026','29/09/2026','INSS','REFIN DA PORT','FACTA','J2 PROMOTORA','1.778,68','700','SIM','','HELLEN','ANA','123561583','https://example.test','PAGO',''].join('\t');
const parsedContent5 = parseTextToSpreadsheetInputRows([
  'CPF DO CLIENTE',
  '\tNOME DO CLIENTE\tNÚMERO DE TELEFONE',
  '\tDATA DA DIGITAÇÃO\tDATA DO PAGAMENTO AO CLIENTE\tCONVÊNIO\tOPERAÇÃO\tBANCO\tPROMOTORA\tVALOR DO EMPRÉSTIMO LIBERADO PARA O CLIENTE\tVALOR DA TAXA DA ASSESSORIA\tCLIENTE PAGOU A TAXA DE ASSESSORIA\tTaxa do Cartão\tVENDEDOR\tDIGITADOR\tNº DO CONTRATO\tANEXAR\tSTATUS DO CONTRATO\tOBSERVAÇÕES',
  content5Row
].join('\n'), 'Hellen');
assert(parsedContent5.length === 1 && parsedContent5[0].dataDigitacao === '21/09/2026' && parsedContent5[0].valorEmprestimo === '1.778,68' && parsedContent5[0].status === 'PAGO', 'content5 malformed row must preserve all financial columns');
const content5Rows = parseTextToSpreadsheetInputRows([
  'CPF DO CLIENTE : 000.000.000-00 (PRENCHER NESSE FORMATO EXEMPLIFICADO ACIMA)',
  '\tNOME DO CLIENTE: (PREENCHER IGUAL AO DOCUMENTO)\tNÚMERO DE TELEFONE: 00 00000-0000 (PREENCHER NESSE FORMATO EXEMPLIFICADO ACIMA)',
  '\tDATA DA DIGITAÇÃO \tDATA DO PAGAMENTO AO CLIENTE\tCONVÊNIO \tOPERAÇÃO\tBANCO\tPROMOTORA\tVALOR DO EMPRÉSTIMO LIBERADO PARA O CLIENTE\tVALOR DA TAXA DA ASSESSORIA\tCLIENTE PAGOU A TAXA DE ASSESSORIA \tTaxa do Cartão\tVENDEDOR\tDIGITADOR\tNº DO CONTRATO (SEM ESPAÇAMENTO)\tANEXAR\tSTATUS DO CONTRATO\tOBSERVAÇÕES GERAIS',
  '356.656.534-20\tSAULO ROMERO DE ALBUQUERQUE\t81985587485\t23/09/2026\t23/09/2026\tINSS\tPORTABILIDADE\tICRED\tJ2 PROMOTORA\t36.885,41\t0\tNÃO\t\tLucélia\tLucélia\tec5cc71b-3546-4623-9dce-b8ec5ac0db04\thttps://example.test\tPAGO\t',
  '697.240.084-87\t"LUZIA MARIA DO NASCIMENTO\t"\t(81) 98972-9600\t21/09/2026\t29/09/2026\tINSS\tREFIN DA PORT\tFACTA\tJ2 PROMOTORA\t1.778,68\t700\tSIM\t\tHELLEN\tANA\t123561583\thttps://example.test\tPAGO\t'
].join('\n'), 'Hellen');
assert(content5Rows.length === 2, 'official three-line header must preserve both rows');
assert(content5Rows[0].vendedora === 'Lucélia' && content5Rows[0].valorEmprestimo === '36.885,41' && content5Rows[0].status === 'PAGO', 'Lucélia R$ 36.885,41 row must remain aligned');
assert(content5Rows[1].vendedora === 'HELLEN' && content5Rows[1].valorEmprestimo === '1.778,68' && content5Rows[1].valorTaxa === '700', 'Hellen R$ 1.778,68 row must remain aligned');

const persistedGoals: any[] = [{ mesAno: '2026-09', vendedoraId: 'loja', metaVenda: 400000, metaPercentualTaxa: 11 }, { mesAno: '2026-09', vendedoraId: 'u1', metaVenda: 200000, metaPercentualTaxa: 20 }, { mesAno: '2026-09', vendedoraId: 'u2', metaVenda: 200000, metaPercentualTaxa: 20 }];
assert(calculateMetaForPeriod('2026-09-01','2026-09-30',persistedGoals,mockUsers) === 400000, 'saved store goal must remain stable');
assert(calculateMetaForPeriod('2026-09-01','2026-09-30',persistedGoals,[mockUsers[0]]) === 400000, 'removing a seller must not change historical goal');

console.log('All regression tests passed!');
process.exit(0);
