import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

const diffNeeded = 160717.81 - 123832.40; // 36885.41

const otherProps = propostas.filter(p => {
  const d = String(p.dataDigitacao || '');
  return !d.startsWith('2026-09') && !d.startsWith('0026-09') && Number(p.valorEmprestimo || 0) > 0;
});

otherProps.forEach(p => {
  if (Math.abs(Number(p.valorEmprestimo || 0) - diffNeeded) < 5000) {
    console.log('CLOSE PROP:', p.vendedora, p.nomeCliente, p.valorEmprestimo, p.dataDigitacao);
  }
});
