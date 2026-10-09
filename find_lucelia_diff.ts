import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

console.log('Searching for Lucelia differences...');

// Lucelia's target is 160.717,81. Currently paid in Sept is 123.832,40. Diff = 36.885,41
// Hellen's target is 179.640,02. Currently paid in Sept is 177.675,88. Diff = 1.964,14
// Total diff = 38.849,55. Exactly 451.439,84 - 412.590,29 = 38.849,55!

// Let's find ANY proposal in propostas where:
// 1) vendedora is LUCELIA or digitador is LUCELIA or p mentions LUCELIA
// 2) dataDigitacao is NOT in September OR status is NOT Pago OR anything else!
const luceliaProps = propostas.filter(p => {
  const v = String(p.vendedora || '').toUpperCase();
  const d = String(p.digitador || '').toUpperCase();
  return v.includes('LUC') || d.includes('LUC');
});

console.log(`Total Lucelia props in DB: ${luceliaProps.length}`);

// Group lucelia props by month of dataDigitacao and month of dataPagamentoCliente
const lucByDig: Record<string, { count: number; totalEmp: number; totalTaxa: number; pagosEmp: number }> = {};
luceliaProps.forEach(p => {
  const m = String(p.dataDigitacao || 'EMPTY').substring(0, 7);
  if (!lucByDig[m]) lucByDig[m] = { count: 0, totalEmp: 0, totalTaxa: 0, pagosEmp: 0 };
  lucByDig[m].count++;
  lucByDig[m].totalEmp += Number(p.valorEmprestimo || 0);
  lucByDig[m].totalTaxa += Number(p.valorTaxa || 0);
  const s = String(p.status || '').toUpperCase().trim();
  if (s === 'PAGA' || s === 'PAGO') {
    lucByDig[m].pagosEmp += Number(p.valorEmprestimo || 0);
  }
});

console.log('Lucelia by dataDigitacao month:', lucByDig);
