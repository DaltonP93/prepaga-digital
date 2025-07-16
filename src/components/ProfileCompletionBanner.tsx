import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { AlertTriangle, User } from 'lucide-react';

export const ProfileCompletionBanner: React.FC = () => {
  const navigate = useNavigate();
  const { isComplete, missingFields, completionPercentage } = useProfileCompletion();

  if (isComplete) {
    return null;
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-orange-800">
              Completa tu perfil ({completionPercentage}%)
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2 mb-2" />
          <p className="text-sm text-orange-700">
            Faltan: {missingFields.join(', ')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/profile')}
          className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100"
        >
          <User className="w-4 h-4 mr-1" />
          Completar Perfil
        </Button>
      </AlertDescription>
    </Alert>
  );
};