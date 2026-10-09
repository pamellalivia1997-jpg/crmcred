import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

const isPago = (p: any) => {
  const s = String(p.status || '').toUpperCase().trim();
  return s === 'PAGA' || s === 'PAGO';
};

// Target for Lucelia in Sept = 160717.81. Current sum = 123832.40. Diff = 36885.41
const diffLuc = 160717.81 - 123832.40; // 36885.41

// Let's find any subset of propostas outside September with vendedora Lucelia (or any vendedora) whose sum equals 36885.41
const otherProps = propostas.filter(p => {
  const d = String(p.dataDigitacao || '');
  return !d.startsWith('2026-09') && !d.startsWith('0026-09') && Number(p.valorEmprestimo || 0) > 0 && isPago(p);
});

console.log(`Checking combinations among ${otherProps.length} other paid proposals for diff ${diffLuc}...`);

function findSub(target: number, list: any[]) {
  // sort descending
  const sorted = [...list].sort((a, b) => b.valorEmprestimo - a.valorEmprestimo);
  function dfs(idx: number, sum: number, chosen: any[]) {
    if (Math.abs(sum - target) < 0.05) {
      console.log('FOUND SUBSET FOR LUCELIA DIFF:');
      chosen.forEach(c => console.log(`  - ${c.vendedora} | ${c.nomeCliente} | R$ ${c.valorEmprestimo} | Dig: ${c.dataDigitacao}`));
      return true;
    }
    if (chosen.length >= 5 || sum > target + 0.05) return false;
    for (let i = idx; i < sorted.length; i++) {
      if (sum + sorted[i].valorEmprestimo > target + 0.05) continue;
      chosen.push(sorted[i]);
      if (dfs(i + 1, sum + sorted[i].valorEmprestimo, chosen)) return true;
      chosen.pop();
    }
    return false;
  }
  dfs(0, 0, []);
}

findSub(diffLuc, otherProps);
