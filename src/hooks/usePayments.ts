import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentData {
  amount: number;
  currency?: string;
  description?: string;
  planId?: string;
}

interface SubscriptionData {
  planId: string;
  priceId: string;
}

export const usePayments = () => {
  const { toast } = useToast();

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentData) => {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: paymentData
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Open Stripe checkout in a new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error en el pago",
        description: error.message || "No se pudo procesar el pago",
        variant: "destructive"
      });
    }
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionData: SubscriptionData) => {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: subscriptionData
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Open Stripe checkout in a new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error en la suscripción",
        description: error.message || "No se pudo crear la suscripción",
        variant: "destructive"
      });
    }
  });

  return {
    createPayment: createPaymentMutation.mutate,
    createSubscription: createSubscriptionMutation.mutate,
    isCreatingPayment: createPaymentMutation.isPending,
    isCreatingSubscription: createSubscriptionMutation.isPending
  };
};