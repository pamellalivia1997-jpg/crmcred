import { requestDigisacChat } from '../services/digisacService';

export interface MessagingSettings {
  provider: 'whatsapp' | 'digisac' | 'whatsapp_web';
  digisacDomain: string; // Ex: 'liviacredsaude.digisac.io'
}

const MESSAGING_SETTINGS_KEY = 'livia_credsaude_messaging_settings';

export function getMessagingSettings(): MessagingSettings {
  try {
    const raw = localStorage.getItem(MESSAGING_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider || 'digisac',
        digisacDomain: parsed.digisacDomain || 'liviacredsaude.digisac.io'
      };
    }
  } catch (e) {
    console.error('Erro ao ler configuracoes de mensagens:', e);
  }
  return {
    provider: 'digisac',
    digisacDomain: 'liviacredsaude.digisac.io'
  };
}

export function saveMessagingSettings(settings: MessagingSettings): void {
  try {
    localStorage.setItem(MESSAGING_SETTINGS_KEY, JSON.stringify({
      provider: settings.provider,
      digisacDomain: settings.digisacDomain
    }));
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
    return `https://${domain}/contacts?search=${fullPhone}`;
  }

  if (settings.provider === 'whatsapp_web') {
    return `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;
  }

  // Default: Direct WhatsApp (wa.me)
  return `https://wa.me/${fullPhone}?text=${encodedText}`;
}

export async function openMessagingApp(
  phone: string,
  text: string,
  settings = getMessagingSettings(),
  clientInfo?: { nome?: string; cpf?: string; convenio?: string }
): Promise<{ success: boolean; url?: string; error?: string }> {
  // If text is provided, copy to clipboard for convenience
  if (text && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard permission issues
    }
  }

  if (settings.provider === 'digisac') {
    try {
      const result = await requestDigisacChat({
        nome: clientInfo?.nome || 'Cliente',
        telefone: phone,
        cpf: clientInfo?.cpf,
        convenio: clientInfo?.convenio,
        observacoes: text
      }, settings.digisacDomain);

      const targetUrl = result.url || result.fallbackUrl || buildMessagingUrl(phone, text, settings);
      
      if (typeof window !== 'undefined') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }

      return {
        success: result.success,
        url: targetUrl,
        error: result.error
      };
    } catch (err: any) {
      const fallback = buildMessagingUrl(phone, text, settings);
      if (typeof window !== 'undefined') {
        window.open(fallback, '_blank', 'noopener,noreferrer');
      }
      return { success: false, url: fallback, error: err?.message };
    }
  }

  // WhatsApp / WhatsApp Web
  const url = buildMessagingUrl(phone, text, settings);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return { success: true, url };
}

