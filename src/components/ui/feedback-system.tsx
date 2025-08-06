
import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface FeedbackContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  showLoading: (message: string) => Promise<() => void>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const showError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const showInfo = useCallback((message: string) => {
    toast.info(message);
  }, []);

  const showWarning = useCallback((message: string) => {
    toast.warning(message);
  }, []);

  const showLoading = useCallback(async (message: string): Promise<() => void> => {
    const toastId = toast.loading(message);
    return () => toast.dismiss(toastId);
  }, []);

  const contextValue: FeedbackContextType = {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showLoading,
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextType => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

// Hook simplificado para operaciones asíncronas
export const useAsyncFeedback = () => {
  const [isLoading, setIsLoading] = useState(false);
  const feedback = useFeedback();

  const executeAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
    } = {}
  ): Promise<T | null> => {
    const {
      loadingMessage = 'Procesando...',
      successMessage = 'Operación completada',
      errorMessage = 'Error en la operación'
    } = options;

    setIsLoading(true);
    const dismissLoading = await feedback.showLoading(loadingMessage);

    try {
      const result = await operation();
      dismissLoading();
      feedback.showSuccess(successMessage);
      return result;
    } catch (error) {
      dismissLoading();
      feedback.showError(errorMessage);
      console.error('Async operation failed:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [feedback]);

  return { executeAsync, isLoading };
};
