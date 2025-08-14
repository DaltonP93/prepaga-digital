
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign } from 'lucide-react';
import { useCurrencySettings } from '@/hooks/useCurrencySettings';
import { useAuthContext } from '@/components/AuthProvider';

interface CurrencyFormData {
  currency_code: string;
  currency_symbol: string;
  currency_position: 'before' | 'after';
  decimal_places: number;
  thousands_separator: string;
  decimal_separator: string;
}

const currencies = [
  { code: 'GS', symbol: 'Gs.', name: 'Guaraní Paraguayo' },
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño' },
];

export const CurrencyConfigurationPanel = () => {
  const { profile } = useAuthContext();
  const { settings, isLoading, updateSettings, isUpdating, formatCurrency } = useCurrencySettings();
  
  const canManage = ['admin', 'super_admin'].includes(profile?.role || '');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CurrencyFormData>({
    defaultValues: {
      currency_code: 'GS',
      currency_symbol: 'Gs.',
      currency_position: 'before',
      decimal_places: 0,
      thousands_separator: '.',
      decimal_separator: ',',
    }
  });

  React.useEffect(() => {
    if (settings) {
      setValue('currency_code', settings.currency_code);
      setValue('currency_symbol', settings.currency_symbol);
      setValue('currency_position', settings.currency_position);
      setValue('decimal_places', settings.decimal_places);
      setValue('thousands_separator', settings.thousands_separator);
      setValue('decimal_separator', settings.decimal_separator);
    }
  }, [settings, setValue]);

  const watchedValues = watch();

  const onSubmit = (data: CurrencyFormData) => {
    updateSettings(data);
  };

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    if (currency) {
      setValue('currency_code', currency.code);
      setValue('currency_symbol', currency.symbol);
      
      // Set default formatting based on currency
      if (currency.code === 'GS') {
        setValue('decimal_places', 0);
        setValue('thousands_separator', '.');
        setValue('decimal_separator', ',');
      } else {
        setValue('decimal_places', 2);
        setValue('thousands_separator', ',');
        setValue('decimal_separator', '.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">
          Solo los administradores pueden configurar la moneda
        </p>
        {settings && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="font-medium">Configuración actual:</p>
            <p>{currencies.find(c => c.code === settings.currency_code)?.name}</p>
            <p>Ejemplo: {formatCurrency(123456.78)}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency_code">Moneda</Label>
          <Select
            value={watchedValues.currency_code}
            onValueChange={handleCurrencyChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar moneda" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.name} ({currency.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency_symbol">Símbolo</Label>
          <Input
            id="currency_symbol"
            {...register('currency_symbol', { required: 'El símbolo es requerido' })}
            placeholder="Gs."
          />
          {errors.currency_symbol && (
            <p className="text-sm text-red-500">{errors.currency_symbol.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency_position">Posición del símbolo</Label>
          <Select
            value={watchedValues.currency_position}
            onValueChange={(value: 'before' | 'after') => setValue('currency_position', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="before">Antes del monto</SelectItem>
              <SelectItem value="after">Después del monto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="decimal_places">Decimales</Label>
          <Select
            value={watchedValues.decimal_places.toString()}
            onValueChange={(value) => setValue('decimal_places', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0 decimales</SelectItem>
              <SelectItem value="2">2 decimales</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="thousands_separator">Separador de miles</Label>
          <Select
            value={watchedValues.thousands_separator}
            onValueChange={(value) => setValue('thousands_separator', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=".">Punto (.)</SelectItem>
              <SelectItem value=",">Coma (,)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="decimal_separator">Separador decimal</Label>
          <Select
            value={watchedValues.decimal_separator}
            onValueChange={(value) => setValue('decimal_separator', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=",">Coma (,)</SelectItem>
              <SelectItem value=".">Punto (.)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4" />
          <span className="font-medium">Vista previa:</span>
        </div>
        <div className="text-lg font-mono">
          {formatCurrency(123456.78)}
        </div>
      </div>

      <Button type="submit" disabled={isUpdating} className="w-full">
        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar Configuración
      </Button>
    </form>
  );
};
