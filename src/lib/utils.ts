
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Default currency formatter - will be overridden by company settings
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Custom currency formatter that accepts settings
export function formatCurrencyWithSettings(
  amount: number,
  settings?: {
    currency_symbol: string;
    currency_position: 'before' | 'after';
    decimal_places: number;
    thousands_separator: string;
    decimal_separator: string;
  }
): string {
  if (!settings) {
    return formatCurrency(amount);
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
}
