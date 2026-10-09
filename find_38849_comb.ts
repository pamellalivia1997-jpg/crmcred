import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

// Filter all proposals in DB with valorEmprestimo > 0 and search for:
// subset that equals 38849.55
console.log('Searching all combinations of proposals across the whole database that sum to 38849.55...');

const cand = propostas.map(p => ({
  id: p.id,
  nome: p.nomeCliente,
  vendedora: p.vendedora,
  val: Number(p.valorEmprestimo || 0),
  taxa: Number(p.valorTaxa || 0),
  dig: p.dataDigitacao,
  pag: p.dataPagamentoCliente,
  status: p.status
})).filter(c => c.val > 0);

cand.sort((a, b) => b.val - a.val);

function findComb(target: number, list: any[], maxLen: number) {
  function dfs(startIndex: number, currentSum: number, chosen: any[]) {
    if (Math.abs(currentSum - target) < 0.05) {
      console.log(`FOUND EXACT COMBINATION (len ${chosen.length}):`);
      chosen.forEach(c => console.log(`  ${c.vendedora} | ${c.nome} | val: ${c.val} | dig: ${c.dig} | pag: ${c.pag} | status: ${c.status}`));
      return true;
    }
    if (chosen.length >= maxLen || currentSum > target + 0.05) return false;

    for (let i = startIndex; i < list.length; i++) {
      if (currentSum + list[i].val > target + 0.05) continue;
      chosen.push(list[i]);
      if (dfs(i + 1, currentSum + list[i].val, chosen)) return true;
      chosen.pop();
    }
    return false;
  }

  for (let len = 1; len <= maxLen; len++) {
    console.log(`Checking combinations of length ${len}...`);
    if (dfs(0, 0, [])) break;
  }
}

findComb(38849.55, cand, 4);
