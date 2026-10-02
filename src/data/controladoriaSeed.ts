import { ComissaoPromotora } from '../types';

export const SPREADSHEET_COMMISSIONS_SEED: ComissaoPromotora[] = [
  {
    id: 'com-seed-01',
    propostaId: 'prop-1001',
    numeroContrato: '482011',
    clienteNome: 'Maria José do Carmo da Silva',
    promotora: 'J2 Promotora',
    valorRecebido: 450.00,
    dataRecebimento: '2026-09-15',
    tipo: 'fixo',
    status: 'confirmada',
    observacao: 'Comissão recebida J2 Promotora'
  },
  {
    id: 'com-seed-02',
    propostaId: 'prop-1002',
    numeroContrato: '482012',
    clienteNome: 'Severino Manoel dos Santos',
    promotora: 'Sempre',
    valorRecebido: 620.00,
    dataRecebimento: '2026-09-18',
    tipo: 'fixo',
    status: 'confirmada',
    observacao: 'Comissão recebida Sempre'
  }
];
