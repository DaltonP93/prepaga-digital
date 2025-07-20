
import { useState, useEffect } from 'react';

interface UseRetryLogicProps {
  maxRetries: number;
  onRetry: () => Promise<void>;
  shouldRetry: boolean;
  resetTrigger?: any;
}

export const useRetryLogic = ({ 
  maxRetries, 
  onRetry, 
  shouldRetry, 
  resetTrigger 
}: UseRetryLogicProps) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Handle automatic retries
  useEffect(() => {
    if (shouldRetry && retryCount < maxRetries && !isRetrying) {
      const retryDelay = Math.min(2000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
      
      const timeoutId = setTimeout(() => {
        console.log(`Auto-retry attempt ${retryCount + 1}/${maxRetries}`);
        setRetryCount(prev => prev + 1);
        setIsRetrying(true);
        
        onRetry().finally(() => {
          setIsRetrying(false);
        });
      }, retryDelay);

      return () => clearTimeout(timeoutId);
    }
  }, [shouldRetry, retryCount, maxRetries, isRetrying, onRetry]);

  // Reset retry count when conditions change
  useEffect(() => {
    if (resetTrigger) {
      setRetryCount(0);
      setIsRetrying(false);
    }
  }, [resetTrigger]);

  const manualRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return {
    retryCount,
    isRetrying,
    manualRetry,
    setIsRetrying
  };
};
