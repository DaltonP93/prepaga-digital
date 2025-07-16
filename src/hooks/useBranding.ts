import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';

interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  companyName: string;
  favicon: string;
  customCSS: string;
  darkMode: boolean;
  fontFamily: string;
  borderRadius: string;
  shadows: boolean;
}

const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  accentColor: '#4ade80',
  logoUrl: '/icons/icon-192x192.png',
  companyName: 'Prepaga Digital',
  favicon: '/favicon.ico',
  customCSS: '',
  darkMode: false,
  fontFamily: 'Inter',
  borderRadius: '0.5rem',
  shadows: true
};

export const useBranding = () => {
  const { profile } = useAuthContext();
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      loadBranding();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const loadBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile?.company_id)
        .single();

      if (error) throw error;

      if (data) {
        setBranding({
          primaryColor: data.primary_color || DEFAULT_BRANDING.primaryColor,
          secondaryColor: data.secondary_color || DEFAULT_BRANDING.secondaryColor,
          accentColor: data.accent_color || DEFAULT_BRANDING.accentColor,
          logoUrl: data.logo_url || DEFAULT_BRANDING.logoUrl,
          companyName: data.name || DEFAULT_BRANDING.companyName,
          favicon: data.favicon || DEFAULT_BRANDING.favicon,
          customCSS: data.custom_css || DEFAULT_BRANDING.customCSS,
          darkMode: data.dark_mode || DEFAULT_BRANDING.darkMode,
          fontFamily: data.font_family || DEFAULT_BRANDING.fontFamily,
          borderRadius: data.border_radius || DEFAULT_BRANDING.borderRadius,
          shadows: data.shadows !== false
        });
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBranding = async (updates: Partial<BrandingConfig>) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          primary_color: updates.primaryColor,
          secondary_color: updates.secondaryColor,
          accent_color: updates.accentColor,
          logo_url: updates.logoUrl,
          favicon: updates.favicon,
          custom_css: updates.customCSS,
          dark_mode: updates.darkMode,
          font_family: updates.fontFamily,
          border_radius: updates.borderRadius,
          shadows: updates.shadows
        })
        .eq('id', profile?.company_id);

      if (error) throw error;

      setBranding(prev => ({ ...prev, ...updates }));
      applyBranding({ ...branding, ...updates });
    } catch (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
  };

  const applyBranding = (brandingConfig: BrandingConfig) => {
    const root = document.documentElement;
    
    // Aplicar colores CSS
    root.style.setProperty('--primary', hslFromHex(brandingConfig.primaryColor));
    root.style.setProperty('--secondary', hslFromHex(brandingConfig.secondaryColor));
    root.style.setProperty('--accent', hslFromHex(brandingConfig.accentColor));
    
    // Aplicar fuente
    root.style.setProperty('--font-family', brandingConfig.fontFamily);
    
    // Aplicar border radius
    root.style.setProperty('--radius', brandingConfig.borderRadius);
    
    // Aplicar favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = brandingConfig.favicon;
    }
    
    // Aplicar título
    document.title = brandingConfig.companyName;
    
    // Aplicar CSS personalizado
    let customStyleElement = document.getElementById('custom-branding-css');
    if (customStyleElement) {
      customStyleElement.remove();
    }
    
    if (brandingConfig.customCSS) {
      customStyleElement = document.createElement('style');
      customStyleElement.id = 'custom-branding-css';
      customStyleElement.textContent = brandingConfig.customCSS;
      document.head.appendChild(customStyleElement);
    }
    
    // Aplicar tema oscuro/claro
    if (brandingConfig.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const hslFromHex = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const resetBranding = async () => {
    await updateBranding(DEFAULT_BRANDING);
  };

  // Aplicar branding al cargar
  useEffect(() => {
    if (!loading) {
      applyBranding(branding);
    }
  }, [branding, loading]);

  return {
    branding,
    loading,
    updateBranding,
    resetBranding,
    applyBranding
  };
};