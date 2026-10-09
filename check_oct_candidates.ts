import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

// Filter all proposals typed or paid or created around Sept/Oct
const candidates = propostas.filter(p => {
  const d = String(p.dataDigitacao || '');
  const pag = String(p.dataPagamentoCliente || '');
  return d.includes('2026') || pag.includes('2026') || d.includes('0026');
});

console.log('Total 2026 candidates:', candidates.length);

// Let's inspect all proposals where valorEmprestimo is in Lucelia Oct
const lucOct = propostas.filter(p => {
  const v = String(p.vendedora || '').toUpperCase();
  return v.includes('LUC') && String(p.dataDigitacao || '').startsWith('2026-10');
});

console.log('Lucelia Oct proposals:');
let sumLucOct = 0;
lucOct.forEach(p => {
  sumLucOct += Number(p.valorEmprestimo || 0);
  console.log(`  ${p.nomeCliente}: val=${p.valorEmprestimo}, taxa=${p.valorTaxa}, dig=${p.dataDigitacao}, pag=${p.dataPagamentoCliente}, status=${p.status}`);
});
console.log('Sum Lucelia Oct:', sumLucOct);
