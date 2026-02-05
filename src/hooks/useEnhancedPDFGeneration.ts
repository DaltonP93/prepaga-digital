import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  createEnhancedTemplateContext, 
  interpolateEnhancedTemplate 
} from '@/lib/enhancedTemplateEngine';

interface GenerateDocumentOptions {
  templateId?: string;
  saleId?: string;
  htmlContent?: string;
  filename: string;
  documentType?: 'contract' | 'declaration' | 'questionnaire' | 'other';
  includeSignatureFields?: boolean;
  includeBeneficiariesTable?: boolean;
}

interface GenerationState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  lastGeneratedUrl: string | null;
}

export const useEnhancedPDFGeneration = () => {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    error: null,
    lastGeneratedUrl: null,
  });

  /**
   * Generate PDF from template with sale data
   */
  const generateFromTemplate = useCallback(async (options: GenerateDocumentOptions) => {
    try {
      setState({ isGenerating: true, progress: 10, error: null, lastGeneratedUrl: null });

      // Validate inputs
      if (!options.htmlContent && !options.templateId) {
        throw new Error('Se requiere contenido HTML o ID de template');
      }

      setState(prev => ({ ...prev, progress: 30 }));

      // Call edge function
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: {
          templateId: options.templateId,
          saleId: options.saleId,
          htmlContent: options.htmlContent,
          filename: options.filename,
          documentType: options.documentType || 'contract',
          includeSignatureFields: options.includeSignatureFields ?? false,
          includeBeneficiariesTable: options.includeBeneficiariesTable ?? true,
        },
      });

      if (error) {
        throw new Error(error.message || 'Error al generar PDF');
      }

      setState(prev => ({ ...prev, progress: 80 }));

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido al generar PDF');
      }

      // Create blob from HTML and trigger download
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      setState(prev => ({ ...prev, progress: 100, lastGeneratedUrl: url }));

      toast.success('Documento generado exitosamente');

      return { success: true, html: data.html, url, metadata: data.metadata };

    } catch (error: any) {
      const errorMessage = error.message || 'Error al generar documento';
      setState({
        isGenerating: false,
        progress: 0,
        error: errorMessage,
        lastGeneratedUrl: null,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setTimeout(() => {
        setState(prev => ({ ...prev, isGenerating: false, progress: 0 }));
      }, 500);
    }
  }, []);

  /**
   * Download generated document
   */
  const downloadDocument = useCallback(async (options: GenerateDocumentOptions) => {
    const result = await generateFromTemplate(options);
    
    if (result.success && result.html) {
      // Open in new window for print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(result.html);
        printWindow.document.close();
        printWindow.focus();
        // Trigger print dialog
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        toast.error('Por favor, permite ventanas emergentes para descargar el PDF');
      }
    }
    
    return result;
  }, [generateFromTemplate]);

  /**
   * Preview document in new tab
   */
  const previewDocument = useCallback(async (options: GenerateDocumentOptions) => {
    const result = await generateFromTemplate(options);
    
    if (result.success && result.html) {
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(result.html);
        previewWindow.document.close();
      } else {
        toast.error('Por favor, permite ventanas emergentes para ver la vista previa');
      }
    }
    
    return result;
  }, [generateFromTemplate]);

  /**
   * Generate document locally without edge function (for quick previews)
   */
  const generateLocalPreview = useCallback((
    content: string,
    data: {
      client?: any;
      plan?: any;
      company?: any;
      sale?: any;
      beneficiaries?: any[];
      signatureLink?: any;
      responses?: Record<string, any>;
    }
  ): string => {
    const context = createEnhancedTemplateContext(
      data.client,
      data.plan,
      data.company,
      data.sale,
      data.beneficiaries || [],
      data.signatureLink,
      data.responses
    );

    return interpolateEnhancedTemplate(content, context);
  }, []);

  /**
   * Reset generation state
   */
  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      progress: 0,
      error: null,
      lastGeneratedUrl: null,
    });
  }, []);

  return {
    // State
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,
    lastGeneratedUrl: state.lastGeneratedUrl,

    // Actions
    generateFromTemplate,
    downloadDocument,
    previewDocument,
    generateLocalPreview,
    reset,
  };
};
