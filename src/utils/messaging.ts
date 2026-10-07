export interface MessagingSettings {
  provider: 'whatsapp' | 'digisac' | 'whatsapp_web';
  digisacDomain: string; // Ex: 'liviacredsaude.digisac.io'
  digisacToken?: string;
}

const MESSAGING_SETTINGS_KEY = 'livia_credsaude_messaging_settings';

export function getMessagingSettings(): MessagingSettings {
  try {
    const raw = localStorage.getItem(MESSAGING_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider || 'digisac',
        digisacDomain: parsed.digisacDomain || 'liviacredsaude.digisac.io',
        digisacToken: parsed.digisacToken || ''
      };
    }
  } catch (e) {
    console.error('Erro ao ler configuracoes de mensagens:', e);
  }
  return {
    provider: 'digisac',
    digisacDomain: 'liviacredsaude.digisac.io',
    digisacToken: ''
  };
}

export function saveMessagingSettings(settings: MessagingSettings): void {
  try {
    localStorage.setItem(MESSAGING_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Erro ao salvar configuracoes de mensagens:', e);
  }
}

export function buildMessagingUrl(phone: string, text: string, settings = getMessagingSettings()): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const encodedText = encodeURIComponent(text);

  if (settings.provider === 'digisac') {
    let domain = settings.digisacDomain.trim() || 'liviacredsaude.digisac.io';
    domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // DigiSac .io and .app deep link formats:
    // Opens contact search / chat directly in DigiSac web app
    if (domain.includes('digisac.io')) {
      return `https://${domain}/contacts?search=${cleanPhone}`;
    }
    if (domain.includes('digisac.app')) {
      return `https://${domain}/chat/new?phone=${fullPhone}&text=${encodedText}`;
    }
    return `https://${domain}/contacts?search=${cleanPhone}`;
  }

  if (settings.provider === 'whatsapp_web') {
    return `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;
  }

  // Default: Direct WhatsApp (wa.me)
  return `https://wa.me/${fullPhone}?text=${encodedText}`;
}

export function openMessagingApp(phone: string, text: string, settings = getMessagingSettings()): void {
  const url = buildMessagingUrl(phone, text, settings);
  if (typeof window !== 'undefined') {
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      window.location.href = url;
    }
  }
}
