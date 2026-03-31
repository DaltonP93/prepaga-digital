
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCompanyConfiguration } from '@/hooks/useCompanyConfiguration';
import { useSimpleAuthContext } from './SimpleAuthProvider';
import { sanitizeMediaUrl } from '@/lib/mediaUrl';

interface BrandingContextType {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  companyName: string;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  primaryColor: '#1e3a5f',
  secondaryColor: '#334155',
  accentColor: '#3b82f6',
  companyName: 'Sistema Digital',
  isLoading: true,
});

export const useBranding = () => useContext(BrandingContext);

export const CompanyBrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useSimpleAuthContext();
  const { configuration, isLoading } = useCompanyConfiguration();
  const [lastConfigId, setLastConfigId] = useState<string | null>(null);

  const applyFavicon = (url?: string) => {
    if (!url) return;

    const rels = ['icon', 'shortcut icon', 'apple-touch-icon', 'alternate icon'];
    rels.forEach((rel) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = url;
    });
  };

  const brandingData = {
    primaryColor: configuration?.primary_color || '#1e3a5f',
    secondaryColor: configuration?.secondary_color || '#334155',
    accentColor: configuration?.accent_color || '#3b82f6',
    logoUrl: sanitizeMediaUrl(configuration?.logo_url),
    companyName: configuration?.name || 'Sistema Digital',
    isLoading,
  };

  // Aplicar CSS variables globales para el branding
  useEffect(() => {
    if (!isLoading && configuration) {
      // Only re-apply when configuration actually changes
      const configKey = JSON.stringify({
        pc: configuration.primary_color,
        sc: configuration.secondary_color,
        ac: configuration.accent_color,
        fv: (configuration as any).favicon,
        lb: configuration.login_background_url,
        lu: configuration.login_logo_url,
        lt: configuration.login_title,
        ls: configuration.login_subtitle,
        lo: configuration.logo_url,
        n: configuration.name,
      });
      if (configKey === lastConfigId) return;

      const root = document.documentElement;
      
      // Convertir colores hex a HSL para Tailwind
      const hexToHsl = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }

        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };

      // Aplicar variables CSS
      root.style.setProperty('--primary', hexToHsl(brandingData.primaryColor));
      root.style.setProperty('--secondary', hexToHsl(brandingData.secondaryColor));
      root.style.setProperty('--accent', hexToHsl(brandingData.accentColor));

      // Actualizar título de la página
      document.title = brandingData.companyName;
      
      // Actualizar favicon si existe
      const faviconUrl =
        sanitizeMediaUrl((configuration as any).favicon) ||
        sanitizeMediaUrl(configuration.login_logo_url) ||
        sanitizeMediaUrl(configuration.logo_url);
      if (faviconUrl) {
        applyFavicon(faviconUrl);
      }

      // Persist branding to localStorage for login page (pre-auth)
      try {
        const currentFavicon = localStorage.getItem('samap_branding_favicon') || '';
        const currentLogo = localStorage.getItem('samap_branding_logo') || '';
        const currentBackground = localStorage.getItem('samap_branding_login_background') || '';
        const currentTitle = localStorage.getItem('samap_branding_name') || '';
        const currentSubtitle = localStorage.getItem('samap_branding_login_subtitle') || '';

        const loginFavicon =
          sanitizeMediaUrl((configuration as any).favicon) ||
          sanitizeMediaUrl(configuration.login_logo_url) ||
          sanitizeMediaUrl(configuration.logo_url) ||
          currentFavicon ||
          '';
        const loginLogo = sanitizeMediaUrl(configuration.login_logo_url) || currentLogo || brandingData.logoUrl || '';
        const loginBackground = sanitizeMediaUrl(configuration.login_background_url) || currentBackground || '';
        const loginTitle = (configuration as any).login_title || currentTitle || brandingData.companyName || '';
        const loginSubtitle = (configuration as any).login_subtitle || currentSubtitle || 'Sistema de Firma Digital - Inicia sesión en tu cuenta';

        localStorage.setItem('samap_branding_favicon', loginFavicon);
        localStorage.setItem('samap_branding_logo', loginLogo);
        localStorage.setItem('samap_branding_name', loginTitle);
        localStorage.setItem('samap_branding_login_background', loginBackground);
        localStorage.setItem('samap_branding_login_subtitle', loginSubtitle);
      } catch { /* ignore */ }

      setLastConfigId(configKey);
    }
  }, [configuration, isLoading, brandingData, lastConfigId]);

  useEffect(() => {
    try {
      const localFavicon =
        localStorage.getItem('samap_branding_favicon') ||
        localStorage.getItem('samap_branding_logo') ||
        '';
      const safeLocalFavicon = sanitizeMediaUrl(localFavicon);
      if (safeLocalFavicon) applyFavicon(safeLocalFavicon);
    } catch {
      // noop
    }
  }, []);

  return (
    <BrandingContext.Provider value={brandingData}>
      {children}
    </BrandingContext.Provider>
  );
};
