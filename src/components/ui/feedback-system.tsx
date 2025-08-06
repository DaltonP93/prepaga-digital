
import { useState, createContext, useContext, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface FeedbackContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  dismissToast: (id: string) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

interface FeedbackProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const FeedbackProvider = ({ 
  children, 
  position = 'top-right' 
}: FeedbackProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto dismiss
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message, duration: 8000 });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message, duration: 6000 });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <FeedbackContext.Provider value={{
      showToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      dismissToast,
    }}>
      {children}
      
      {/* Toast Container */}
      <div className={cn("fixed z-50 space-y-2", getPositionClasses())}>
        {toasts.map(toast => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </FeedbackContext.Provider>
  );
};

interface ToastComponentProps {
  toast: Toast;
  onDismiss: () => void;
}

const ToastComponent = ({ toast, onDismiss }: ToastComponentProps) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getColorClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className={cn(
      "max-w-sm w-full border rounded-lg shadow-lg p-4 animate-in slide-in-from-right-full",
      getColorClasses()
    )}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-sm text-gray-700 mt-1">
              {toast.message}
            </p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Hook para operaciones asíncronas con feedback automático
export const useAsyncFeedback = () => {
  const { showSuccess, showError } = useFeedback();

  const executeWithFeedback = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
      successTitle?: string;
      errorTitle?: string;
    } = {}
  ): Promise<T | null> => {
    const {
      successMessage,
      errorMessage,
      successTitle = 'Éxito',
      errorTitle = 'Error'
    } = options;

    try {
      const result = await operation();
      
      if (successMessage) {
        showSuccess(successTitle, successMessage);
      }
      
      return result;
    } catch (error: any) {
      const message = errorMessage || error.message || 'Ocurrió un error inesperado';
      showError(errorTitle, message);
      return null;
    }
  }, [showSuccess, showError]);

  return { executeWithFeedback };
};
