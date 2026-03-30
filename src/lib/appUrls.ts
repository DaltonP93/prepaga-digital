const FALLBACK_PUBLIC_APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

export const getPublicAppUrl = (): string => {
  const configured = (import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
  const base = configured || FALLBACK_PUBLIC_APP_URL;
  return base.replace(/\/+$/, '');
};

export const getSignatureLinkPath = (token: string): string => {
  return `/firmar/${token}`;
};

export const getSignatureLinkUrl = (token: string): string => {
  return `${getPublicAppUrl()}${getSignatureLinkPath(token)}`;
};

export const getSupabaseFunctionsBaseUrl = (): string => {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const normalizedUrl = supabaseUrl.replace(/\/+$/, '');
  return `${normalizedUrl}/functions/v1`;
};

export const getWhatsAppWebhookUrl = (): string => {
  return `${getSupabaseFunctionsBaseUrl()}/whatsapp-webhook`;
};
