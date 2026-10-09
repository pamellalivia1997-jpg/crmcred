import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

// Filter all proposals in DB with status NOT Paga or anything
const septAll = propostas.filter(p => {
  const d = String(p.dataDigitacao || '');
  return d.startsWith('2026-09') || d.startsWith('0026-09');
});

console.log('Sept all proposals count:', septAll.length);

const nonPaid = septAll.filter(p => {
  const s = String(p.status || '').toUpperCase().trim();
  return s !== 'PAGA' && s !== 'PAGO';
});

console.log('Non-paid proposals in September:');
nonPaid.forEach(p => {
  console.log(`  ${p.vendedora} | ${p.nomeCliente} | emp: ${p.valorEmprestimo} | taxa: ${p.valorTaxa} | status: ${p.status} | taxaPaga: ${p.taxaPaga}`);
});
