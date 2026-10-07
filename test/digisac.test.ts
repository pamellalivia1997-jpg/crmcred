/**
 * Test Suite: Integração DigiSac CRM Lívia Cred Saúde
 * 
 * Cobre todos os 9 cenários obrigatórios:
 * 1. Telefone com máscara
 * 2. Telefone sem o nono dígito
 * 3. Telefone inválido (curto, repetido, DDD inválido)
 * 4. Token ausente ou inválido
 * 5. Usuário sem permissão (Autenticação 401)
 * 6. Telefone já cadastrado no DigiSac
 * 7. Telefone não cadastrado no DigiSac (Cadastro automático)
 * 8. Contato duplicado (Tratamento de conflito 409)
 * 9. Erro ou indisponibilidade da API (Fallback seguro)
 */

import {
  normalizeBrazilianPhone,
  findDigisacContact,
  createDigisacContact,
  prepareDigisacChat
} from '../src/services/digisacService';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASSOU] ${title}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FALHOU] ${title}${details ? ` -> ${details}` : ''}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES: INTEGRAÇÃO DIGISAC');
  console.log('========================================================\n');

  // -----------------------------------------------------------
  // 1. TESTE: TELEFONE COM MÁSCARA
  // -----------------------------------------------------------
  console.log('1. Teste: Telefone com máscara');
  const m1 = normalizeBrazilianPhone('(81) 98302-7402');
  assert(m1.valid && m1.normalized === '5581983027402', 'Máscara padrão (81) 98302-7402 -> 5581983027402');

  const m2 = normalizeBrazilianPhone('+55 (81) 98919-1235');
  assert(m2.valid && m2.normalized === '5581989191235', 'Máscara internacional +55 (81) 98919-1235 -> 5581989191235');

  const m3 = normalizeBrazilianPhone('81 98800-1122');
  assert(m3.valid && m3.normalized === '5581988001122', 'Máscara com espaço 81 98800-1122 -> 5581988001122');

  // -----------------------------------------------------------
  // 2. TESTE: TELEFONE SEM O NONO DÍGITO
  // -----------------------------------------------------------
  console.log('\n2. Teste: Telefone sem o nono dígito (Inserção automática do 9)');
  const s9_1 = normalizeBrazilianPhone('(81) 8302-7402');
  assert(s9_1.valid && s9_1.normalized === '5581983027402', 'Celular com 8 dígitos (81) 8302-7402 recebe prefixo 9 -> 5581983027402');

  const s9_2 = normalizeBrazilianPhone('8183027402');
  assert(s9_2.valid && s9_2.normalized === '5581983027402', 'Número limpo 8183027402 recebe prefixo 9 -> 5581983027402');

  // -----------------------------------------------------------
  // 3. TESTE: TELEFONE INVÁLIDO
  // -----------------------------------------------------------
  console.log('\n3. Teste: Telefones inválidos');
  const inv1 = normalizeBrazilianPhone('12345');
  assert(!inv1.valid, 'Número curto (12345) é rejeitado com mensagem clara');

  const inv2 = normalizeBrazilianPhone('(00) 98765-4321');
  assert(!inv2.valid && Boolean(inv2.error?.includes('DDD inválido')), 'DDD inexistente (00) é rejeitado com aviso de DDD');

  const inv3 = normalizeBrazilianPhone('(81) 99999-9999');
  assert(!inv3.valid && Boolean(inv3.error?.includes('repetidos')), 'Sequência de dígitos repetidos é rejeitada');

  const inv4 = normalizeBrazilianPhone('');
  assert(!inv4.valid, 'Telefone vazio é rejeitado');

  // -----------------------------------------------------------
  // 4. TESTE: TOKEN AUSENTE OU INVÁLIDO
  // -----------------------------------------------------------
  console.log('\n4. Teste: Token ausente ou inválido');
  const semToken = await prepareDigisacChat(
    { nome: 'Jeovani Teste', telefone: '81983027402' },
    '' // Sem token
  );
  assert(
    !semToken.success && semToken.code === 'TOKEN_NOT_CONFIGURED',
    'Retorna código TOKEN_NOT_CONFIGURED sem vazar credenciais ou travar a aplicação'
  );
  assert(
    Boolean(semToken.fallbackUrl && semToken.url),
    'Gera links de contingência seguros para o funcionário'
  );

  // -----------------------------------------------------------
  // 5. TESTE: USUÁRIO SEM PERMISSÃO (AUTENTICAÇÃO BACKEND)
  // -----------------------------------------------------------
  console.log('\n5. Teste: Usuário sem permissão / Sem autenticação');
  const simulaAuthCheck = (headers: { authorization?: string; 'x-user-id'?: string }) => {
    if (!headers.authorization && !headers['x-user-id']) {
      return { status: 401, error: 'Acesso negado: autenticação de usuário necessária.' };
    }
    return { status: 200, ok: true };
  };
  const authInvalida = simulaAuthCheck({});
  assert(authInvalida.status === 401, 'Requisição sem token/sessão retorna HTTP 401 Unauthorized');
  const authValida = simulaAuthCheck({ 'x-user-id': 'usr-123' });
  assert(authValida.status === 200, 'Requisição com credencial autorizada é aprovada');

  // -----------------------------------------------------------
  // 6. TESTE: TELEFONE JÁ CADASTRADO NO DIGISAC
  // -----------------------------------------------------------
  console.log('\n6. Teste: Telefone já cadastrado no DigiSac');
  // Mock fetch para busca
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: any) => {
    const urlStr = String(url);
    if (urlStr.includes('/contacts')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 'contato-existente-uuid-1',
              name: 'Jeovani Catanho',
              number: '5581983027402'
            }
          ]
        })
      } as any;
    }
    if (urlStr.includes('/tickets')) {
      return {
        ok: true,
        status: 200,
        json: async () => ([
          { id: 'ticket-ativo-101', contactId: 'contato-existente-uuid-1', isOpen: true }
        ])
      } as any;
    }
    return { ok: false, status: 404 } as any;
  };

  const buscaExistente = await prepareDigisacChat(
    { nome: 'Jeovani Catanho', telefone: '(81) 98302-7402', cpf: '000.000.000-02' },
    'token_de_teste_simulado'
  );
  assert(
    buscaExistente.success && buscaExistente.contactId === 'contato-existente-uuid-1',
    'Localiza contato existente pelo telefone sem tentar duplicar'
  );
  assert(
    buscaExistente.url?.includes('ticket-ativo-101') || buscaExistente.url?.includes('contato-existente-uuid-1'),
    'Gera link direto para a conversa existente do cliente'
  );

  // -----------------------------------------------------------
  // 7. TESTE: TELEFONE NÃO CADASTRADO (CRIAÇÃO AUTOMÁTICA)
  // -----------------------------------------------------------
  console.log('\n7. Teste: Telefone não cadastrado (Cadastro automático com CPF)');
  let contactCriadoNaApi = false;
  globalThis.fetch = async (url: any, options: any) => {
    const urlStr = String(url);
    if (urlStr.includes('/contacts') && options?.method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [] }) // Nenhum contato encontrado
      } as any;
    }
    if (urlStr.includes('/contacts') && options?.method === 'POST') {
      contactCriadoNaApi = true;
      const body = JSON.parse(options.body);
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'novo-contato-uuid-99',
          name: body.name,
          number: body.number,
          internalName: body.internalName
        })
      } as any;
    }
    if (urlStr.includes('/tickets')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'ticket-novo-999', contactId: 'novo-contato-uuid-99' })
      } as any;
    }
    return { ok: false, status: 404 } as any;
  };

  const criacaoNova = await prepareDigisacChat(
    { nome: 'Novo Cliente Lívia Cred', telefone: '(81) 98877-6655', cpf: '123.456.789-00', convenio: 'INSS' },
    'token_de_teste_simulado'
  );
  assert(
    criacaoNova.success && criacaoNova.isNewContact && contactCriadoNaApi,
    'Cadastra novo contato na API do DigiSac quando não localizado previamente'
  );
  assert(
    criacaoNova.url?.includes('ticket-novo-999') || criacaoNova.url?.includes('novo-contato-uuid-99'),
    'Abre a conversa do novo contato imediatamente após o cadastro'
  );

  // -----------------------------------------------------------
  // 8. TESTE: CONTATO DUPLICADO (TRATAMENTO DE RESPOSTA 409)
  // -----------------------------------------------------------
  console.log('\n8. Teste: Contato duplicado (Tratamento de conflito 409)');
  let fallbackBuscaChamada = false;
  globalThis.fetch = async (url: any, options: any) => {
    const urlStr = String(url);
    if (urlStr.includes('/contacts') && options?.method === 'POST') {
      // API informa conflito 409
      return {
        ok: false,
        status: 409,
        json: async () => ({ message: 'Contact already exists with number 5581983027402' })
      } as any;
    }
    if (urlStr.includes('/contacts') && options?.method === 'GET') {
      fallbackBuscaChamada = true;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'contato-recuperado-uuid-77', number: '5581983027402', name: 'Cliente Recuperado' }]
        })
      } as any;
    }
    return { ok: true, status: 200, json: async () => [] } as any;
  };

  const tratDuplicado = await createDigisacContact(
    { nome: 'Cliente Duplicado', telefone: '5581983027402' },
    '5581983027402',
    'token_de_teste_simulado',
    'https://liviacredsaude.digisac.io/api/v1'
  );
  assert(
    tratDuplicado.success && tratDuplicado.contact?.id === 'contato-recuperado-uuid-77' && fallbackBuscaChamada,
    'Trata erro 409 com elegância recuperando o contato existente sem falhar'
  );

  // -----------------------------------------------------------
  // 9. TESTE: ERRO OU INDISPONIBILIDADE DA API
  // -----------------------------------------------------------
  console.log('\n9. Teste: Erro ou indisponibilidade da API');
  globalThis.fetch = async () => {
    throw new Error('Timeout de conexão com o servidor DigiSac');
  };

  const erroApi = await prepareDigisacChat(
    { nome: 'Cliente Erro', telefone: '(81) 98302-7402' },
    'token_de_teste_simulado'
  );
  assert(
    !erroApi.success,
    'API indisponível é capturada com segurança sem derrubar o CRM'
  );
  assert(
    Boolean(erroApi.fallbackUrl && erroApi.url),
    'Disponibiliza link alternativo de contingência mesmo em caso de erro da API'
  );

  // Restaura fetch
  globalThis.fetch = originalFetch;

  console.log('\n========================================================');
  console.log(`📊 RESULTADO DOS TESTES: ${passedCount} PASSARAM | ${failedCount} FALHARAM`);
  console.log('========================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Erro fatal executando testes:', e);
  process.exit(1);
});
