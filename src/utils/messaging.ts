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
    // 1. Open popup window immediately inside user click gesture to avoid browser popup blockers
    let popupTab: Window | null = null;
    if (typeof window !== 'undefined') {
      try {
        popupTab = window.open('about:blank', '_blank');
        if (popupTab && popupTab.document) {
          popupTab.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="utf-8">
              <title>Conectando ao DigiSac...</title>
              <style>
                body {
                  margin: 0;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  background-color: #0f172a;
                  color: #f8fafc;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  text-align: center;
                  padding: 24px;
                  box-sizing: border-box;
                }
                .spinner {
                  width: 50px;
                  height: 50px;
                  border: 4px solid rgba(255,255,255,0.1);
                  border-top-color: #10b981;
                  border-radius: 50%;
                  animation: spin 0.8s linear infinite;
                  margin-bottom: 24px;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                h2 { font-size: 22px; margin: 0 0 10px; font-weight: 700; color: #ffffff; }
                p { font-size: 14px; margin: 0; color: #94a3b8; max-width: 400px; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <h2>Conectando ao DigiSac...</h2>
              <p>Localizando contato e abrindo a conversa em instantes. Sua mensagem já foi copiada para a área de transferência.</p>
            </body>
            </html>
          `);
        }
      } catch (e) {
        console.warn('Popup window.open inicial ignorado pelo navegador:', e);
      }
    }

    try {
      const result = await requestDigisacChat({
        nome: clientInfo?.nome || 'Cliente',
        telefone: phone,
        cpf: clientInfo?.cpf,
        convenio: clientInfo?.convenio,
        observacoes: text
      }, settings.digisacDomain);

      let targetUrl = result.url || result.fallbackUrl || buildMessagingUrl(phone, text, settings);
      
      // Ensure targetUrl is strictly absolute and NEVER navigates back to the current CRM origin!
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl.replace(/^\/+/, '')}`;
      }

      if (popupTab && !popupTab.closed) {
        popupTab.location.href = targetUrl;
      } else if (typeof window !== 'undefined') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }

      return {
        success: result.success,
        url: targetUrl,
        error: result.error
      };
    } catch (err: any) {
      let fallback = buildMessagingUrl(phone, text, settings);
      if (!fallback.startsWith('http://') && !fallback.startsWith('https://')) {
        fallback = `https://${fallback.replace(/^\/+/, '')}`;
      }
      if (popupTab && !popupTab.closed) {
        popupTab.location.href = fallback;
      } else if (typeof window !== 'undefined') {
        window.open(fallback, '_blank', 'noopener,noreferrer');
      }
      return { success: false, url: fallback, error: err?.message };
    }
  }

  // WhatsApp / WhatsApp Web
  let url = buildMessagingUrl(phone, text, settings);
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url.replace(/^\/+/, '')}`;
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return { success: true, url };
}

