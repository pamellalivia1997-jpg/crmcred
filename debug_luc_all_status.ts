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

const lucProps = sept.filter(p => String(p.vendedora || '').toUpperCase().includes('LUC'));

console.log(`Total Lucelia proposals in Sept: ${lucProps.length}`);
let sumVal = 0;
let sumEmp = 0;
let sumTaxa = 0;
lucProps.forEach(p => {
  sumVal += Number(p.valorEmprestimo || 0);
  sumTaxa += Number(p.valorTaxa || 0);
  console.log(`- ${p.nomeCliente} | Status: ${p.status} | Emp: ${p.valorEmprestimo} | Taxa: ${p.valorTaxa}`);
});

console.log(`Total Emprestimo (all status): ${sumVal}`);
console.log(`Total Taxa: ${sumTaxa}`);
