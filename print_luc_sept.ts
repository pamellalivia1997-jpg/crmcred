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

lucSept.forEach(p => {
  console.log(`- ${p.nomeCliente}: R$ ${p.valorEmprestimo} (taxa: ${p.valorTaxa}, dig: ${p.dataDigitacao}, pag: ${p.dataPagamentoCliente})`);
});
