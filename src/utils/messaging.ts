export interface MessagingSettings {
  provider: 'whatsapp' | 'digisac' | 'whatsapp_web';
  digisacDomain: string; // Ex: 'liviacred.digisac.app' ou 'app.digisac.me'
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
        digisacDomain: parsed.digisacDomain || 'app.digisac.me',
        digisacToken: parsed.digisacToken || ''
      };
    }
  } catch (e) {
    console.error('Erro ao ler configuracoes de mensagens:', e);
  }
  return {
    provider: 'digisac',
    digisacDomain: 'app.digisac.me',
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
    let domain = settings.digisacDomain.trim() || 'app.digisac.me';
    domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // DigiSac standard deep link / multi-chat URL formats:
    // https://[dominio-empresa]/chat/new?phone=5581988887777&text=...
    if (domain.includes('digisac.app')) {
      return `https://${domain}/chat/new?phone=${fullPhone}&text=${encodedText}`;
    }
    return `https://${domain}/contacts/chat?phone=${fullPhone}&text=${encodedText}`;
  }

  if (settings.provider === 'whatsapp_web') {
    return `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;
  }

  // Default: Direct WhatsApp (wa.me)
  return `https://wa.me/${fullPhone}?text=${encodedText}`;
}

export function openMessagingApp(phone: string, text: string, settings = getMessagingSettings()): void {
  const url = buildMessagingUrl(phone, text, settings);
  window.open(url, '_blank');
}
