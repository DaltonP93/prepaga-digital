
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCompanyConfiguration } from '@/hooks/useCompanyConfiguration';
import { useSimpleAuthContext } from './SimpleAuthProvider';

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
  const [appliedBranding, setAppliedBranding] = useState(false);

  const brandingData = {
    primaryColor: configuration?.primary_color || '#1e3a5f',
    secondaryColor: configuration?.secondary_color || '#334155',
    accentColor: configuration?.accent_color || '#3b82f6',
    logoUrl: configuration?.logo_url,
    companyName: configuration?.name || 'Sistema Digital',
    isLoading,
  };

  // Aplicar CSS variables globales para el branding
  useEffect(() => {
    if (!isLoading && configuration && !appliedBranding) {
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
      if (configuration.login_logo_url) {
        const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (favicon) {
          favicon.href = configuration.login_logo_url;
        }
      }

      // Persist branding to localStorage for login page (pre-auth)
      try {
        localStorage.setItem('samap_branding_logo', brandingData.logoUrl || '');
        localStorage.setItem('samap_branding_name', brandingData.companyName || '');
      } catch { /* ignore */ }

      setAppliedBranding(true);
    }
  }, [configuration, isLoading, appliedBranding, brandingData]);

  return (
    <BrandingContext.Provider value={brandingData}>
      {children}
    </BrandingContext.Provider>
  );
};
