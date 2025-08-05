
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface PDFData {
  personal: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    dni: string;
  };
  health: Record<string, string>;
  plan?: {
    name: string;
    price: number;
    description?: string;
  };
  signature?: string;
  contractNumber?: string;
}

export const isSimpleDocument = (data: PDFData): boolean => {
  // Determina si el documento es simple basado en:
  // - Cantidad de preguntas de salud
  // - Ausencia de imágenes complejas
  // - Contenido principalmente textual
  const healthQuestionsCount = Object.keys(data.health || {}).length;
  
  return (
    healthQuestionsCount <= 8 &&
    !data.signature && // Los documentos con firma son más complejos
    (!data.plan?.description || data.plan.description.length < 500)
  );
};

export const generateSimplePDF = async (data: PDFData): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = height - 60;
  
  // Encabezado
  page.drawText('CONTRATO Y DECLARACIÓN JURADA', {
    x: 50,
    y: yPosition,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 40;
  
  // Información del cliente
  page.drawText('DATOS DEL CLIENTE', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPosition -= 25;
  
  const clientInfo = [
    `Nombre: ${data.personal.first_name} ${data.personal.last_name}`,
    `DNI: ${data.personal.dni}`,
    `Email: ${data.personal.email}`,
    `Teléfono: ${data.personal.phone || 'No especificado'}`,
  ];
  
  clientInfo.forEach(info => {
    page.drawText(info, {
      x: 70,
      y: yPosition,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
  });
  
  yPosition -= 20;
  
  // Plan seleccionado
  if (data.plan) {
    page.drawText('PLAN CONTRATADO', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    yPosition -= 25;
    
    page.drawText(`Plan: ${data.plan.name}`, {
      x: 70,
      y: yPosition,
      size: 11,
      font,
    });
    yPosition -= 20;
    
    page.drawText(`Precio: $${data.plan.price.toLocaleString()}`, {
      x: 70,
      y: yPosition,
      size: 11,
      font,
    });
    yPosition -= 30;
  }
  
  // Declaración Jurada
  if (Object.keys(data.health).length > 0) {
    page.drawText('DECLARACIÓN JURADA DE SALUD', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    yPosition -= 25;
    
    Object.entries(data.health).forEach(([questionId, response], index) => {
      const questionText = `${index + 1}. Pregunta ${questionId}: ${response}`;
      
      // Dividir texto largo en líneas
      const maxWidth = 450;
      const words = questionText.split(' ');
      let line = '';
      
      words.forEach(word => {
        const testLine = line + word + ' ';
        const testWidth = testLine.length * 6; // Aproximación
        
        if (testWidth > maxWidth && line !== '') {
          page.drawText(line.trim(), {
            x: 70,
            y: yPosition,
            size: 10,
            font,
            maxWidth: maxWidth,
          });
          yPosition -= 15;
          line = word + ' ';
        } else {
          line = testLine;
        }
      });
      
      if (line.trim()) {
        page.drawText(line.trim(), {
          x: 70,
          y: yPosition,
          size: 10,
          font,
          maxWidth: maxWidth,
        });
        yPosition -= 20;
      }
    });
  }
  
  // Espacio para firma
  yPosition -= 40;
  page.drawText('FIRMA:', {
    x: 50,
    y: yPosition,
    size: 12,
    font: boldFont,
  });
  
  // Línea para firma
  page.drawLine({
    start: { x: 200, y: yPosition - 5 },
    end: { x: 400, y: yPosition - 5 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  
  // Fecha de generación
  page.drawText(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, {
    x: 50,
    y: 50,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  return await pdfDoc.save();
};

export const createPDFBlob = (pdfBytes: Uint8Array): Blob => {
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

export const generatePDFUrl = (pdfBytes: Uint8Array): string => {
  const blob = createPDFBlob(pdfBytes);
  return URL.createObjectURL(blob);
};
