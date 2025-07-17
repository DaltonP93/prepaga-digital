import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BrandingConfig {
  login_title?: string;
  login_subtitle?: string;
  login_logo_url?: string;
  login_background_url?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  companyName: string;
  logoUrl: string;
  favicon: string;
  fontFamily: string;
  borderRadius: string;
  shadows: boolean;
  darkMode: boolean;
  customCSS: string;
}

export const useBranding = () => {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { data } = await supabase
          .from('companies')
          .select('*')
          .limit(1)
          .single();

        if (data) {
          setBranding({
            login_title: data.login_title || "Seguro Digital",
            login_subtitle: data.login_subtitle || "Sistema de Firma Digital",
            login_logo_url: data.login_logo_url || "",
            login_background_url: data.login_background_url || "",
            primaryColor: data.primary_color || "#667eea",
            secondaryColor: data.secondary_color || "#764ba2",
            accentColor: data.accent_color || "#4ade80",
            companyName: data.name || "Mi Empresa",
            logoUrl: data.logo_url || "",
            favicon: data.favicon || "/favicon.ico",
            fontFamily: data.font_family || "Inter",
            borderRadius: data.border_radius || "0.5rem",
            shadows: data.shadows ?? true,
            darkMode: data.dark_mode ?? false,
            customCSS: data.custom_css || "",
          });
        }
      } catch (error) {
        console.error('Error fetching branding:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  const updateBranding = async (updates: Partial<BrandingConfig>) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', 'default-company-id'); // Replace with actual company ID logic

      if (error) throw error;

      setBranding(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
  };

  const resetBranding = async () => {
    const defaultBranding: BrandingConfig = {
      login_title: "Seguro Digital",
      login_subtitle: "Sistema de Firma Digital", 
      login_logo_url: "",
      login_background_url: "",
      primaryColor: "#667eea",
      secondaryColor: "#764ba2",
      accentColor: "#4ade80",
      companyName: "Mi Empresa",
      logoUrl: "",
      favicon: "/favicon.ico",
      fontFamily: "Inter",
      borderRadius: "0.5rem",
      shadows: true,
      darkMode: false,
      customCSS: "",
    };

    try {
      await updateBranding(defaultBranding);
    } catch (error) {
      console.error('Error resetting branding:', error);
      throw error;
    }
  };

  const applyBranding = (brandingConfig: BrandingConfig) => {
    setBranding(brandingConfig);
  };

  return {
    branding,
    loading,
    updateBranding,
    resetBranding,
    applyBranding,
  };
};
