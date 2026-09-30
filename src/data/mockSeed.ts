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

export const INITIAL_USERS: User[] = [
  {
    id: 'user-livia',
    name: 'Lívia',
    email: 'livia@liviacredsaude.com.br',
    password: '123',
    role: 'proprietaria',
    phone: '(81) 99123-4567',
    status: 'ativo',
    monthlySalesGoal: 380000,
    monthlyTaxPercentGoal: 11.5,
    baseSalaryCost: 0,
  },
  {
    id: 'user-pamella',
    name: 'Pamella',
    email: 'pamella@liviacredsaude.com.br',
    password: '123',
    role: 'adm',
    phone: '(81) 98765-4321',
    status: 'ativo',
    monthlySalesGoal: 50000,
    monthlyTaxPercentGoal: 10.0,
    baseSalaryCost: 3500,
  },
  {
    id: 'user-carlos',
    name: 'Carlos Eduardo',
    email: 'financeiro@liviacredsaude.com.br',
    password: '123',
    role: 'financeiro',
    phone: '(81) 99876-1234',
    status: 'ativo',
    monthlySalesGoal: 0,
    monthlyTaxPercentGoal: 0,
    baseSalaryCost: 3200,
  },
  {
    id: 'user-bianca',
    name: 'Bianca',
    email: 'bianca@liviacredsaude.com.br',
    password: '123',
    role: 'vendedora',
    phone: '(81) 98444-5566',
    status: 'ativo',
    monthlySalesGoal: 85000,
    monthlyTaxPercentGoal: 11.0,
    baseSalaryCost: 2200,
  },
  {
    id: 'user-hellen',
    name: 'Hellen Vasconcelos',
    email: 'hellen@liviacredsaude.com.br',
    password: '123',
    role: 'vendedora',
    phone: '(81) 98111-2233',
    status: 'ativo',
    monthlySalesGoal: 95000,
    monthlyTaxPercentGoal: 12.0,
    baseSalaryCost: 2200,
  },
  {
    id: 'user-taciana',
    name: 'Taciana Silva',
    email: 'taciana@liviacredsaude.com.br',
    password: '123',
    role: 'vendedora',
    phone: '(81) 98222-3344',
    status: 'ativo',
    monthlySalesGoal: 80000,
    monthlyTaxPercentGoal: 10.5,
    baseSalaryCost: 2200,
  },
  {
    id: 'user-lucelia',
    name: 'Lucélia Ramos',
    email: 'lucelia@liviacredsaude.com.br',
    password: '123',
    role: 'vendedora',
    phone: '(81) 98333-4455',
    status: 'ativo',
    monthlySalesGoal: 75000,
    monthlyTaxPercentGoal: 10.0,
    baseSalaryCost: 2200,
  },
  {
    id: 'user-loja-igarassu',
    name: 'Loja Igarassu (Balcão)',
    email: 'igarassu@liviacredsaude.com.br',
    password: '123',
    role: 'vendedora',
    phone: '(81) 3543-1200',
    status: 'ativo',
    monthlySalesGoal: 85000,
    monthlyTaxPercentGoal: 11.0,
    baseSalaryCost: 2400,
  },
  {
    id: 'user-ana',
    name: 'Ana Paula',
    email: 'ana@liviacredsaude.com.br',
    password: '123',
    role: 'digitador',
    phone: '(81) 98555-6677',
    status: 'ativo',
    monthlySalesGoal: 0,
    monthlyTaxPercentGoal: 0,
    baseSalaryCost: 2000,
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
const VENDEDORAS = ['Hellen Vasconcelos', 'Taciana Silva', 'Lucélia Ramos', 'Loja Igarassu (Balcão)', 'Pamella'];
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
  const clientes: Cliente[] = [];
  const propostas: Proposta[] = [];
  const comissoesPromotoras: ComissaoPromotora[] = [];
  const alertas: AlertaOportunidade[] = [];
  const auditLogs: AuditLog[] = [];

  // Generate 85 rich clients
  for (let i = 0; i < 85; i++) {
    const cpf = generateCPF(i + 1);
    const nome = CLIENT_NAMES[i % CLIENT_NAMES.length] + (i >= CLIENT_NAMES.length ? ` Filho` : '');
    const cidade = CIDADES[i % CIDADES.length];
    const convenio = CONVENIOS[i % CONVENIOS.length];
    const vendedora = VENDEDORAS[i % VENDEDORAS.length];
    const birthYear = 1948 + (i % 38);
    let birthMonth = ((i % 12) + 1).toString().padStart(2, '0');
    let birthDay = ((i % 28) + 1).toString().padStart(2, '0');

    // Dedicated birthdays this week for sellers to congratulate
    if (i === 1) {
      birthMonth = '09';
      birthDay = '29'; // Hoje! (29 de setembro)
    } else if (i === 6) {
      birthMonth = '09';
      birthDay = '30'; // Amanhã (30 de setembro)
    } else if (i === 11) {
      birthMonth = '10';
      birthDay = '02'; // Nesta semana (02 de outubro)
    } else if (i === 2) {
      birthMonth = '09';
      birthDay = '29'; // Hoje!
    } else if (i === 7) {
      birthMonth = '09';
      birthDay = '28'; // Ontem (28 de setembro)
    }

    const telSuffix = (1000 + (i * 87) % 8999).toString();
    const tel = `(81) 98${(i % 9)}${telSuffix.substring(0, 2)}-${telSuffix.substring(2)}4`;

    const client: Cliente = {
      id: cpf,
      cpf,
      nome,
      dataNascimento: `${birthYear}-${birthMonth}-${birthDay}`,
      telefone: tel,
      email: `${nome.toLowerCase().split(' ')[0]}.${birthYear}@gmail.com`,
      cidade,
      convenioPrincipal: convenio,
      observacoes: i % 4 === 0 ? 'Cliente muito fiel, prefere atendimento presencial em Igarassu.' : (i % 5 === 0 ? 'Gosta de simulações com parcelas baixas no Pan.' : 'Atendimento preferencial por WhatsApp.'),
      vendedoraResponsavel: vendedora,
      dataCriacao: i < 50 ? '2025-09-10' : '2026-03-15',
      statusCartao: (i % 3 === 0) ? 'possui' : (i % 3 === 1 ? 'disponivel' : 'nao_possui'),
      possuiMargemLivre: i % 2 === 0
    };
    clientes.push(client);
  }

  // Generate ~240 proposals spanning the past 12 months (2025-10 to 2026-09)
  let contractCounter = 482010;
  let propIdCounter = 1000;

  // Month distribution weights to achieve ~R$ 340k - R$ 390k recent months
  const months = [
    { year: 2025, month: 10, count: 18, baseVal: 18000 },
    { year: 2025, month: 11, count: 19, baseVal: 19000 },
    { year: 2025, month: 12, count: 22, baseVal: 20000 }, // 13o salario
    { year: 2026, month: 1, count: 17, baseVal: 17500 },
    { year: 2026, month: 2, count: 16, baseVal: 18000 },
    { year: 2026, month: 3, count: 21, baseVal: 19500 },
    { year: 2026, month: 4, count: 20, baseVal: 19000 },
    { year: 2026, month: 5, count: 22, baseVal: 19500 },
    { year: 2026, month: 6, count: 24, baseVal: 20000 },
    { year: 2026, month: 7, count: 25, baseVal: 21000 },
    { year: 2026, month: 8, count: 28, baseVal: 22000 }, // August
    { year: 2026, month: 9, count: 26, baseVal: 22500 }, // Current month (September 2026)
  ];

  months.forEach(m => {
    for (let c = 0; c < m.count; c++) {
      propIdCounter++;
      contractCounter++;
      const clientIdx = (propIdCounter * 7) % clientes.length;
      const client = clientes[clientIdx];
      const operacao = OPERACOES[(propIdCounter + c) % OPERACOES.length];
      const banco = BANCOS[(propIdCounter + c * 3) % BANCOS.length];
      const promotora = PROMOTORAS[(propIdCounter + c * 2) % PROMOTORAS.length];
      const vendedora = VENDEDORAS[(propIdCounter + c) % VENDEDORAS.length];
      const day = ((c % 27) + 1).toString().padStart(2, '0');
      const monthStr = m.month.toString().padStart(2, '0');
      const dataDig = `${m.year}-${monthStr}-${day}`;

      // Value logic
      let valorEmprestimo = 0;
      let taxaPercent = 0.10 + ((propIdCounter % 5) * 0.015); // 10% to 16%

      if (operacao === 'FGTS') {
        valorEmprestimo = 2500 + ((propIdCounter % 8) * 1200);
      } else if (operacao === 'Portabilidade' || operacao === 'Refin da Port') {
        valorEmprestimo = 18000 + ((propIdCounter % 12) * 3500);
      } else if (operacao === 'Refin' || operacao === 'Margem') {
        valorEmprestimo = 9000 + ((propIdCounter % 10) * 2200);
      } else if (operacao === 'Conta de Energia Elétrica/Luz') {
        valorEmprestimo = 1500 + ((propIdCounter % 5) * 500);
        taxaPercent = 0.16;
      } else if (operacao === 'Cartão Novo' || operacao === 'Credcesta' || operacao === 'Cartão de Crédito') {
        valorEmprestimo = 3200 + ((propIdCounter % 4) * 800);
      } else {
        valorEmprestimo = 5000 + ((propIdCounter % 8) * 1500);
      }

      const valorTaxa = Math.round(valorEmprestimo * taxaPercent);
      const percentualTaxa = Number(((valorTaxa / valorEmprestimo) * 100).toFixed(1));

      // Status logic
      let status: StatusProposta = 'Paga';
      let dataPagamentoCliente: string | undefined = `${m.year}-${monthStr}-${Math.min(28, parseInt(day) + 2).toString().padStart(2, '0')}`;
      let taxaPaga = true;
      let clientePagouTaxa = true;
      let motivoCancelamento: string | undefined = undefined;

      // In current month (2026-09), create some in other statuses
      if (m.year === 2026 && m.month === 9) {
        if (c === 0 || c === 5) {
          status = 'Em análise';
          dataPagamentoCliente = undefined;
          taxaPaga = false;
          clientePagouTaxa = false;
        } else if (c === 1 || c === 8 || c === 14) {
          status = 'Pendente';
          dataPagamentoCliente = undefined;
          taxaPaga = false;
          clientePagouTaxa = false;
        } else if (c === 2 || c === 12) {
          status = 'Aprovada';
          dataPagamentoCliente = undefined;
          taxaPaga = true;
          clientePagouTaxa = true;
        } else if (c === 4) {
          status = 'Reprovada';
          dataPagamentoCliente = undefined;
          taxaPaga = false;
          clientePagouTaxa = false;
          motivoCancelamento = 'Margem consignável insuficiente no Dataprev / INSS.';
        } else if (c === 9) {
          status = 'Cancelada';
          dataPagamentoCliente = undefined;
          taxaPaga = false;
          clientePagouTaxa = false;
          motivoCancelamento = 'Cliente desistiu por divergência de valor de parcela.';
        }
      } else if (c % 15 === 0) {
        status = 'Cancelada';
        motivoCancelamento = 'Desistência do cliente dentro do prazo legal.';
        dataPagamentoCliente = undefined;
        taxaPaga = false;
        clientePagouTaxa = false;
      } else if (c % 22 === 0) {
        status = 'Reprovada';
        motivoCancelamento = 'Pendência cadastral e restrição no banco de origem.';
        dataPagamentoCliente = undefined;
        taxaPaga = false;
        clientePagouTaxa = false;
      }

      const digitador = (c % 4 === 0) 
        ? 'Ana Paula' 
        : (vendedora === 'Loja Igarassu (Balcão)' ? 'Taciana Silva' : vendedora);
      const isSimulacao = (c % 3 === 0);

      const proposta: Proposta = {
        id: `prop-${propIdCounter}`,
        carimboDataHora: `${dataDig} 10:${(10 + (c * 2) % 49).toString().padStart(2, '0')}:00`,
        cpf: client.cpf,
        nomeCliente: client.nome,
        dataDigitacao: dataDig,
        dataPagamentoCliente,
        convenio: client.convenioPrincipal,
        operacao,
        banco,
        promotora,
        valorEmprestimo,
        valorTaxa,
        percentualTaxa,
        taxaPaga,
        clientePagouTaxa,
        vendedora,
        digitador,
        numeroContrato: contractCounter.toString(),
        status,
        isSimulacao,
        motivoCancelamento,
        observacoes: `Proposta gerada no sistema. Convênio ${client.convenioPrincipal}.`,
        historicoStatus: [
          { status: 'Em análise', data: `${dataDig} 10:15`, usuario: vendedora },
          { status: 'Aprovada', data: `${dataDig} 14:30`, usuario: 'Pamella' },
          ...(status === 'Paga' ? [{ status: 'Paga' as StatusProposta, data: `${dataPagamentoCliente} 11:00`, usuario: 'Carlos Eduardo' }] : []),
          ...(status === 'Cancelada' ? [{ status: 'Cancelada' as StatusProposta, data: `${dataDig} 16:00`, usuario: vendedora, motivo: motivoCancelamento }] : []),
          ...(status === 'Reprovada' ? [{ status: 'Reprovada' as StatusProposta, data: `${dataDig} 17:00`, usuario: 'Banco Parceiro', motivo: motivoCancelamento }] : [])
        ]
      };
      propostas.push(proposta);

      // Generate Promotora commission entry for paid proposals
      if (status === 'Paga') {
        const percentualPromotora = 0.045;
        const valorRecebido = Math.round(valorEmprestimo * percentualPromotora);
        
        // For September 2026, leave 3 commissions as "pendente" for Financeiro reconciliation demo!
        const isRecentSept = (m.year === 2026 && m.month === 9 && (c === 15 || c === 18 || c === 21));

        comissoesPromotoras.push({
          id: `com-prom-${propIdCounter}`,
          propostaId: proposta.id,
          numeroContrato: proposta.numeroContrato,
          clienteNome: proposta.nomeCliente,
          promotora,
          valorRecebido: isRecentSept ? 0 : valorRecebido,
          dataRecebimento: isRecentSept ? '' : (dataPagamentoCliente || dataDig),
          tipo: 'percentual',
          percentualAplicado: 4.5,
          status: isRecentSept ? 'pendente' : 'confirmada',
          observacao: isRecentSept ? 'Aguardando extrato semanal da promotora.' : 'Comissão repassada em lote.'
        });
      }
    }
  });

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
    },
    {
      id: 'meta-loja-2026-09',
      vendedoraId: 'user-loja-igarassu',
      vendedoraNome: 'Loja Igarassu (Balcão)',
      mesAno: '2026-09',
      metaVenda: 85000,
      metaPercentualTaxa: 11.0
    },
    {
      id: 'meta-pamella-2026-09',
      vendedoraId: 'user-pamella',
      vendedoraNome: 'Pamella',
      mesAno: '2026-09',
      metaVenda: 50000,
      metaPercentualTaxa: 10.0
    }
  ];

  // Feedbacks registered by ADM (Pamella)
  const feedbacks: Feedback[] = [
    {
      id: 'fb-01',
      vendedoraId: 'user-hellen',
      vendedoraNome: 'Hellen Vasconcelos',
      autorId: 'user-pamella',
      autorNome: 'Pamella',
      data: '2026-09-18',
      tipo: 'elogio',
      texto: 'Parabéns pelo recorde de taxa de FGTS e Refin alcançado nesta semana! A postura com os clientes de Igarassu e Olinda tem sido exemplar.',
      planoAcao: 'Compartilhar boas práticas de script de taxas com o time na reunião semanal de sexta-feira.',
      status: 'concluido'
    },
    {
      id: 'fb-02',
      vendedoraId: 'user-lucelia',
      vendedoraNome: 'Lucélia Ramos',
      autorId: 'user-pamella',
      autorNome: 'Pamella',
      data: '2026-09-22',
      tipo: 'melhoria',
      texto: 'Observamos algumas propostas com documentação pendente há mais de 3 dias no Banco Pan. É preciso reforçar o follow-up diário com os aposentados.',
      planoAcao: 'Revisar checklist de digitação e configurar notificações diárias no CRM para não deixar propostas paradas.',
      status: 'em_andamento'
    },
    {
      id: 'fb-03',
      vendedoraId: 'user-taciana',
      vendedoraNome: 'Taciana Silva',
      autorId: 'user-pamella',
      autorNome: 'Pamella',
      data: '2026-09-10',
      tipo: 'treinamento',
      texto: 'Treinamento sobre a nova esteira de Saque Complementar e Credcesta para servidores do Estado.',
      planoAcao: 'Realizar 5 simulações práticas até 15/09 e tirar dúvidas na mesa de operações.',
      status: 'concluido'
    }
  ];

  // Pre-seed smart opportunities & alerts
  alertas.push(
    {
      id: 'alt-01',
      clienteCpf: clientes[2].cpf,
      clienteNome: clientes[2].nome,
      clienteTelefone: clientes[2].telefone,
      tipo: 'portabilidade',
      motivo: 'Contrato de Margem pago há 13 meses no Banco Pan. Saldo elegível para portabilidade com redução de juros e troco estimado de R$ 3.800,00.',
      vendedoraResponsavel: 'Hellen Vasconcelos',
      status: 'nova',
      dataCriacao: '2026-09-27',
      valorPotencial: 3800,
      liberadoParaDigitador: true,
      liberadoPor: 'Pamella',
      dataLiberacao: '2026-09-28'
    },
    {
      id: 'alt-01-b',
      clienteCpf: clientes[10].cpf,
      clienteNome: clientes[10].nome,
      clienteTelefone: clientes[10].telefone,
      tipo: 'portabilidade',
      motivo: 'Portabilidade pré-aprovada C6 Consig com redução de prestação de R$ 420 para R$ 340 e troco de R$ 5.200,00.',
      vendedoraResponsavel: 'Taciana Silva',
      status: 'nova',
      dataCriacao: '2026-09-28',
      valorPotencial: 5200,
      liberadoParaDigitador: true,
      liberadoPor: 'Pamella',
      dataLiberacao: '2026-09-28'
    },
    {
      id: 'alt-01-c',
      clienteCpf: clientes[14].cpf,
      clienteNome: clientes[14].nome,
      clienteTelefone: clientes[14].telefone,
      tipo: 'portabilidade',
      motivo: 'Portabilidade Daycoval com saldo devedor quitando 18 parcelas. Aguardando autorização de ADM para digitação.',
      vendedoraResponsavel: 'Lucélia Ramos',
      status: 'nova',
      dataCriacao: '2026-09-28',
      valorPotencial: 4100,
      liberadoParaDigitador: false
    },
    {
      id: 'alt-02',
      clienteCpf: clientes[5].cpf,
      clienteNome: clientes[5].nome,
      clienteTelefone: clientes[5].telefone,
      tipo: 'refin',
      motivo: 'Contrato consignado quitou mais de 12 parcelas. Refinanciamento disponível com liberação de até R$ 2.450,00 na mesma parcela.',
      vendedoraResponsavel: 'Taciana Silva',
      status: 'nova',
      dataCriacao: '2026-09-26',
      valorPotencial: 2450
    },
    {
      id: 'alt-03',
      clienteCpf: clientes[8].cpf,
      clienteNome: clientes[8].nome,
      clienteTelefone: clientes[8].telefone,
      tipo: 'cartao_credito',
      motivo: 'Cliente aposentado INSS com margem RMC/RCC livre para emissão de Cartão Benefício com saque imediato de até R$ 1.900,00.',
      vendedoraResponsavel: 'Lucélia Ramos',
      status: 'nova',
      dataCriacao: '2026-09-25',
      valorPotencial: 1900
    },
    {
      id: 'alt-04',
      clienteCpf: clientes[12].cpf,
      clienteNome: clientes[12].nome,
      clienteTelefone: clientes[12].telefone,
      tipo: 'reativacao',
      motivo: 'Cliente recorrente sem novas operações há 7 meses. Histórico com 3 contratos já quitados com nota máxima de pontualidade.',
      vendedoraResponsavel: 'Hellen Vasconcelos',
      status: 'em_contato',
      dataCriacao: '2026-09-20',
      valorPotencial: 5000
    },
    {
      id: 'alt-05',
      clienteCpf: clientes[15].cpf,
      clienteNome: clientes[15].nome,
      clienteTelefone: clientes[15].telefone,
      tipo: 'aniversario',
      motivo: 'Aniversariante da semana! Oportunidade de estreitar relacionamento, enviar felicitações e apresentar condições exclusivas.',
      vendedoraResponsavel: 'Taciana Silva',
      status: 'nova',
      dataCriacao: '2026-09-28'
    },
    {
      id: 'alt-06',
      clienteCpf: clientes[18].cpf,
      clienteNome: clientes[18].nome,
      clienteTelefone: clientes[18].telefone,
      tipo: 'proposta_parada',
      motivo: 'Proposta pendente há 4 dias aguardando envio de selfie ou comprovante de residência atualizado para o C6 Consig.',
      vendedoraResponsavel: 'Lucélia Ramos',
      status: 'nova',
      dataCriacao: '2026-09-24',
      valorPotencial: 7200
    },
    {
      id: 'alt-07',
      clienteCpf: clientes[22].cpf,
      clienteNome: clientes[22].nome,
      clienteTelefone: clientes[22].telefone,
      tipo: 'taxa_pendente',
      motivo: 'Contrato pago pelo banco ao cliente, porém taxa da assessoria (R$ 650,00) ainda consta como não recebida no financeiro.',
      vendedoraResponsavel: 'Hellen Vasconcelos',
      status: 'nova',
      dataCriacao: '2026-09-27',
      valorPotencial: 650
    }
  );

  // Initial LGPD Audit Logs
  auditLogs.push(
    {
      id: 'log-01',
      timestamp: '2026-09-28 09:12:44',
      usuarioId: 'user-pamella',
      usuarioNome: 'Pamella',
      acao: 'visualizou',
      tipoRecurso: 'cliente',
      idRecurso: clientes[0].cpf,
      cpfCliente: clientes[0].cpf,
      detalhes: 'Consulta ao prontuário do cliente e histórico de propostas.'
    },
    {
      id: 'log-02',
      timestamp: '2026-09-28 10:35:12',
      usuarioId: 'user-hellen',
      usuarioNome: 'Hellen Vasconcelos',
      acao: 'criou',
      tipoRecurso: 'proposta',
      idRecurso: propostas[propostas.length - 1].id,
      cpfCliente: propostas[propostas.length - 1].cpf,
      detalhes: 'Cadastrou nova proposta de Portabilidade com troco no Banco Pan.'
    }
  );

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
