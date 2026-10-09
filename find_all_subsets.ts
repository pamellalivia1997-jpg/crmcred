import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

// Filter all proposals in DB with valorEmprestimo > 0
const candEmp = propostas.map(p => ({
  id: p.id,
  nome: p.nomeCliente,
  vendedora: p.vendedora,
  digitador: p.digitador,
  val: Number(p.valorEmprestimo || 0),
  taxa: Number(p.valorTaxa || 0),
  dig: p.dataDigitacao,
  pag: p.dataPagamentoCliente,
  status: p.status
})).filter(c => c.val > 0);

console.log('Searching all combinations up to length 6 that sum to 36885.41...');

function findComb(target: number, list: any[], maxLen: number) {
  // Sort descending
  const sorted = [...list].sort((a, b) => b.val - a.val);
  
  function dfs(startIndex: number, currentSum: number, chosen: any[]) {
    if (Math.abs(currentSum - target) < 0.05) {
      console.log(`FOUND EXACT COMBINATION (len ${chosen.length}):`);
      chosen.forEach(c => console.log(`  ${c.vendedora} | ${c.nome} | val: ${c.val} | dig: ${c.dig} | pag: ${c.pag} | status: ${c.status}`));
      return true;
    }
    if (chosen.length >= maxLen || currentSum > target + 0.05) return false;

    for (let i = startIndex; i < sorted.length; i++) {
      if (currentSum + sorted[i].val > target + 0.05) continue;
      chosen.push(sorted[i]);
      dfs(i + 1, currentSum + sorted[i].val, chosen);
      chosen.pop();
    }
    return false;
  }

  dfs(0, 0, []);
}

findComb(36885.41, candEmp, 5);
