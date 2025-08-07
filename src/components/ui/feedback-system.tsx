
import React, { createContext, useContext, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface FeedbackContextType {
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = (): FeedbackContextType => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

interface FeedbackProviderProps {
  children: React.ReactNode;
}

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ children }) => {
  const { toast } = useToast();

  const showSuccess = useCallback((message: string, title = "Éxito") => {
    toast({
      title,
      description: message,
      variant: "default",
    });
  }, [toast]);

  const showError = useCallback((message: string, title = "Error") => {
    toast({
      title,
      description: message,
      variant: "destructive",
    });
  }, [toast]);

  const showInfo = useCallback((message: string, title = "Información") => {
    toast({
      title,
      description: message,
      variant: "default",
    });
  }, [toast]);

  const showWarning = useCallback((message: string, title = "Advertencia") => {
    toast({
      title,
      description: message,
      variant: "destructive",
    });
  }, [toast]);

  const value: FeedbackContextType = {
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
};

export default FeedbackProvider;
