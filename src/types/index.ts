export type UserRole = 'proprietaria' | 'adm' | 'financeiro' | 'vendedora' | 'digitador';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatarUrl?: string;
  phone: string;
  status: 'ativo' | 'inativo';
  monthlySalesGoal?: number; // Ex: 70000
  monthlyTaxPercentGoal?: number; // Ex: 10.0 (%)
  baseSalaryCost?: number; // Custo mensal da funcionária (salário + encargos)
}

export type Convenio = 
  | 'INSS'
  | 'SIAPE'
  | 'Prefeitura de Igarassu'
  | 'Prefeitura do Recife'
  | 'Governo de PE'
  | 'FGTS'
  | 'Forças Armadas'
  | 'Outros';

export type Operacao = 
  | 'FGTS'
  | 'Saque Complementar'
  | 'Refin'
  | 'Conta de Energia Elétrica/Luz'
  | 'Portabilidade'
  | 'Refin da Port'
  | 'Margem'
  | 'Cartão Novo'
  | 'Credcesta'
  | 'Cartão de Crédito'
  | 'Crédito do Trabalhador'
  | 'Pessoal';

export type Banco = 
  | 'Banco Pan'
  | 'C6 Consig'
  | 'Santander'
  | 'Itaú Consig'
  | 'Daycoval'
  | 'Facta'
  | 'Master'
  | 'BMG'
  | 'Mercantil'
  | 'Safra'
  | 'Bradesco'
  | 'Outro';

export type Promotora = 
  | 'J2 Promotora'
  | 'Sempre'
  | 'DG'
  | 'GFT'
  | 'Direto Banco'
  | 'Outra';

export type StatusProposta = 
  | 'Em análise'
  | 'Pendente'
  | 'Aprovada'
  | 'Paga'
  | 'Cancelada'
  | 'Reprovada';

export interface Cliente {
  id: string; // or CPF
  cpf: string;
  nome: string;
  dataNascimento: string; // AAAA-MM-DD
  telefone: string;
  email: string;
  cidade: string;
  convenioPrincipal: Convenio;
  observacoes: string;
  vendedoraResponsavel: string;
  dataCriacao: string;
  statusCartao?: 'possui' | 'disponivel' | 'nao_possui';
  possuiMargemLivre?: boolean;
}

export interface HistoricoStatus {
  status: StatusProposta;
  data: string;
  usuario: string;
  motivo?: string;
}

export interface Proposta {
  id: string;
  carimboDataHora: string;
  cpf: string;
  nomeCliente: string;
  dataDigitacao: string; // AAAA-MM-DD
  dataPagamentoCliente?: string; // AAAA-MM-DD
  convenio: Convenio;
  operacao: Operacao;
  banco: Banco;
  promotora: Promotora;
  valorEmprestimo: number; // Venda
  valorTaxa: number; // Taxa extra cobrada do cliente
  percentualTaxa: number; // (valorTaxa / valorEmprestimo) * 100
  taxaPaga: boolean; // Se a taxa foi quitada
  clientePagouTaxa: boolean;
  vendedora: string;
  digitador: string;
  numeroContrato: string;
  status: StatusProposta;
  motivoCancelamento?: string;
  observacoes?: string;
  isSimulacao?: boolean;
  anexos?: string[];
  linkDocumento?: string;
  historicoStatus: HistoricoStatus[];
}

export interface ComissaoPromotora {
  id: string;
  propostaId: string;
  numeroContrato: string;
  clienteNome: string;
  promotora: Promotora;
  valorRecebido: number;
  dataRecebimento: string;
  tipo: 'percentual' | 'fixo';
  percentualAplicado?: number;
  status: 'confirmada' | 'pendente' | 'divergencia';
  observacao?: string;
}

export interface MetaVendedora {
  id: string;
  vendedoraId: string;
  vendedoraNome: string;
  mesAno: string; // Ex: '2026-09'
  metaVenda: number;
  metaPercentualTaxa: number;
  isAtivoNoMes?: boolean;
}

export interface Feedback {
  id: string;
  vendedoraId: string;
  vendedoraNome: string;
  autorId: string;
  autorNome: string;
  data: string;
  tipo: 'elogio' | 'melhoria' | 'advertencia' | 'treinamento';
  texto: string;
  planoAcao: string;
  status: 'aberto' | 'em_andamento' | 'concluido';
}

export interface ContaPagar {
  id: string;
  descricao: string;
  categoria: 'Aluguel' | 'Sistemas & Telefonia' | 'Folha de Pagamento' | 'Impostos' | 'Contabilidade' | 'Marketing' | 'Despesas Gerais';
  valor: number;
  vencimento: string; // AAAA-MM-DD
  recorrente: boolean;
  status: 'pendente' | 'paga' | 'atrasada';
  dataPagamento?: string;
  comprovante?: string;
}

export interface ComissaoVendedora {
  vendedoraId: string;
  vendedoraNome: string;
  mesAno: string;
  totalVendas: number;
  totalTaxas: number;
  comissaoTaxas: number;
  comissaoDigitacao: number;
  comissaoCartao: number;
  bonusMeta: number;
  totalAPagar: number;
  status: 'pendente' | 'aprovado' | 'pago';
}

export interface AlertaOportunidade {
  id: string;
  clienteCpf: string;
  clienteNome: string;
  clienteTelefone: string;
  tipo: 'portabilidade' | 'refin' | 'cartao_credito' | 'reativacao' | 'aniversario' | 'proposta_parada' | 'taxa_pendente' | 'meta_alerta';
  motivo: string;
  vendedoraResponsavel: string;
  status: 'nova' | 'em_contato' | 'convertida' | 'descartada';
  dataCriacao: string;
  valorPotencial?: number;
  propostaOrigemId?: string;
  liberadoParaDigitador?: boolean;
  liberadoPor?: string;
  dataLiberacao?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  usuarioId: string;
  usuarioNome: string;
  acao: 'visualizou' | 'criou' | 'editou' | 'alterou_status' | 'excluiu';
  tipoRecurso: 'cliente' | 'proposta' | 'comissao' | 'meta' | 'usuario';
  idRecurso: string;
  cpfCliente?: string;
  detalhes: string;
}
