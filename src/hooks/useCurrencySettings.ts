
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/AuthProvider';

interface CurrencySettings {
  id: string;
  company_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_position: 'before' | 'after';
  decimal_places: number;
  thousands_separator: string;
  decimal_separator: string;
  created_at: string;
  updated_at: string;
}

export const useCurrencySettings = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

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

      return data as CurrencySettings | null;
    },
    enabled: !!profile?.company_id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<CurrencySettings>) => {
      if (!profile?.company_id) {
        throw new Error('No company ID available');
      }

      const { data, error } = await supabase
        .from('company_currency_settings')
        .upsert({
          company_id: profile.company_id,
          ...updates
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
      // Default to Paraguayan Guarani format
      return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        minimumFractionDigits: 0,
      }).format(amount);
    }

    const { currency_symbol, currency_position, decimal_places, thousands_separator, decimal_separator } = settings;
    
    // Format the number with the specified decimal places
    const formattedNumber = amount.toFixed(decimal_places);
    const [integerPart, decimalPart] = formattedNumber.split('.');
    
    // Add thousands separator
    const integerWithSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousands_separator);
    
    // Combine integer and decimal parts
    const finalNumber = decimal_places > 0 && decimalPart 
      ? `${integerWithSeparators}${decimal_separator}${decimalPart}`
      : integerWithSeparators;
    
    return currency_position === 'before' 
      ? `${currency_symbol} ${finalNumber}`
      : `${finalNumber} ${currency_symbol}`;
  };

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
    formatCurrency,
  };
};
