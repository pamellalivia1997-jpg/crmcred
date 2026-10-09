import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

console.log('--- SUBSET SUM SEARCH FOR LUCELIA (target = 36885.41) ---');
// Let's check all proposals in propostas (any month, any seller, or Lucelia in other months)
// Candidates:
const candidates = propostas.map(p => ({
  id: p.id,
  nome: p.nomeCliente,
  vendedora: p.vendedora,
  val: Number(p.valorEmprestimo || 0),
  taxa: Number(p.valorTaxa || 0),
  dig: p.dataDigitacao,
  pag: p.dataPagamentoCliente,
  status: p.status
})).filter(c => c.val > 0);

console.log(`Candidates with val > 0: ${candidates.length}`);

// Check single:
for (const c of candidates) {
  if (Math.abs(c.val - 36885.41) < 0.05) {
    console.log('MATCH SINGLE:', c);
  }
}

// Check pairs:
for (let i = 0; i < candidates.length; i++) {
  for (let j = i + 1; j < candidates.length; j++) {
    const sum = candidates[i].val + candidates[j].val;
    if (Math.abs(sum - 36885.41) < 0.05) {
      console.log('MATCH PAIR:', candidates[i], candidates[j]);
    }
  }
}

// Check triplets:
for (let i = 0; i < candidates.length; i++) {
  for (let j = i + 1; j < candidates.length; j++) {
    const s2 = candidates[i].val + candidates[j].val;
    if (s2 > 36885.41) continue;
    for (let k = j + 1; k < candidates.length; k++) {
      const sum = s2 + candidates[k].val;
      if (Math.abs(sum - 36885.41) < 0.05) {
        console.log('MATCH TRIPLET:', candidates[i], candidates[j], candidates[k]);
      }
    }
  }
}

// Also search for Hellen target difference = 1964.14
console.log('--- SEARCH FOR HELLEN (target = 1964.14) ---');
for (const c of candidates) {
  if (Math.abs(c.val - 1964.14) < 0.05) {
    console.log('HELLEN MATCH SINGLE:', c);
  }
}
for (let i = 0; i < candidates.length; i++) {
  for (let j = i + 1; j < candidates.length; j++) {
    const sum = candidates[i].val + candidates[j].val;
    if (Math.abs(sum - 1964.14) < 0.05) {
      console.log('HELLEN MATCH PAIR:', candidates[i], candidates[j]);
    }
  }
}
