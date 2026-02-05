
import { useState, useCallback } from 'react';

interface PasswordSecurityResult {
  isBreached: boolean;
  breachCount: number;
  isStrong: boolean;
  strengthScore: number;
  errors: string[];
}

interface UsePasswordSecurityReturn {
  checkPassword: (password: string) => Promise<PasswordSecurityResult>;
  isChecking: boolean;
  lastResult: PasswordSecurityResult | null;
}

/**
 * Hook para verificar seguridad de contraseñas usando HaveIBeenPwned API
 * Usa k-anonymity: solo envía los primeros 5 caracteres del hash SHA-1
 */
export const usePasswordSecurity = (): UsePasswordSecurityReturn => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<PasswordSecurityResult | null>(null);

  /**
   * Genera hash SHA-1 de la contraseña
   */
  const sha1Hash = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  /**
   * Verifica si la contraseña está en la base de datos de HaveIBeenPwned
   * Usa k-anonymity para privacidad
   */
  const checkBreached = async (password: string): Promise<{ isBreached: boolean; count: number }> => {
    try {
      const hash = await sha1Hash(password);
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: {
          'Add-Padding': 'true', // Mejora privacidad
        },
      });

      if (!response.ok) {
        console.warn('HIBP API no disponible, continuando sin verificación');
        return { isBreached: false, count: 0 };
      }

      const text = await response.text();
      const lines = text.split('\n');

      for (const line of lines) {
        const [hashSuffix, countStr] = line.split(':');
        if (hashSuffix.trim() === suffix) {
          return { isBreached: true, count: parseInt(countStr.trim(), 10) };
        }
      }

      return { isBreached: false, count: 0 };
    } catch (error) {
      console.warn('Error verificando contraseña en HIBP:', error);
      return { isBreached: false, count: 0 };
    }
  };

  /**
   * Evalúa la fortaleza de la contraseña
   */
  const evaluateStrength = (password: string): { score: number; errors: string[] } => {
    const errors: string[] = [];
    let score = 0;

    // Longitud mínima
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    } else {
      score += 20;
      if (password.length >= 12) score += 10;
      if (password.length >= 16) score += 10;
    }

    // Mayúsculas
    if (!/[A-Z]/.test(password)) {
      errors.push('Debe incluir al menos una letra mayúscula');
    } else {
      score += 15;
    }

    // Minúsculas
    if (!/[a-z]/.test(password)) {
      errors.push('Debe incluir al menos una letra minúscula');
    } else {
      score += 15;
    }

    // Números
    if (!/[0-9]/.test(password)) {
      errors.push('Debe incluir al menos un número');
    } else {
      score += 15;
    }

    // Caracteres especiales
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password)) {
      errors.push('Debe incluir al menos un carácter especial (!@#$%^&*...)');
    } else {
      score += 15;
    }

    // Patrones comunes a evitar
    const commonPatterns = [
      /^12345/,
      /^qwerty/i,
      /^password/i,
      /^123456/,
      /^abcdef/i,
      /(.)\1{2,}/, // Caracteres repetidos (aaa, 111)
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push('Evita patrones comunes o caracteres repetidos');
        score = Math.max(0, score - 20);
        break;
      }
    }

    return { score: Math.min(100, score), errors };
  };

  const checkPassword = useCallback(async (password: string): Promise<PasswordSecurityResult> => {
    setIsChecking(true);

    try {
      // Evaluar fortaleza localmente
      const { score, errors } = evaluateStrength(password);

      // Solo verificar en HIBP si pasa validación básica
      let breachResult = { isBreached: false, count: 0 };
      if (errors.length === 0) {
        breachResult = await checkBreached(password);
      }

      // Agregar error si está filtrada
      const allErrors = [...errors];
      if (breachResult.isBreached) {
        allErrors.unshift(
          `Esta contraseña apareció en ${breachResult.count.toLocaleString()} filtraciones de datos. Elige otra.`
        );
      }

      const result: PasswordSecurityResult = {
        isBreached: breachResult.isBreached,
        breachCount: breachResult.count,
        isStrong: score >= 60 && !breachResult.isBreached,
        strengthScore: breachResult.isBreached ? 0 : score,
        errors: allErrors,
      };

      setLastResult(result);
      return result;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkPassword,
    isChecking,
    lastResult,
  };
};
