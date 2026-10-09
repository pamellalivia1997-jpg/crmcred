import * as fs from 'fs';

const propostas: any[] = JSON.parse(fs.readFileSync('all_propostas.json', 'utf-8'));

const gilberto = propostas.find(p => p.nomeCliente && p.nomeCliente.includes('GILBERTO ANTONIO'));
if (gilberto) {
  console.log('Gilberto proposal:', gilberto);
}
