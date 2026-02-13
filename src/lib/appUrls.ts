const FALLBACK_PUBLIC_APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

export const getPublicAppUrl = (): string => {
  const configured = (import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
  const base = configured || FALLBACK_PUBLIC_APP_URL;
  return base.replace(/\/+$/, '');
};

export const getSignatureLinkUrl = (token: string): string => {
  return `${getPublicAppUrl()}/firmar/${token}`;
};

export const getSupabaseFunctionsBaseUrl = (): string => {
  return `https://ykducvvcjzdpoojxlsig.supabase.co/functions/v1`;
};

export const getWhatsAppWebhookUrl = (): string => {
  return `${getSupabaseFunctionsBaseUrl()}/whatsapp-webhook`;
};
