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

const lucSept = sept.filter(p => String(p.vendedora || '').toUpperCase().includes('LUC') && isPago(p));
console.log('Lucelia Sept sum:', lucSept.reduce((acc, p) => acc + Number(p.valorEmprestimo || 0), 0));
console.log('Including Elineide (30426):', lucSept.reduce((acc, p) => acc + Number(p.valorEmprestimo || 0), 0) + 30426);
console.log('Target for Lucelia:', 160717.81);
