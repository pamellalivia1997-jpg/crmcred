import {
  User,
  Cliente,
  Proposta,
  ComissaoPromotora,
  MetaVendedora,
  Feedback,
  ContaPagar,
  AlertaOportunidade,
  AuditLog,
  Operacao,
  Banco,
  Promotora,
  Convenio,
  StatusProposta
} from '../types';
import { SPREADSHEET_COMMISSIONS_SEED } from './controladoriaSeed';

export const INITIAL_USERS: User[] = [
  {
    id: 'Vq7wUkG7ltcanJjJmnEqYZOiiym1',
    name: 'Geovanne Ferreira',
    email: 'geovanne.arcelino@gmail.com',
    password: '123123',
    role: 'financeiro',
    phone: '(81) 98000-0000',
    status: 'ativo',
    monthlySalesGoal: 0,
    monthlyTaxPercentGoal: 0,
  },
  {
    id: 'eRkG9KNI8AZMCtQGkrPAPc7g8PC3',
    name: 'Pamella',
    email: 'pamellalivia1997@gmail.com',
    password: '123',
    role: 'adm',
    phone: '(81) 98000-0000',
    pix: '81988920288',
    status: 'ativo',
    monthlySalesGoal: 0,
    monthlyTaxPercentGoal: 0,
  },
  {
    id: 'user-livia',
    name: 'Lívia',
    email: 'livia@liviacredsaude.com.br',
    password: '123',
    role: 'proprietaria',
    phone: '(81) 98000-0000',
    status: 'ativo',
    monthlySalesGoal: 0,
    monthlyTaxPercentGoal: 0,
  },
  {
    id: 'user-bianca',
    name: 'Bianca',
    email: 'bianca@liviacredsaude.com.br',
    password: '123',
    role: 'vendedora',
    phone: '(81) 3543-1200',
    cpf: '',
    pix: '12694849407',
    salesName: 'Loja Igarassu',
    status: 'ativo',
    monthlySalesGoal: 85000,
    monthlyTaxPercentGoal: 11.0,
  },
  {
    id: 'user-hellen',
    name: 'Hellen Vasconcelos',
    email: 'hellen.cred@gmail.com',
    password: '123',
    role: 'vendedora',
    phone: '',
    cpf: '',
    pix: '81994556660',
    salesName: 'Hellen',
    status: 'ativo',
    monthlySalesGoal: 95000,
    monthlyTaxPercentGoal: 12.0,
  },
  {
    id: 'user-taciana',
    name: 'Taciana Silva',
    email: 'taciana@gmail.com',
    password: '123',
    role: 'vendedora',
    phone: '',
    cpf: '',
    pix: '',
    salesName: 'Taciana',
    status: 'ativo',
    monthlySalesGoal: 80000,
    monthlyTaxPercentGoal: 10.5,
  },
  {
    id: 'user-lucelia',
    name: 'Lucélia Ramos',
    email: 'lucelia@liviacredsaude.com.br',
    password: '789',
    role: 'vendedora',
    phone: '(81) 98333-4455',
    cpf: '',
    pix: '11557314411',
    salesName: 'Lucélia',
    status: 'ativo',
    monthlySalesGoal: 75000,
    monthlyTaxPercentGoal: 10.0,
  },
  {
    id: 'user-ana',
    name: 'Ana Paula',
    email: 'ana@liviacredsaude.com.br',
    password: '123',
    role: 'digitador',
    phone: '(81) 98555-6677',
    pix: '81985193615',
    status: 'ativo',
    monthlySalesGoal: 0,
    monthlyTaxPercentGoal: 0,
  }
];

// Helper to generate seed clients
const CLIENT_NAMES = [
  'Maria José do Carmo da Silva', 'Severino Manoel dos Santos', 'Francisca Alves de Oliveira',
  'Antônio Carlos de Albuquerque', 'Ana Lúcia Ferreira Gomes', 'José Roberto de Vasconcelos',
  'Manoel Pereira da Costa', 'Maria da Conceição Souza', 'Luiz Gonzaga Bezerra',
  'Regina Célia de Medeiros', 'Edvaldo Francisco de Lima', 'Terezinha Rodrigues de Santana',
  'João Batista Maranhão', 'Sônia Maria dos Prazeres', 'Paulo Sérgio Cavalcanti',
  'Aparecida Ferreira de Melo', 'Cláudio Humberto da Silva', 'Marta Suely da Trindade',
  'Benedito Valdemar Peixoto', 'Rosângela de Cássia Araújo', 'Geraldo Magela de Araújo',
  'Lúcia de Fátima Monteiro', 'Valdir Ribeiro de Castro', 'Vilma Soares da Silva',
  'Ivanildo Barbosa de Lima', 'Dioneide Pereira Duarte', 'Rivaldo Bezerra da Cruz',
  'Joselita Maria de Arruda', 'Cícero Romão de Albuquerque', 'Carmem Lúcia Nascimento',
  'Edson Arantes de Carvalho', 'Zuleide Pimentel Soares', 'Marcos Aurélio Guedes',
  'Cleide Maria de Pontes', 'Nilton César Barreto', 'Eunice Maria da Paixão',
  'Ademir José de Andrade', 'Lenira Batista de Morais', 'Hélio Francisco da Penha',
  'Inês de Castro Alencar', 'Gilberto Gilson da Cruz', 'Creusa Alves de Brito',
  'Walmir Queiroz de Holanda', 'Alzira Bezerra Fontes', 'Rogério Dantas de Oliveira',
  'Socorro Maria Leite', 'Moacir Vicente da Silva', 'Quitéria Ramos Feitosa',
  'Osvaldo Aranha Cabral', 'Vera Lúcia Guimarães'
];

const CIDADES = ['Igarassu', 'Abreu e Lima', 'Paulista', 'Olinda', 'Recife', 'Jaboatão dos Guararapes', 'Itapissuma', 'Goiana'];
const CONVENIOS: Convenio[] = ['INSS', 'INSS', 'INSS', 'Prefeitura de Igarassu', 'Governo de PE', 'SIAPE', 'FGTS'];
const VENDEDORAS = ['Bianca', 'Hellen Vasconcelos', 'Taciana Silva', 'Lucélia Ramos', 'Outros'];
const OPERACOES: Operacao[] = [
  'FGTS', 'Saque Complementar', 'Refin', 'Conta de Energia Elétrica/Luz',
  'Portabilidade', 'Refin da Port', 'Margem', 'Cartão Novo', 'Credcesta',
  'Cartão de Crédito', 'Crédito do Trabalhador', 'Pessoal'
];
const BANCOS: Banco[] = ['Banco Pan', 'C6 Consig', 'Santander', 'Itaú Consig', 'Daycoval', 'Facta', 'Master', 'BMG', 'Mercantil', 'Safra'];
const PROMOTORAS: Promotora[] = ['J2 Promotora', 'Sempre', 'DG', 'GFT'];

// Generate deterministic CPFs
function generateCPF(i: number): string {
  const base = (120000000 + i * 3791).toString().padStart(9, '0');
  const d1 = (parseInt(base[0]) * 10 + parseInt(base[1]) * 9 + parseInt(base[2]) * 8 + parseInt(base[3]) * 7 + parseInt(base[4]) * 6 + parseInt(base[5]) * 5 + parseInt(base[6]) * 4 + parseInt(base[7]) * 3 + parseInt(base[8]) * 2) % 11;
  const v1 = d1 < 2 ? 0 : 11 - d1;
  const base2 = base + v1;
  const d2 = (parseInt(base2[0]) * 11 + parseInt(base2[1]) * 10 + parseInt(base2[2]) * 9 + parseInt(base2[3]) * 8 + parseInt(base2[4]) * 7 + parseInt(base2[5]) * 6 + parseInt(base2[6]) * 5 + parseInt(base2[7]) * 4 + parseInt(base2[8]) * 3 + parseInt(base2[9]) * 2) % 11;
  const v2 = d2 < 2 ? 0 : 11 - d2;
  return `${base}${v1}${v2}`;
}

export function generateSeedData() {
  return generateSeedDataOld();
}

export function generateSeedDataOld() {
  const clientes: Cliente[] = [];
  const propostas: Proposta[] = [];
  const comissoesPromotoras: ComissaoPromotora[] = [...SPREADSHEET_COMMISSIONS_SEED];
  const alertas: AlertaOportunidade[] = [];
  const auditLogs: AuditLog[] = [];

  // Generate Accounts Payable (Contas a Pagar)
  const contasPagar: ContaPagar[] = [
    {
      id: 'cp-01',
      descricao: 'Aluguel Loja Física - Centro Igarassu',
      categoria: 'Aluguel',
      valor: 3500.00,
      vencimento: '2026-10-05',
      recorrente: true,
      status: 'pendente',
    },
    {
      id: 'cp-02',
      descricao: 'Sistema CRM, Telefonia VoIP & Discador Cloud',
      categoria: 'Sistemas & Telefonia',
      valor: 1480.00,
      vencimento: '2026-10-10',
      recorrente: true,
      status: 'pendente',
    },
    {
      id: 'cp-03',
      descricao: 'Neoenergia Celpe - Energia Loja Igarassu',
      categoria: 'Despesas Gerais',
      valor: 820.50,
      vencimento: '2026-10-12',
      recorrente: true,
      status: 'pendente',
    },
    {
      id: 'cp-04',
      descricao: 'Internet Fibra Óptica 800MB Dedicada',
      categoria: 'Sistemas & Telefonia',
      valor: 249.90,
      vencimento: '2026-10-15',
      recorrente: true,
      status: 'pendente',
    },
    {
      id: 'cp-05',
      descricao: 'Honorários Contabilidade Empresarial',
      categoria: 'Contabilidade',
      valor: 1200.00,
      vencimento: '2026-10-20',
      recorrente: true,
      status: 'pendente',
    },
    {
      id: 'cp-06',
      descricao: 'Anúncios Digitais Meta Ads & Google (Captação Igarassu e Região)',
      categoria: 'Marketing',
      valor: 2500.00,
      vencimento: '2026-09-30',
      recorrente: true,
      status: 'pendente',
    },
    {
      id: 'cp-07',
      descricao: 'Imposto DAS Simples Nacional - Competência 08/2026',
      categoria: 'Impostos',
      valor: 4320.15,
      vencimento: '2026-09-20',
      recorrente: true,
      status: 'paga',
      dataPagamento: '2026-09-19',
    },
    {
      id: 'cp-08',
      descricao: 'Adiantamento Vale-Transporte & Alimentação Equipe',
      categoria: 'Folha de Pagamento',
      valor: 1950.00,
      vencimento: '2026-09-15',
      recorrente: true,
      status: 'paga',
      dataPagamento: '2026-09-15',
    }
  ];

  // Monthly Sales Goals for 2026-09
  const metas: MetaVendedora[] = [
    {
      id: 'meta-hellen-2026-09',
      vendedoraId: 'user-hellen',
      vendedoraNome: 'Hellen Vasconcelos',
      mesAno: '2026-09',
      metaVenda: 95000,
      metaPercentualTaxa: 12.0
    },
    {
      id: 'meta-bianca-2026-09',
      vendedoraId: 'user-bianca',
      vendedoraNome: 'Bianca',
      mesAno: '2026-09',
      metaVenda: 85000,
      metaPercentualTaxa: 11.0
    },
    {
      id: 'meta-taciana-2026-09',
      vendedoraId: 'user-taciana',
      vendedoraNome: 'Taciana Silva',
      mesAno: '2026-09',
      metaVenda: 80000,
      metaPercentualTaxa: 10.5
    },
    {
      id: 'meta-lucelia-2026-09',
      vendedoraId: 'user-lucelia',
      vendedoraNome: 'Lucélia Ramos',
      mesAno: '2026-09',
      metaVenda: 75000,
      metaPercentualTaxa: 10.0
    }
  ];

  // Feedbacks registered by ADM (Pamella)
  const feedbacks: Feedback[] = [];

  return {
    users: INITIAL_USERS,
    clientes,
    propostas,
    comissoesPromotoras,
    contasPagar,
    metas,
    feedbacks,
    alertas,
    auditLogs
  };
}
