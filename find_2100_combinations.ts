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

// Search pairs or triplets summing to 2100 in Sept Hellen
const septHellen = candTaxa.filter(c => {
  const v = String(c.vendedora || '').toUpperCase();
  const d = String(c.dig || '');
  return v.includes('HEL') && d.startsWith('2026-09');
});

console.log('Sept Hellen total with taxa > 0:', septHellen.length);

for (let i = 0; i < septHellen.length; i++) {
  for (let j = i + 1; j < septHellen.length; j++) {
    if (Math.abs(septHellen[i].val + septHellen[j].val - 2100) < 0.05) {
      console.log('Sept Hellen pair summing to 2100:', septHellen[i], septHellen[j]);
    }
  }
}

// In entire DB, search pairs summing to 2100 where vendedora is Hellen or Lucelia
const allHellen = candTaxa.filter(c => {
  const v = String(c.vendedora || '').toUpperCase();
  return v.includes('HEL');
});

for (let i = 0; i < allHellen.length; i++) {
  if (Math.abs(allHellen[i].val - 2100) < 0.05) {
    console.log('All Hellen single 2100:', allHellen[i]);
  }
}
for (let i = 0; i < allHellen.length; i++) {
  for (let j = i + 1; j < allHellen.length; j++) {
    if (Math.abs(allHellen[i].val + allHellen[j].val - 2100) < 0.05) {
      console.log('All Hellen pair 2100:', allHellen[i], allHellen[j]);
    }
  }
}
