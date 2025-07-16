import { useAuthContext } from '@/components/AuthProvider';

export interface ProfileCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
}

export const useProfileCompletion = (): ProfileCompletionStatus => {
  const { profile } = useAuthContext();

  // Always return a consistent structure, regardless of profile state
  const requiredFields = [
    { key: 'first_name', label: 'Nombre' },
    { key: 'last_name', label: 'Apellido' },
    { key: 'email', label: 'Email' },
  ];

  if (!profile) {
    return {
      isComplete: false,
      missingFields: ['Perfil no encontrado'],
      completionPercentage: 0,
    };
  }

  const missingFields: string[] = [];

  requiredFields.forEach(field => {
    const value = profile[field.key as keyof typeof profile];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field.label);
    }
  });

  const completionPercentage = Math.round(
    ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
  );

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercentage,
  };
};