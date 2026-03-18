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

  const generateHTML = async (options: GeneratePDFOptions): Promise<string | null> => {
    try {
      setState({ isGenerating: true, progress: 0, error: null });
      
      if (!options.htmlContent) {
        throw new Error('Content HTML is required');
      }
      
      if (!options.filename) {
        throw new Error('Filename is required');
      }

      setState(prev => ({ ...prev, progress: 20 }));

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

      // The edge function returns JSON with { html: string }
      const htmlContent = typeof data === 'string' ? JSON.parse(data)?.html : data?.html;

      if (!htmlContent) {
        throw new Error('No HTML content returned from server');
      }

      setState(prev => ({ ...prev, progress: 100 }));

      toast.success('Documento generado exitosamente', {
        description: `Archivo: ${payload.filename}`,
      });

      setTimeout(() => {
        setState({ isGenerating: false, progress: 0, error: null });
      }, 1000);

      return htmlContent;

    } catch (error: any) {
      const errorMessage = error.message || 'Error al generar documento';
      
      setState({
        isGenerating: false,
        progress: 0,
        error: errorMessage,
      });

      toast.error('Error al generar documento', {
        description: errorMessage,
      });

      console.error('PDF Generation Error:', error);
      return null;
    }
  };

  // Keep backward-compatible generatePDF that returns a Blob from the HTML
  const generatePDF = async (options: GeneratePDFOptions): Promise<Blob | null> => {
    const html = await generateHTML(options);
    if (!html) return null;
    return new Blob([html], { type: 'text/html' });
  };

  const openHtmlInNewWindow = (html: string, title: string): Window | null => {
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      toast.error('Por favor permita ventanas emergentes para ver la vista previa');
      return null;
    }
    newWindow.document.open();
    newWindow.document.write(html);
    newWindow.document.close();
    newWindow.document.title = title;
    return newWindow;
  };

  const downloadPDF = async (options: GeneratePDFOptions) => {
    const html = await generateHTML(options);
    if (!html) return false;

    const newWindow = openHtmlInNewWindow(html, options.filename);
    if (!newWindow) return false;

    // Trigger print dialog so user can save as PDF
    setTimeout(() => {
      newWindow.print();
    }, 500);

    return true;
  };

  const previewPDF = async (options: GeneratePDFOptions) => {
    const html = await generateHTML(options);
    if (!html) return false;

    const newWindow = openHtmlInNewWindow(html, options.filename);
    return !!newWindow;
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