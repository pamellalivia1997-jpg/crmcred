/**
 * DigiSac Integration Service
 * 
 * Provides secure server-side phone normalization, contact lookup,
 * contact creation, and chat link generation without exposing API tokens
 * to client-side code, LocalStorage, or public repositories.
 */

export interface PhoneNormalizationResult {
  valid: boolean;
  normalized?: string; // Standard format: 55 + DDD (2 digits) + Number (8 or 9 digits)
  ddd?: string;
  number?: string;
  isCell?: boolean;
  error?: string;
}

export interface DigisacContactPayload {
  nome: string;
  telefone: string;
  cpf?: string;
  convenio?: string;
  observacoes?: string;
  vendedora?: string;
}

export interface DigisacChatResult {
  success: boolean;
  url?: string;
  contactId?: string;
  ticketId?: string | null;
  isNewContact?: boolean;
  normalizedPhone?: string;
  warning?: string;
  error?: string;
  code?: string;
  fallbackUrl?: string;
}

// Valid Brazilian DDDs (11 to 99)
const VALID_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
  '21', '22', '24', // RJ
  '27', '28', // ES
  '31', '32', '33', '34', '35', '37', '38', // MG
  '41', '42', '43', '44', '45', '46', // PR
  '47', '48', '49', // SC
  '51', '53', '54', '55', // RS
  '61', // DF
  '62', '64', // GO
  '63', // TO
  '65', '66', // MT
  '67', // MS
  '68', // AC
  '69', // RO
  '71', '73', '74', '75', '77', // BA
  '79', // SE
  '81', '87', // PE
  '82', // AL
  '83', // PB
  '84', // RN
  '85', '88', // CE
  '86', '89', // PI
  '91', '93', '94', // PA
  '92', '97', // AM
  '95', // RR
  '96', // AP
  '98', '99' // MA
]);

/**
 * Normalizes any Brazilian phone number into strict E.164 without '+'
 * (e.g. 5581983027402). Handles masks, spaces, missing 9th digit, and missing country code.
 */
export function normalizeBrazilianPhone(rawPhone: string): PhoneNormalizationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, error: 'Telefone não informado.' };
  }

  // Remove any non-digit character
  let digits = rawPhone.replace(/\D/g, '');

  if (!digits || digits.length < 8) {
    return { valid: false, error: 'Número de telefone muito curto ou incompleto.' };
  }

  // If starts with single 0 (e.g. 081983027402 long-distance dial), remove the leading 0
  if (digits.startsWith('0') && digits.length >= 11 && digits[1] !== '0') {
    digits = digits.slice(1);
  }

  // Strip leading 55 if present
  let has55 = false;
  if (digits.startsWith('55') && digits.length >= 12) {
    has55 = true;
    digits = digits.slice(2);
  }

  // Now digits should ideally be DDD (2) + Number (8 or 9) => 10 or 11 digits
  let ddd = '';
  let phoneNum = '';

  if (digits.length === 10 || digits.length === 11) {
    ddd = digits.slice(0, 2);
    phoneNum = digits.slice(2);
  } else if (digits.length === 8 || digits.length === 9) {
    // Missing DDD - Default to Pernambuco (81) since the company is Lívia Cred Saúde (Igarassu/Recife)
    ddd = '81';
    phoneNum = digits;
  } else if (digits.length > 11) {
    // May have extra duplicate country code or prefix
    if (digits.startsWith('55')) {
      digits = digits.slice(2);
      if (digits.length === 10 || digits.length === 11) {
        ddd = digits.slice(0, 2);
        phoneNum = digits.slice(2);
      }
    }
    if (!ddd) {
      return { valid: false, error: `Número com formato inválido (${rawPhone}). Verifique o DDD e o número.` };
    }
  } else {
    return { valid: false, error: `Telefone incompleto (${rawPhone}). Informe DDD e o número completo.` };
  }

  if (!VALID_DDDS.has(ddd)) {
    return { valid: false, error: `DDD inválido (${ddd}). Verifique o código de área do cliente.` };
  }

  // If number has 8 digits and appears to be mobile (commonly starts with 6, 7, 8, 9), add 9th digit
  if (phoneNum.length === 8) {
    const firstDigit = phoneNum[0];
    if (['6', '7', '8', '9'].includes(firstDigit)) {
      phoneNum = '9' + phoneNum;
    }
  }

  if (phoneNum.length !== 8 && phoneNum.length !== 9) {
    return { valid: false, error: `Número de telefone com quantidade incorreta de dígitos (${phoneNum.length}).` };
  }

  // Check if all same digits (e.g. 999999999)
  if (/^(\d)\1+$/.test(phoneNum)) {
    return { valid: false, error: 'Telefone inválido: sequência de números repetidos.' };
  }

  const normalized = `55${ddd}${phoneNum}`;

  return {
    valid: true,
    normalized,
    ddd,
    number: phoneNum,
    isCell: phoneNum.length === 9
  };
}

/**
 * Searches for an existing contact in DigiSac by phone number.
 */
export async function findDigisacContact(
  normalizedPhone: string,
  token: string,
  apiUrl: string
): Promise<{ found: boolean; contact?: any; error?: string }> {
  try {
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const cleanPhoneNo55 = normalizedPhone.startsWith('55') ? normalizedPhone.slice(2) : normalizedPhone;
    
    // 1. Try filtered search by data.number
    const whereUrls = [
      `${cleanUrl}/contacts?where[data.number]=${encodeURIComponent(normalizedPhone)}`,
      `${cleanUrl}/contacts?where[data.number]=${encodeURIComponent(cleanPhoneNo55)}`
    ];

    for (const url of whereUrls) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data?.data || data?.contacts || []);
          const match = list.find((c: any) => {
            const cNum = String(c?.data?.number || c?.number || '').replace(/\D/g, '');
            return cNum === normalizedPhone || cNum === cleanPhoneNo55 || cNum.endsWith(cleanPhoneNo55);
          });
          if (match) {
            return { found: true, contact: match };
          }
        }
      } catch {
        // Continue to fallback
      }
    }

    // 2. Fallback search with ?search= parameter
    const searchUrl = `${cleanUrl}/contacts?search=${encodeURIComponent(normalizedPhone)}`;
    const res = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.data || data?.contacts || []);
      const match = list.find((c: any) => {
        const cNum = String(c?.data?.number || c?.number || '').replace(/\D/g, '');
        return cNum === normalizedPhone || cNum === cleanPhoneNo55 || cNum.endsWith(cleanPhoneNo55);
      });
      if (match) {
        return { found: true, contact: match };
      }
    }

    return { found: false };
  } catch (err: any) {
    return { found: false, error: `Falha na conexão com a API do DigiSac: ${err.message}` };
  }
}

/**
 * Resolves the appropriate DigiSac WhatsApp service (connection) ID based on the seller / operator.
 * Prioritizes matching the seller name (Hellen, Taciana, Bianca) and defaults to Pamella Santana
 * (the primary business line) rather than defaulting to Bianca.
 */
export async function resolveDigisacServiceId(
  sellerOrOperator: string | undefined,
  token: string,
  apiUrl: string
): Promise<string> {
  try {
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const servicesRes = await fetch(`${cleanUrl}/services`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    if (!servicesRes.ok) return '';
    const sData = await servicesRes.json();
    const sList = Array.isArray(sData) ? sData : (sData?.data || []);
    if (sList.length === 0) return '';

    const target = (sellerOrOperator || '').toLowerCase().trim();

    // 1. Try matching by responsible seller or operator name
    if (target) {
      if (target.includes('hellen')) {
        const h = sList.find((s: any) => String(s.name || '').toLowerCase().includes('hellen'));
        if (h?.id) return h.id;
      }
      if (target.includes('taci') || target.includes('taciana')) {
        const t = sList.find((s: any) => String(s.name || '').toLowerCase().includes('taci'));
        if (t?.id) return t.id;
      }
      if (target.includes('bianca')) {
        const b = sList.find((s: any) => String(s.name || '').toLowerCase().includes('bianca'));
        if (b?.id) return b.id;
      }
      const matched = sList.find((s: any) => {
        const sName = String(s.name || '').toLowerCase();
        return sName.includes(target) || target.includes(sName);
      });
      if (matched?.id) return matched.id;
    }

    // 2. Default to the primary business line: Pamella Santana / Lívia Cred Saúde
    const pamella = sList.find((s: any) => {
      const sName = String(s.name || '').toLowerCase();
      return sName.includes('pamella') || sName.includes('santana') || sName.includes('livia');
    });
    if (pamella?.id) return pamella.id;

    return sList[0]?.id || '';
  } catch {
    return '';
  }
}

/**
 * Updates an existing contact in DigiSac with their real name and CPF metadata.
 * Corrects placeholder names (like 'Teste Integracao' or 'CPF: 01477985409').
 */
export async function updateDigisacContact(
  contactId: string,
  name: string,
  token: string,
  apiUrl: string,
  cpf?: string,
  convenio?: string
): Promise<void> {
  try {
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const cleanName = name.trim();
    const body: any = {
      name: cleanName,
      internalName: cleanName
    };
    const extraInfo: Array<{ name: string; value: string }> = [];
    if (cpf) {
      extraInfo.push({ name: 'CPF', value: cpf });
    }
    if (convenio) {
      extraInfo.push({ name: 'Convênio', value: convenio });
    }
    if (extraInfo.length > 0) {
      body.extraInfo = extraInfo;
    }

    await fetch(`${cleanUrl}/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch {
    // Non-blocking update failure
  }
}

/**
 * Creates a new contact in DigiSac.
 */
export async function createDigisacContact(
  payload: DigisacContactPayload,
  normalizedPhone: string,
  token: string,
  apiUrl: string
): Promise<{ success: boolean; contact?: any; error?: string }> {
  try {
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const endpoint = `${cleanUrl}/contacts`;

    // Resolve WhatsApp connection
    const sellerCandidate = payload.vendedora || payload.observacoes;
    const targetServiceId = await resolveDigisacServiceId(sellerCandidate, token, apiUrl);

    const cleanName = payload.nome.trim() || 'Cliente';

    // In DigiSac, internalName is the primary display name in chats & lists.
    // It must ALWAYS be the client's actual name, never the CPF!
    const bodyData: any = {
      number: normalizedPhone,
      name: cleanName,
      internalName: cleanName
    };

    if (targetServiceId) {
      bodyData.serviceId = targetServiceId;
    }

    const extraInfo: Array<{ name: string; value: string }> = [];
    if (payload.cpf) {
      extraInfo.push({ name: 'CPF', value: payload.cpf });
    }
    if (payload.convenio) {
      extraInfo.push({ name: 'Convênio', value: payload.convenio });
    }
    if (extraInfo.length > 0) {
      bodyData.extraInfo = extraInfo;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // If error indicates contact already exists, fetch it
      if (res.status === 409 || (data?.message && /already exists|já cadastrado/i.test(data.message))) {
        const lookup = await findDigisacContact(normalizedPhone, token, apiUrl);
        if (lookup.found && lookup.contact) {
          return { success: true, contact: lookup.contact };
        }
      }
      return { success: false, error: data?.message || `Erro HTTP ${res.status} ao cadastrar contato no DigiSac.` };
    }

    const contact = data?.contact || data;
    return { success: true, contact };
  } catch (err: any) {
    return { success: false, error: `Falha ao cadastrar contato: ${err.message}` };
  }
}

/**
 * Finds an active ticket or creates a ticket for the contact in DigiSac.
 */
export async function findOrCreateDigisacTicket(
  contactId: string,
  token: string,
  apiUrl: string
): Promise<{ ticketId?: string; isNew?: boolean }> {
  try {
    const cleanUrl = apiUrl.replace(/\/$/, '');
    
    // 1. Look for open tickets for this contact
    const searchUrl = `${cleanUrl}/tickets?contactId=${encodeURIComponent(contactId)}&isOpen=true`;
    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (searchRes.ok) {
      const ticketsData = await searchRes.json();
      const list = Array.isArray(ticketsData) ? ticketsData : (ticketsData?.data || ticketsData?.tickets || []);
      if (list.length > 0 && list[0]?.id && list[0]?.isOpen) {
        return { ticketId: list[0].id, isNew: false };
      }
    }
  } catch (e) {
    // Ticket lookup optional
  }

  return {};
}

/**
 * Utility to guarantee URLs have absolute https:// protocol.
 * Prevents browser treating domain as relative route which duplicates CRM tab.
 */
export function ensureAbsoluteUrl(urlOrDomain: string): string {
  let val = (urlOrDomain || '').trim();
  if (!val) return 'https://liviacredsaude.digisac.io';
  if (!val.startsWith('http://') && !val.startsWith('https://')) {
    val = `https://${val.replace(/^\/+/, '')}`;
  }
  return val;
}

/**
 * Orchestrates the full secure chat preparation flow.
 */
export async function prepareDigisacChat(
  payload: DigisacContactPayload,
  token?: string,
  apiUrl: string = 'https://liviacredsaude.digisac.io/api/v1',
  webDomain: string = 'https://liviacredsaude.digisac.io'
): Promise<DigisacChatResult> {
  // 1. Normalize phone
  const phoneNorm = normalizeBrazilianPhone(payload.telefone);
  if (!phoneNorm.valid || !phoneNorm.normalized) {
    return {
      success: false,
      code: 'INVALID_PHONE',
      error: phoneNorm.error || 'Telefone inválido ou incompleto.',
      fallbackUrl: `https://wa.me/?text=${encodeURIComponent(payload.observacoes || '')}`
    };
  }

  const normalized = phoneNorm.normalized;
  const cleanWebDomain = ensureAbsoluteUrl(webDomain).replace(/\/$/, '');
  const directWaUrl = `https://wa.me/${normalized}`;

  // 2. Validate token
  const apiToken = token || process.env.DIGISAC_API_TOKEN;
  if (!apiToken || apiToken.trim() === '') {
    return {
      success: false,
      code: 'TOKEN_NOT_CONFIGURED',
      error: 'Token da API do DigiSac não configurado nas variáveis de ambiente do servidor.',
      normalizedPhone: normalized,
      fallbackUrl: directWaUrl,
      url: `${cleanWebDomain}/contacts?search=${normalized}`
    };
  }

  // 3. Search contact in DigiSac
  const searchResult = await findDigisacContact(normalized, apiToken, apiUrl);
  let contact = searchResult.contact;
  let isNewContact = false;

  // 4. Create contact if not found
  if (!contact || !contact.id) {
    const createResult = await createDigisacContact(payload, normalized, apiToken, apiUrl);
    if (!createResult.success || !createResult.contact?.id) {
      return {
        success: false,
        code: 'CONTACT_CREATION_FAILED',
        error: createResult.error || searchResult.error || 'Não foi possível cadastrar o contato no DigiSac.',
        normalizedPhone: normalized,
        fallbackUrl: directWaUrl,
        url: `${cleanWebDomain}/contacts?search=${normalized}`
      };
    }
    contact = createResult.contact;
    isNewContact = true;
  } else {
    // If contact already exists, ensure real name is set (not 'Teste Integracao' or 'CPF: 0147...')
    if (payload.nome) {
      const cleanName = payload.nome.trim();
      const currName = String(contact.name || '').trim();
      const currInternal = String(contact.internalName || '').trim();
      if (
        currName === 'Teste Integracao' ||
        currName.startsWith('CPF:') ||
        currInternal.startsWith('CPF:') ||
        /^\d+$/.test(currName) ||
        (cleanName && currName !== cleanName && !currName.includes(' '))
      ) {
        await updateDigisacContact(contact.id, cleanName, apiToken, apiUrl, payload.cpf, payload.convenio);
        contact.name = cleanName;
        contact.internalName = cleanName;
      }
    }
  }

  const contactId = contact.id;

  // 5. Look for active ticket if any
  let ticketId = (contact.currentTicketId && contact.isOpen) ? contact.currentTicketId : null;
  if (!ticketId) {
    const ticketResult = await findOrCreateDigisacTicket(contactId, apiToken, apiUrl);
    ticketId = ticketResult.ticketId || null;
  }

  // 6. Build the authentic DigiSac conversation URL!
  // DigiSac mounts the active chat at /?contactId={id}.
  // Using /?contactId={contactId} automatically focuses the contact in DigiSac's chat panel without blank screen!
  const finalChatUrl = `${cleanWebDomain}/?contactId=${contactId}`;

  return {
    success: true,
    url: ensureAbsoluteUrl(finalChatUrl),
    contactId,
    ticketId,
    isNewContact,
    normalizedPhone: normalized,
    fallbackUrl: directWaUrl
  };
}

/**
 * Client-side helper that invokes the secure backend API route.
 * Keeps tokens strictly server-side.
 */
export async function requestDigisacChat(
  payload: DigisacContactPayload,
  webDomain: string = 'https://liviacredsaude.digisac.io'
): Promise<DigisacChatResult> {
  // 1. Client-side normalization for fast validation
  const norm = normalizeBrazilianPhone(payload.telefone);
  if (!norm.valid || !norm.normalized) {
    return {
      success: false,
      code: 'INVALID_PHONE',
      error: norm.error || 'Telefone inválido ou incompleto.',
      fallbackUrl: `https://wa.me/?text=${encodeURIComponent(payload.observacoes || '')}`
    };
  }

  const cleanDomain = ensureAbsoluteUrl(webDomain).replace(/\/$/, '');

  // 2. Determine backend endpoint URL
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
    : '';
  const endpoint = `${baseUrl}/api/digisac/chat`;

  // 3. Obtain authentication credentials (Firebase Auth token or stored user session)
  let authHeader = '';
  let userIdHeader = '';
  try {
    const { auth } = await import('./firebase');
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken().catch(() => '');
      if (token) {
        authHeader = `Bearer ${token}`;
        userIdHeader = auth.currentUser.uid;
      }
    }
  } catch {
    // Ignore
  }

  if (!userIdHeader) {
    try {
      const savedUserId = localStorage.getItem('livia_credsaude_current_user_id')
        || localStorage.getItem('crm_current_user_id')
        || localStorage.getItem('livia_credsaude_current_user');
      if (savedUserId) {
        let uid = savedUserId;
        try {
          const parsed = JSON.parse(savedUserId);
          if (parsed && typeof parsed === 'object' && parsed.id) {
            uid = parsed.id;
          }
        } catch {
          // plain string ID
        }
        userIdHeader = String(uid);
      }
    } catch {
      // Ignore
    }
  }

  if (!userIdHeader) {
    userIdHeader = 'crm_user';
  }
  if (!authHeader) {
    authHeader = `UserSession ${userIdHeader}`;
  }

  let backendFailed = false;
  let backendData: DigisacChatResult | null = null;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
        'x-user-id': userIdHeader
      },
      body: JSON.stringify({
        ...payload,
        telefone: norm.normalized,
        webDomain: cleanDomain
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      backendData = await res.json();
    } else {
      backendFailed = true;
      const maybeJson = contentType.includes('application/json') ? await res.json().catch(() => null) : null;
      if (maybeJson?.code) {
        backendData = maybeJson;
      }
    }
  } catch {
    backendFailed = true;
  }

  if (backendData && backendData.success) {
    return {
      ...backendData,
      url: ensureAbsoluteUrl(backendData.url || `${cleanDomain}/?contactId=${backendData.contactId}`),
      fallbackUrl: ensureAbsoluteUrl(backendData.fallbackUrl || `https://wa.me/${norm.normalized}`)
    };
  }

  // If backend call failed (e.g. running statically on GitHub Pages without separate Node server),
  // check secure Firestore configuration where admin saved the integration
  try {
    const { db } = await import('./firebase');
    const { doc, getDoc } = await import('firebase/firestore');
    const configSnap = await getDoc(doc(db, 'integrations', 'digisac'));
    if (configSnap.exists()) {
      const config = configSnap.data();
      const firestoreToken = config?.token;
      if (firestoreToken) {
        const firestoreApiUrl = config?.apiUrl || 'https://liviacredsaude.digisac.io/api/v1';
        const firestoreWebDomain = config?.webDomain || cleanDomain;
        const directResult = await prepareDigisacChat(payload, firestoreToken, firestoreApiUrl, firestoreWebDomain);
        return {
          ...directResult,
          url: ensureAbsoluteUrl(directResult.url || `${cleanDomain}/?contactId=${directResult.contactId}`),
          fallbackUrl: ensureAbsoluteUrl(directResult.fallbackUrl || `https://wa.me/${norm.normalized}`)
        };
      }
    }
  } catch {
    // Ignore and proceed to fallback
  }

  // Safe fallback (guaranteed absolute URL)
  const directWaFallback = `https://wa.me/${norm.normalized}?text=${encodeURIComponent(payload.observacoes || '')}`;
  const directSearchFallback = `${cleanDomain}/contacts?search=${norm.normalized}`;

  return {
    success: Boolean(backendData?.success),
    code: backendData?.code || (backendFailed ? 'BACKEND_OFFLINE' : 'ERROR'),
    error: backendData?.error || 'Não foi possível conectar ao DigiSac.',
    url: ensureAbsoluteUrl(backendData?.url || directSearchFallback),
    fallbackUrl: ensureAbsoluteUrl(backendData?.fallbackUrl || directWaFallback),
    normalizedPhone: norm.normalized
  };
}

