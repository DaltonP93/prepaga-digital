
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
          salesperson:salesperson_id(first_name, last_name, email),
          companies:company_id(name),
          templates:template_id(name, description)
        `)
        .eq('id', saleId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!saleId,
  });
};
