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

console.log('--- ALL LUCELIA PROPOSALS IN SEPTEMBER ---');
lucProps.forEach(p => {
  console.log(`Cliente: ${p.nomeCliente} | Emp: ${p.valorEmprestimo} | Taxa: ${p.valorTaxa} | Status: ${p.status} | TaxaPaga: ${p.taxaPaga}`);
});
