import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeneratePDFOptions {
  htmlContent: string;
  filename: string;
  saleId?: string;
  documentType?: 'contract' | 'declaration' | 'questionnaire' | 'other';
  dynamicFields?: any[];
  clientData?: any;
  templateData?: any;
}

interface PDFGenerationState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
}

export const usePDFGeneration = () => {
  const [state, setState] = useState<PDFGenerationState>({
    isGenerating: false,
    progress: 0,
    error: null,
  });

  const generatePDF = async (options: GeneratePDFOptions): Promise<Blob | null> => {
    try {
      setState({ isGenerating: true, progress: 0, error: null });
      
      // Validation
      if (!options.htmlContent) {
        throw new Error('Content HTML is required');
      }
      
      if (!options.filename) {
        throw new Error('Filename is required');
      }

      setState(prev => ({ ...prev, progress: 20 }));

      // Prepare data for the edge function
      const payload = {
        htmlContent: options.htmlContent,
        filename: options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`,
        saleId: options.saleId,
        documentType: options.documentType || 'contract',
        dynamicFields: options.dynamicFields || [],
        clientData: options.clientData || {},
        templateData: options.templateData || {},
      };

      setState(prev => ({ ...prev, progress: 40 }));

      // Call the improved edge function
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: payload,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate PDF');
      }

      setState(prev => ({ ...prev, progress: 80 }));

      // Convert response to blob
      const pdfBlob = new Blob([data], { type: 'application/pdf' });

      setState(prev => ({ ...prev, progress: 100 }));

      // Success notification
      toast.success('PDF generado exitosamente', {
        description: `Archivo: ${payload.filename}`,
      });

      // Reset state after success
      setTimeout(() => {
        setState({ isGenerating: false, progress: 0, error: null });
      }, 1000);

      return pdfBlob;

    } catch (error: any) {
      const errorMessage = error.message || 'Error al generar PDF';
      
      setState({
        isGenerating: false,
        progress: 0,
        error: errorMessage,
      });

      toast.error('Error al generar PDF', {
        description: errorMessage,
      });

      console.error('PDF Generation Error:', error);
      return null;
    }
  };

  const downloadPDF = async (options: GeneratePDFOptions) => {
    const pdfBlob = await generatePDF(options);
    
    if (pdfBlob) {
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL
      URL.revokeObjectURL(url);
      
      return true;
    }
    
    return false;
  };

  const previewPDF = async (options: GeneratePDFOptions) => {
    const pdfBlob = await generatePDF(options);
    
    if (pdfBlob) {
      // Open PDF in new tab for preview
      const url = URL.createObjectURL(pdfBlob);
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        toast.error('Por favor permita ventanas emergentes para ver la vista previa');
        return false;
      }
      
      // Clean up URL after some time
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000); // 1 minute
      
      return true;
    }
    
    return false;
  };

  const generateFromTemplate = async (templateData: any, clientData: any = {}) => {
    if (!templateData.static_content && !templateData.content) {
      throw new Error('Template content is required');
    }

    const htmlContent = templateData.static_content || '';
    const dynamicFields = templateData.dynamic_fields || [];

    return await generatePDF({
      htmlContent,
      filename: `${templateData.name || 'documento'}_${Date.now()}`,
      documentType: templateData.template_type || 'contract',
      dynamicFields,
      clientData,
      templateData: {
        name: templateData.name,
        description: templateData.description,
      },
    });
  };

  const reset = () => {
    setState({ isGenerating: false, progress: 0, error: null });
  };

  return {
    // State
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,
    
    // Actions
    generatePDF,
    downloadPDF,
    previewPDF,
    generateFromTemplate,
    reset,
  };
};