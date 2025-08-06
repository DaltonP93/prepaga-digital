
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { toast, Toaster } from 'sonner';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';
export type FeedbackPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

export interface FeedbackOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  description?: string;
}

export interface FeedbackContextType {
  showFeedback: (type: FeedbackType, message: string, options?: FeedbackOptions) => void;
  showSuccess: (message: string, options?: FeedbackOptions) => void;
  showError: (message: string, options?: FeedbackOptions) => void;
  showWarning: (message: string, options?: FeedbackOptions) => void;
  showInfo: (message: string, options?: FeedbackOptions) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export interface FeedbackProviderProps {
  children: ReactNode;
  position?: FeedbackPosition;
  expand?: boolean;
  richColors?: boolean;
}

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ 
  children, 
  position = 'top-right',
  expand = true,
  richColors = true 
}) => {
  const showFeedback = useCallback((type: FeedbackType, message: string, options?: FeedbackOptions) => {
    const toastOptions = {
      duration: options?.duration || 4000,
      action: options?.action,
      description: options?.description,
    };

    switch (type) {
      case 'success':
        toast.success(message, toastOptions);
        break;
      case 'error':
        toast.error(message, toastOptions);
        break;
      case 'warning':
        toast.warning(message, toastOptions);
        break;
      case 'info':
        toast.info(message, toastOptions);
        break;
      default:
        toast(message, toastOptions);
    }
  }, []);

  const showSuccess = useCallback((message: string, options?: FeedbackOptions) => {
    showFeedback('success', message, options);
  }, [showFeedback]);

  const showError = useCallback((message: string, options?: FeedbackOptions) => {
    showFeedback('error', message, options);
  }, [showFeedback]);

  const showWarning = useCallback((message: string, options?: FeedbackOptions) => {
    showFeedback('warning', message, options);
  }, [showFeedback]);

  const showInfo = useCallback((message: string, options?: FeedbackOptions) => {
    showFeedback('info', message, options);
  }, [showFeedback]);

  const contextValue: FeedbackContextType = {
    showFeedback,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <Toaster
        position={position}
        expand={expand}
        richColors={richColors}
        closeButton
        toastOptions={{
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextType => {
  const context = useContext(FeedbackContext);
  if (context === undefined) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

export interface AsyncOperationOptions<T> extends FeedbackOptions {
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  transform?: (result: T) => string;
}

export const useAsyncFeedback = () => {
  const { showFeedback } = useFeedback();

  const executeWithFeedback = useCallback(async <T>(
    asyncOperation: () => Promise<T>,
    options: AsyncOperationOptions<T> = {}
  ): Promise<T> => {
    const {
      loadingMessage = 'Procesando...',
      successMessage = 'Operación completada exitosamente',
      errorMessage = 'Ocurrió un error durante la operación',
      transform,
      ...feedbackOptions
    } = options;

    return new Promise((resolve, reject) => {
      toast.promise(
        asyncOperation(),
        {
          loading: loadingMessage,
          success: (result: T) => {
            return transform ? transform(result) : successMessage;
          },
          error: (error: Error) => {
            return error.message || errorMessage;
          },
        }
      );

      asyncOperation()
        .then(resolve)
        .catch(reject);
    });
  }, []);

  return { executeWithFeedback };
};
