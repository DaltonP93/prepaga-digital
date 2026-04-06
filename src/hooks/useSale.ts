
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSale = (saleId: string) => {
  const query = useQuery({
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

      const salespersonPromise = data.salesperson_id
        ? supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', data.salesperson_id)
            .single()
        : Promise.resolve({ data: null, error: null } as const);

      const [{ data: salesperson, error: salespersonError }] = await Promise.all([salespersonPromise]);

      if (salespersonError) throw salespersonError;

      return { ...data, salesperson, profiles: salesperson };
    },
    enabled: !!saleId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return query;
};
