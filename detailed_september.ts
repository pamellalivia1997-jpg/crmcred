import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

// Filter strictly by dataDigitacao in 2026-09
const sept = propostas.filter(p => {
  const d = String(p.dataDigitacao || '');
  return d.startsWith('2026-09') || d.startsWith('0026-09') || d.includes('/09/2026');
});

console.log('September proposals count:', sept.length);

const isPago = (p: any) => {
  const s = String(p.status || '').toUpperCase().trim();
  return s === 'PAGA' || s === 'PAGO';
};

const isTaxa = (p: any) => {
  const val = p.taxaPaga;
  const cliVal = p.clientePagouTaxa;
  if (val === true || cliVal === true) return true;
  const sVal = String(val || '').toUpperCase().trim();
  const sCliVal = String(cliVal || '').toUpperCase().trim();
  return sVal === 'SIM' || sVal === 'S' || sCliVal === 'SIM' || sCliVal === 'S';
};

const bySeller: Record<string, { pagosCount: number; pagosValor: number; taxaCount: number; taxaValor: number; props: any[] }> = {};

sept.forEach(p => {
  const seller = String(p.vendedora || 'SEM VENDEDORA').trim();
  if (!bySeller[seller]) {
    bySeller[seller] = { pagosCount: 0, pagosValor: 0, taxaCount: 0, taxaValor: 0, props: [] };
  }
  bySeller[seller].props.push(p);
  if (isPago(p)) {
    bySeller[seller].pagosCount++;
    bySeller[seller].pagosValor += Number(p.valorEmprestimo || 0);
  }
  if (isTaxa(p)) {
    bySeller[seller].taxaCount++;
    bySeller[seller].taxaValor += Number(p.valorTaxa || 0);
  }
});

console.log('--- SUMMARY BY VENDEDORA IN SEPTEMBER ---');
let totalPagos = 0;
let totalTaxas = 0;
for (const [k, v] of Object.entries(bySeller)) {
  console.log(`${k}:`);
  console.log(`  Pagos: ${v.pagosCount} contratos = R$ ${v.pagosValor.toFixed(2)}`);
  console.log(`  Taxas: ${v.taxaCount} taxas = R$ ${v.taxaValor.toFixed(2)}`);
  totalPagos += v.pagosValor;
  totalTaxas += v.taxaValor;
}
console.log('-------------------------------------------');
console.log(`TOTAL PAGOS: R$ ${totalPagos.toFixed(2)}`);
console.log(`TOTAL TAXAS: R$ ${totalTaxas.toFixed(2)}`);
