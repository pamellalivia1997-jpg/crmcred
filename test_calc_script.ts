import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));
const users: any[] = JSON.parse(fs.readFileSync('all_users.json', 'utf-8'));

const sept = propostas.filter(p => {
  const d = String(p.dataDigitacao || '');
  return d.startsWith('2026-09') || d.startsWith('0026-09');
});

const isPago = (p: any) => {
  const s = String(p.status || '').toUpperCase().trim();
  return s === 'PAGA' || s === 'PAGO';
};

const isTaxaPaga = (p: any) => {
  const val = p.taxaPaga;
  const cliVal = p.clientePagouTaxa;
  if (val === true || cliVal === true) return true;
  const sVal = String(val || '').toUpperCase().trim();
  const sCliVal = String(cliVal || '').toUpperCase().trim();
  return sVal === 'SIM' || sVal === 'S' || sCliVal === 'SIM' || sCliVal === 'S';
};

const activeSellers = users.filter(u => u.role === 'vendedora' && u.status === 'ativo');

const rankingMap: Record<string, { vendas: number; taxa: number; count: number }> = {};
activeSellers.forEach(u => {
  rankingMap[u.salesName || u.name] = { vendas: 0, taxa: 0, count: 0 };
});
rankingMap['Outros'] = { vendas: 0, taxa: 0, count: 0 };

const matchesUser = (pSeller: string, u: any) => {
  if (!pSeller) return false;
  const p = pSeller.toLowerCase().trim();
  const name = (u.name || '').toLowerCase().trim();
  const sales = (u.salesName || '').toLowerCase().trim();
  if ((p.includes('igarassu') || p.includes('loja')) && (sales.includes('igarassu') || sales.includes('bianca') || name.includes('bianca'))) return true;
  if (p.includes('hellen') && (name.includes('hellen') || sales.includes('hellen'))) return true;
  if ((p.includes('luc') || p.includes('lucelia')) && (name.includes('luc') || sales.includes('luc'))) return true;
  return p === name || p === sales || p.includes(name) || name.includes(p);
};

sept.filter(isPago).forEach(p => {
  const seller = activeSellers.find(u => matchesUser(p.vendedora, u));
  const key = seller ? (seller.salesName || seller.name) : 'Outros';
  if (!rankingMap[key]) rankingMap[key] = { vendas: 0, taxa: 0, count: 0 };
  rankingMap[key].vendas += Number(p.valorEmprestimo || 0);
  rankingMap[key].count += 1;
});

sept.filter(isTaxaPaga).forEach(p => {
  const seller = activeSellers.find(u => matchesUser(p.vendedora, u));
  const key = seller ? (seller.salesName || seller.name) : 'Outros';
  if (!rankingMap[key]) rankingMap[key] = { vendas: 0, taxa: 0, count: 0 };
  rankingMap[key].taxa += Number(p.valorTaxa || 0);
});

console.log('--- SIMULATED RANKING BY CALCULATIONS ---');
let totalV = 0;
let totalT = 0;
for (const [k, v] of Object.entries(rankingMap)) {
  if (v.vendas > 0 || v.taxa > 0) {
    console.log(`${k} -> Vendas: R$ ${v.vendas.toFixed(2)} | Taxas: R$ ${v.taxa.toFixed(2)} | Contratos: ${v.count}`);
    totalV += v.vendas;
    totalT += v.taxa;
  }
}
console.log(`TOTAL -> Vendas: R$ ${totalV.toFixed(2)} | Taxas: R$ ${totalT.toFixed(2)}`);
