import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

// Find proposals where vendedora is LUCELIA or digitador is LUCELIA, but dataDigitacao is NOT in September, yet valorEmprestimo sums to 36885.41 or similar
const lucOther = propostas.filter(p => {
  const v = String(p.vendedora || '').toUpperCase();
  const dig = String(p.digitador || '').toUpperCase();
  const d = String(p.dataDigitacao || '');
  return (v.includes('LUC') || dig.includes('LUC')) && !d.startsWith('2026-09') && !d.startsWith('0026-09') && Number(p.valorEmprestimo || 0) > 0;
});

console.log(`Lucélia proposals OUTSIDE September with val > 0 (${lucOther.length}):`);
let sumOther = 0;
lucOther.forEach(p => {
  sumOther += Number(p.valorEmprestimo || 0);
  console.log(`  - ${p.nomeCliente}: R$ ${p.valorEmprestimo} | Dig: ${p.dataDigitacao} | Pag: ${p.dataPagamentoCliente} | Status: ${p.status}`);
});
console.log(`Sum outside Sept: R$ ${sumOther.toFixed(2)}`);
