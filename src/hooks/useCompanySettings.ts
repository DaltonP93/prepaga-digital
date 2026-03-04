
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

interface CompanyBranding {
  login_background_url?: string;
  login_logo_url?: string;
  login_title?: string;
  login_subtitle?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

export const useCompanyBranding = (companyId?: string) => {
  const { profile } = useSimpleAuthContext();
  const targetCompanyId = companyId || profile?.company_id;

  return useQuery({
    queryKey: ['company-branding', targetCompanyId],
    queryFn: async () => {
      if (!targetCompanyId) {
        return null;
      }

      const { data, error } = await supabase
        .from('companies')
        .select(`
          login_background_url,
          login_logo_url,
          primary_color,
          secondary_color,
          accent_color
        `)
        .eq('id', targetCompanyId)
        .single();

      if (error) {
        console.error('Error fetching company branding:', error);
        return null;
      }

      let localTitle: string | undefined;
      let localSubtitle: string | undefined;
      try {
        localTitle = localStorage.getItem('samap_branding_name') || undefined;
        localSubtitle = localStorage.getItem('samap_branding_login_subtitle') || undefined;
      } catch {
        // noop
      }

      return {
        ...(data as CompanyBranding),
        login_title: localTitle,
        login_subtitle: localSubtitle,
      };
    },
    enabled: !!targetCompanyId,
  });
};
