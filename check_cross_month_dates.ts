import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

// Filter all proposals in DB with valorEmprestimo > 0 and NOT in Sept
console.log('Searching all combinations of proposals across the whole database...');

// What proposals in the DB have dataPagamentoCliente in September, but dataDigitacao NOT in September?
const paidInSeptNotDigSept = propostas.filter(p => {
  const dig = String(p.dataDigitacao || '');
  const pag = String(p.dataPagamentoCliente || '');
  return pag.startsWith('2026-09') && !dig.startsWith('2026-09');
});

console.log(`Proposals with dataPagamentoCliente in Sept but dataDigitacao NOT in Sept: ${paidInSeptNotDigSept.length}`);
paidInSeptNotDigSept.forEach(p => {
  console.log(`  ${p.vendedora} | ${p.nomeCliente} | emp: ${p.valorEmprestimo} | taxa: ${p.valorTaxa} | dig: ${p.dataDigitacao} | pag: ${p.dataPagamentoCliente} | status: ${p.status}`);
});

// What proposals in the DB have dataDigitacao in September, but dataPagamentoCliente NOT in September?
const digInSeptNotPagSept = propostas.filter(p => {
  const dig = String(p.dataDigitacao || '');
  const pag = String(p.dataPagamentoCliente || '');
  return (dig.startsWith('2026-09') || dig.startsWith('0026-09')) && !pag.startsWith('2026-09');
});

console.log(`Proposals with dataDigitacao in Sept but dataPagamentoCliente NOT in Sept: ${digInSeptNotPagSept.length}`);
digInSeptNotPagSept.forEach(p => {
  console.log(`  ${p.vendedora} | ${p.nomeCliente} | emp: ${p.valorEmprestimo} | taxa: ${p.valorTaxa} | dig: ${p.dataDigitacao} | pag: ${p.dataPagamentoCliente} | status: ${p.status}`);
});
