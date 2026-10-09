import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

const isPago = (p: any) => {
  const s = String(p.status || '').toUpperCase().trim();
  return s === 'PAGA' || s === 'PAGO';
};

const sept = propostas.filter(p => {
  const d = String(p.dataDigitacao || '');
  return d.startsWith('2026-09') || d.startsWith('0026-09');
});

const lucSept = sept.filter(p => String(p.vendedora || '').toUpperCase().includes('LUC') && isPago(p));
const sumLucSept = lucSept.reduce((acc, p) => acc + Number(p.valorEmprestimo || 0), 0);

console.log('Lucelia Sept sum (57 items):', sumLucSept);
console.log('Plus Gilberto (37700.65):', sumLucSept + 37700.65);
console.log('Minus some item? Let\'s check difference with target 160717.81:');
const target = 160717.81;
const diff = sumLucSept - target;
console.log('sumLucSept - target:', diff);
