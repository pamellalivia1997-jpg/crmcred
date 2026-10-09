import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

const sept = propostas.filter(p => {
  const d = String(p.dataDigitacao || '');
  return d.startsWith('2026-09') || d.startsWith('0026-09');
});

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

const bySeller: Record<string, { pagosCount: number; pagosValor: number; taxaCount: number; taxaValor: number }> = {};

sept.forEach(p => {
  let seller = String(p.vendedora || 'SEM VENDEDORA').trim().toLowerCase();
  if (seller.includes('igarassu') || seller.includes('loja')) {
    seller = 'Loja Igarassu';
  } else if (seller.includes('hellen')) {
    seller = 'Hellen';
  } else if (seller.includes('luc')) {
    seller = 'Lucélia';
  } else {
    seller = p.vendedora;
  }

  if (!bySeller[seller]) {
    bySeller[seller] = { pagosCount: 0, pagosValor: 0, taxaCount: 0, taxaValor: 0 };
  }
  if (isPago(p)) {
    bySeller[seller].pagosCount++;
    bySeller[seller].pagosValor += Number(p.valorEmprestimo || 0);
  }
  if (isTaxa(p)) {
    bySeller[seller].taxaCount++;
    bySeller[seller].taxaValor += Number(p.valorTaxa || 0);
  }
});

console.log('--- RECONCILED SEPTEMBER SUMMARY ---');
let totalPagos = 0;
let totalTaxas = 0;
for (const [k, v] of Object.entries(bySeller)) {
  console.log(`${k}:`);
  console.log(`  Pagos: ${v.pagosCount} contratos = R$ ${v.pagosValor.toFixed(2)}`);
  console.log(`  Taxas: ${v.taxaCount} taxas = R$ ${v.taxaValor.toFixed(2)}`);
  totalPagos += v.pagosValor;
  totalTaxas += v.taxaValor;
}
console.log('-----------------------------------');
console.log(`TOTAL PAGOS: R$ ${totalPagos.toFixed(2)}`);
console.log(`TOTAL TAXAS: R$ ${totalTaxas.toFixed(2)}`);
