const DEFAULT_PUBLIC_APP_URL = "https://prepaga.saa.com.py";

export const getPublicAppUrl = (): string => {
  const configured = (Deno.env.get("PUBLIC_APP_URL") || "").trim();
  const base = configured || DEFAULT_PUBLIC_APP_URL;
  return base.replace(/\/+$/, "");
};

export const getSignatureLinkUrl = (token: string): string => {
  return `${getPublicAppUrl()}/firmar/${token}`;
};
