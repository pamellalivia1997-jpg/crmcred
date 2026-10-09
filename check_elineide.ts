import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

const isPago = (p: any) => {
  const s = String(p.status || '').toUpperCase().trim();
  return s === 'PAGA' || s === 'PAGO';
};

const elineide = propostas.find(p => p.nomeCliente && p.nomeCliente.includes('ELINEIDE BATISTA'));
if (elineide) {
  console.log('Elineide Batista proposal:', elineide);
}
