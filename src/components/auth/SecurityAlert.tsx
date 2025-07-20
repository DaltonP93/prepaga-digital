
import { AlertTriangle } from 'lucide-react';

interface SecurityAlertProps {
  type: 'blocked' | 'warning';
  message: string;
}

export const SecurityAlert = ({ type, message }: SecurityAlertProps) => {
  const isBlocked = type === 'blocked';
  
  return (
    <div className={`mb-4 p-3 border rounded-md flex items-center gap-2 ${
      isBlocked 
        ? 'bg-red-50 border-red-200' 
        : 'bg-amber-50 border-amber-200'
    }`}>
      <AlertTriangle className={`h-4 w-4 ${
        isBlocked ? 'text-red-600' : 'text-amber-600'
      }`} />
      <span className={`text-sm ${
        isBlocked ? 'text-red-700' : 'text-amber-700'
      }`}>
        {message}
      </span>
    </div>
  );
};
