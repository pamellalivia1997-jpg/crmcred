import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

// Filter all proposals in DB with valorTaxa > 0
const candTaxa = propostas.map(p => ({
  id: p.id,
  nome: p.nomeCliente,
  vendedora: p.vendedora,
  val: Number(p.valorTaxa || 0),
  emp: Number(p.valorEmprestimo || 0),
  taxaPaga: p.taxaPaga,
  cliTaxa: p.clientePagouTaxa,
  dig: p.dataDigitacao,
  status: p.status
})).filter(c => c.val > 0);

console.log(`Candidates with valorTaxa > 0: ${candTaxa.length}`);

// We want to find a subset summing to 2100.00
const septHellenTaxas = candTaxa.filter(c => {
  const v = String(c.vendedora || '').toUpperCase();
  const d = String(c.dig || '');
  return v.includes('HEL') && d.startsWith('2026-09');
});

console.log('Sept Hellen candidates with taxa:', septHellenTaxas.length);
septHellenTaxas.forEach(c => {
  if (c.val === 2100) {
    console.log('MATCH 2100 in Sept Hellen:', c);
  }
});

// Also check ALL candidates in entire DB where val == 2100:
candTaxa.forEach(c => {
  if (c.val === 2100) {
    console.log('MATCH 2100 in DB:', c);
  }
});
