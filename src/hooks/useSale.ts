
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSale = (saleId: string) => {
  return useQuery({
    queryKey: ['sale', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients:client_id(first_name, last_name, email, phone, dni),
          plans:plan_id(name, price, description, coverage_details),
          companies:company_id(name),
          templates:template_id(name, description)
        `)
        .eq('id', saleId)
        .single();

      if (error) throw error;

      // Fetch salesperson profile separately (no FK exists for salesperson_id)
      let salesperson = null;
      if (data.salesperson_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', data.salesperson_id)
          .single();
        salesperson = profile;
      }

      return { ...data, salesperson, profiles: salesperson };
    },
    enabled: !!saleId,
  });
};
