
import React, { useEffect, useRef } from 'react';

// Declarar el elemento personalizado para TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'docuseal-form': {
        id?: string;
        'data-src'?: string;
        'data-email'?: string;
      };
    }
  }
}

interface DocuSealFormProps {
  src: string;
  email: string;
  onCompleted?: (data: any) => void;
  className?: string;
}

export const DocuSealForm: React.FC<DocuSealFormProps> = ({
  src,
  email,
  onCompleted,
  className = ""
}) => {
  const formRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    const loadDocuSealScript = () => {
      if (scriptLoadedRef.current) return;

      const script = document.createElement('script');
      script.src = 'https://cdn.docuseal.com/js/form.js';
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        // Initialize form after script loads
        initializeForm();
      };
      document.head.appendChild(script);
    };

    const initializeForm = () => {
      if (formRef.current && window.docusealForm) {
        // Add event listener for completion
        window.docusealForm.addEventListener('completed', (e: any) => {
          console.log('DocuSeal form completed:', e.detail);
          if (onCompleted) {
            onCompleted(e.detail);
          }
        });
      }
    };

    // Load script if not already loaded
    if (!document.querySelector('script[src="https://cdn.docuseal.com/js/form.js"]')) {
      loadDocuSealScript();
    } else {
      scriptLoadedRef.current = true;
      initializeForm();
    }

    return () => {
      // Cleanup if needed
    };
  }, [onCompleted]);

  return (
    <div ref={formRef} className={className}>
      <docuseal-form
        id="docusealForm"
        data-src={src}
        data-email={email}
      />
    </div>
  );
};

// Extend the Window interface to include docusealForm
declare global {
  interface Window {
    docusealForm: any;
  }
}
