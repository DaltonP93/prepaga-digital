import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { Database } from '@/integrations/supabase/types';

type CurrencySettingsRow = Database['public']['Tables']['company_currency_settings']['Row'];

export const useCurrencySettings = () => {
  const queryClient = useQueryClient();
  const { profile } = useSimpleAuthContext();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['currency-settings', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('company_currency_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching currency settings:', error);
        return null;
      }

      return data;
    },
    enabled: !!profile?.company_id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<CurrencySettingsRow>) => {
      if (!profile?.company_id) {
        throw new Error('No company ID available');
      }

      const { data, error } = await supabase
        .from('company_currency_settings')
        .upsert({
          company_id: profile.company_id,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency-settings'] });
      toast.success('Configuración de moneda actualizada correctamente');
    },
    onError: (error) => {
      console.error('Error updating currency settings:', error);
      toast.error('Error al actualizar la configuración de moneda');
    },
  });

  const formatCurrency = (amount: number): string => {
    if (!settings) {
      // Default to Paraguayan Guarani format with "Gs." prefix
      const formattedAmount = amount.toLocaleString('es-PY', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      return `Gs. ${formattedAmount}`;
    }

    const { currency_symbol, decimal_places, thousand_separator, decimal_separator } = settings;
    
    // Format the number with the specified decimal places
    const formattedNumber = amount.toFixed(decimal_places || 0);
    const [integerPart, decimalPart] = formattedNumber.split('.');
    
    // Add thousands separator
    const integerWithSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousand_separator || '.');
    
    // Combine integer and decimal parts
    const finalNumber = (decimal_places || 0) > 0 && decimalPart 
      ? `${integerWithSeparators}${decimal_separator || ','}${decimalPart}`
      : integerWithSeparators;
    
    return `${currency_symbol || 'Gs.'} ${finalNumber}`;
  };

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
    formatCurrency,
  };
};
