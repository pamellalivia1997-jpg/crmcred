import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

const diffNeeded = 160717.81 - 123832.40; // 36885.41
console.log('Diff needed:', diffNeeded);

const otherProps = propostas.filter(p => {
  const d = String(p.dataDigitacao || '');
  return !d.startsWith('2026-09') && !d.startsWith('0026-09') && Number(p.valorEmprestimo || 0) > 0;
});

for (let i = 0; i < otherProps.length; i++) {
  for (let j = i + 1; j < otherProps.length; j++) {
    const sum = Number(otherProps[i].valorEmprestimo || 0) + Number(otherProps[j].valorEmprestimo || 0);
    if (Math.abs(sum - diffNeeded) < 0.05) {
      console.log('FOUND PAIR:', otherProps[i].vendedora, otherProps[i].nomeCliente, otherProps[i].valorEmprestimo, otherProps[i].dataDigitacao, 'AND', otherProps[j].vendedora, otherProps[j].nomeCliente, otherProps[j].valorEmprestimo, otherProps[j].dataDigitacao);
    }
  }
}
