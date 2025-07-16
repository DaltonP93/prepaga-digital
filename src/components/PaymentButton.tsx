import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePayments } from '@/hooks/usePayments';

interface PaymentButtonProps {
  amount: number;
  currency?: string;
  description?: string;
  planId?: string;
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const PaymentButton = ({ 
  amount, 
  currency = 'usd', 
  description, 
  planId,
  children,
  variant = "default",
  size = "default"
}: PaymentButtonProps) => {
  const { createPayment, isCreatingPayment } = usePayments();

  const handlePayment = () => {
    createPayment({
      amount,
      currency,
      description,
      planId
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    const actualAmount = amount / 100; // Convert from cents
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(actualAmount);
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={isCreatingPayment}
      variant={variant}
      size={size}
    >
      {isCreatingPayment ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <CreditCard className="h-4 w-4 mr-2" />
      )}
      {children || `Pagar ${formatAmount(amount, currency)}`}
    </Button>
  );
};

export default PaymentButton;