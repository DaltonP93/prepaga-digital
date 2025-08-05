
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  generateSimplePDF, 
  isSimpleDocument, 
  generatePDFUrl, 
  createPDFBlob,
  PDFData 
} from '@/lib/pdfUtils';

interface HybridPDFOptions extends PDFData {
  filename: string;
  forceMode?: 'client' | 'server' | 'auto';
  saleId?: string;
}

interface PDFGenerationState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  mode: 'client' | 'server' | null;
}

export const useHybridPDFGeneration = () => {
  const [state, setState] = useState<PDFGenerationState>({
    isGenerating: false,
    progress: 0,
    error: null,
    mode: null,
  });

  const generatePDF = async (options: HybridPDFOptions): Promise<{ url: string; blob: Blob } | null> => {
    setState({ isGenerating: true, progress: 0, error: null, mode: null });

    try {
      // Determinar el modo de generación
      const shouldUseClient = 
        options.forceMode === 'client' || 
        (options.forceMode !== 'server' && isSimpleDocument(options));

      setState(prev => ({ 
        ...prev, 
        progress: 20, 
        mode: shouldUseClient ? 'client' : 'server' 
      }));

      let pdfBlob: Blob;
      let pdfUrl: string;

      if (shouldUseClient) {
        // Generación rápida en cliente
        toast.info('Generando PDF rápido...', { duration: 2000 });
        
        setState(prev => ({ ...prev, progress: 60 }));
        
        const pdfBytes = await generateSimplePDF(options);
        pdfBlob = createPDFBlob(pdfBytes);
        pdfUrl = generatePDFUrl(pdfBytes);
        
        setState(prev => ({ ...prev, progress: 90 }));
        
        // Opcional: subir a Supabase Storage
        if (options.saleId) {
          const filename = `${options.filename}_${Date.now()}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filename, pdfBlob);
            
          if (uploadError) {
            console.error('Error uploading PDF:', uploadError);
          }
        }
        
        toast.success('PDF generado rápidamente', { duration: 3000 });
      } else {
        // Generación completa en servidor
        toast.info('Generando PDF completo en servidor...', { duration: 3000 });
        
        setState(prev => ({ ...prev, progress: 40 }));
        
        const { data, error } = await supabase.functions.invoke('generate-pdf', {
          body: {
            htmlContent: generateComplexHTML(options),
            filename: options.filename,
            saleId: options.saleId,
            clientData: options.personal,
            dynamicFields: Object.entries(options.health).map(([id, value]) => ({
              name: id,
              label: `Pregunta ${id}`,
              value
            })),
          }
        });

        if (error) throw error;

        setState(prev => ({ ...prev, progress: 80 }));

        // El Edge Function ya retorna el blob
        pdfBlob = new Blob([data], { type: 'application/pdf' });
        pdfUrl = URL.createObjectURL(pdfBlob);
        
        toast.success('PDF completo generado exitosamente', { duration: 3000 });
      }

      setState(prev => ({ ...prev, progress: 100 }));

      // Reset después de éxito
      setTimeout(() => {
        setState({ isGenerating: false, progress: 0, error: null, mode: null });
      }, 1000);

      return { url: pdfUrl, blob: pdfBlob };

    } catch (error: any) {
      const errorMessage = error.message || 'Error al generar PDF';
      
      setState({
        isGenerating: false,
        progress: 0,
        error: errorMessage,
        mode: null,
      });

      toast.error('Error al generar PDF', {
        description: errorMessage,
      });

      console.error('PDF Generation Error:', error);
      return null;
    }
  };

  const downloadPDF = async (options: HybridPDFOptions) => {
    const result = await generatePDF(options);
    
    if (result) {
      const link = document.createElement('a');
      link.href = result.url;
      link.download = options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(result.url);
      return true;
    }
    
    return false;
  };

  const previewPDF = async (options: HybridPDFOptions) => {
    const result = await generatePDF(options);
    
    if (result) {
      const newWindow = window.open(result.url, '_blank');
      
      if (!newWindow) {
        toast.error('Por favor permita ventanas emergentes para ver la vista previa');
        return false;
      }
      
      // Limpiar URL después de un tiempo
      setTimeout(() => {
        URL.revokeObjectURL(result.url);
      }, 60000);
      
      return true;
    }
    
    return false;
  };

  const reset = () => {
    setState({ isGenerating: false, progress: 0, error: null, mode: null });
  };

  return {
    // Estado
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,
    mode: state.mode,
    
    // Acciones
    generatePDF,
    downloadPDF,
    previewPDF,
    reset,
    
    // Utilidades
    isSimpleDocument,
  };
};

// Función auxiliar para generar HTML complejo
const generateComplexHTML = (data: PDFData): string => {
  return `
    <div class="document">
      <h1>Contrato y Declaración Jurada</h1>
      
      <section class="client-info">
        <h2>Datos del Cliente</h2>
        <p><strong>Nombre:</strong> ${data.personal.first_name} ${data.personal.last_name}</p>
        <p><strong>DNI:</strong> ${data.personal.dni}</p>
        <p><strong>Email:</strong> ${data.personal.email}</p>
        <p><strong>Teléfono:</strong> ${data.personal.phone}</p>
      </section>
      
      ${data.plan ? `
        <section class="plan-info">
          <h2>Plan Contratado</h2>
          <p><strong>Plan:</strong> ${data.plan.name}</p>
          <p><strong>Precio:</strong> $${data.plan.price.toLocaleString()}</p>
          ${data.plan.description ? `<p><strong>Descripción:</strong> ${data.plan.description}</p>` : ''}
        </section>
      ` : ''}
      
      <section class="health-declaration">
        <h2>Declaración Jurada de Salud</h2>
        ${Object.entries(data.health).map(([id, response], index) => `
          <div class="question">
            <p><strong>Pregunta ${index + 1}:</strong> ${response}</p>
          </div>
        `).join('')}
      </section>
      
      ${data.signature ? `
        <section class="signature">
          <h2>Firma Digital</h2>
          <img src="${data.signature}" alt="Firma" style="max-width: 200px;" />
        </section>
      ` : ''}
      
      <footer>
        <p>Documento generado el ${new Date().toLocaleDateString('es-ES')}</p>
      </footer>
    </div>
  `;
};
