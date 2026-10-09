import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

const lucOct = propostas.filter(p => {
  const v = String(p.vendedora || '').toUpperCase();
  return v.includes('LUC') && String(p.dataDigitacao || '').startsWith('2026-10');
});

console.log('Lucelia proposals in October 2026:');
lucOct.forEach(p => {
  console.log(`CPF: ${p.cpf}, Nome: ${p.nomeCliente}, Emp: ${p.valorEmprestimo}, Taxa: ${p.valorTaxa}, Dig: ${p.dataDigitacao}, PagCli: ${p.dataPagamentoCliente}, Obs: ${p.observacoes || ''}, Contrato: ${p.numeroContrato || ''}`);
});
