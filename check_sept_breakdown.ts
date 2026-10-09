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

console.log('--- ALL SEPTEMBER PROPOSALS WITH STATUS PAGO/PAGA ---');
const paidSept = sept.filter(isPago);
console.log(`Total paid in Sept: ${paidSept.length}`);

const summary: Record<string, { count: number; emp: number; taxa: number }> = {};
paidSept.forEach(p => {
  let v = String(p.vendedora || 'SEM VENDEDORA').trim();
  if (v.toLowerCase().includes('igarassu') || v.toLowerCase().includes('loja')) {
    v = 'Loja Igarassu';
  } else if (v.toLowerCase().includes('hellen')) {
    v = 'Hellen';
  } else if (v.toLowerCase().includes('luc')) {
    v = 'Lucélia';
  }
  if (!summary[v]) summary[v] = { count: 0, emp: 0, taxa: 0 };
  summary[v].count++;
  summary[v].emp += Number(p.valorEmprestimo || 0);
  summary[v].taxa += Number(p.valorTaxa || 0);
});

for (const [k, v] of Object.entries(summary)) {
  console.log(`Vendedor: ${k} | Contratos: ${v.count} | Valor Empréstimo: R$ ${v.emp.toFixed(2)} | Valor Taxa: R$ ${v.taxa.toFixed(2)}`);
}

// Let's check what dashboardCalculations.ts produces for rankingVendedoras
