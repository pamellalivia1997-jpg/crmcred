import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

const sept = propostas.filter(p => {
  const d = String(p.dataDigitacao || '');
  return d.startsWith('2026-09') || d.startsWith('0026-09');
});

console.log('--- ALL SEPTEMBER 2026 PROPOSAL NAMES AND VALUES ---');
sept.forEach((p, i) => {
  console.log(`${i+1}. Vendedora: "${p.vendedora}" | Dig: ${p.dataDigitacao} | Pag: ${p.dataPagamentoCliente} | Cliente: ${p.nomeCliente} | Emp: ${p.valorEmprestimo} | Taxa: ${p.valorTaxa} | Status: ${p.status} | TaxaPaga: ${p.taxaPaga}`);
});
