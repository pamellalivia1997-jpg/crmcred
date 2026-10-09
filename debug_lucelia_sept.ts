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

const lucProps = sept.filter(p => String(p.vendedora || '').toUpperCase().includes('LUC') && isPago(p));
console.log(`Lucélia paid contracts in Sept (${lucProps.length}):`);
let sumLuc = 0;
lucProps.forEach(p => {
  sumLuc += Number(p.valorEmprestimo || 0);
  console.log(`  - ${p.nomeCliente}: R$ ${p.valorEmprestimo} (Contrato: ${p.numeroContrato || 'N/A'})`);
});
console.log(`Sum: R$ ${sumLuc.toFixed(2)}`);
console.log(`Target: R$ 160.717,81. Difference: R$ ${(160717.81 - sumLuc).toFixed(2)}`);

// Let's check all proposals in the entire database with vendedora = LUCELIA or digitador = LUCELIA and status = Paga
const allLuc = propostas.filter(p => {
  const v = String(p.vendedora || '').toUpperCase();
  const dig = String(p.digitador || '').toUpperCase();
  return (v.includes('LUC') || dig.includes('LUC')) && isPago(p);
});

console.log(`\nTotal Lucélia paid contracts across ALL time in DB: ${allLuc.length}`);
const allLucSept = allLuc.filter(p => {
  const d = String(p.dataDigitacao || '');
  return d.startsWith('2026-09');
});
console.log(`Lucélia paid contracts with dataDigitacao in Sept: ${allLucSept.length}, sum: R$ ${allLucSept.reduce((acc, p) => acc + Number(p.valorEmprestimo || 0), 0).toFixed(2)}`);
