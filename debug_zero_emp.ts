import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

const sept = propostas.filter(p => {
  const d = String(p.dataDigitacao || '');
  return d.startsWith('2026-09') || d.startsWith('0026-09');
});

console.log('--- ALL PROPOSALS IN SEPTEMBER WITH VALOR EMPRESTIMO == 0 BUT VALOR TAXA > 0 OR VENDEDORA LUCELIA ---');
sept.forEach(p => {
  if (Number(p.valorEmprestimo || 0) === 0 && Number(p.valorTaxa || 0) > 0) {
    console.log(`Vendedora: "${p.vendedora}" | Dig: ${p.dataDigitacao} | Cliente: ${p.nomeCliente} | Emp: ${p.valorEmprestimo} | Taxa: ${p.valorTaxa}`);
  }
});
