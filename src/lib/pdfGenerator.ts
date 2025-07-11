
// PDF Generation utilities
export interface PDFDocument {
  content: string;
  signatures: Array<{
    signature_data: string;
    signed_at: string;
    document_id: string;
  }>;
  client: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    dni?: string;
  };
  plan: {
    name: string;
    price: number;
    description?: string;
  };
  company: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export const generatePDFContent = (document: PDFDocument): string => {
  const { client, plan, company, signatures } = document;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Documento Firmado</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .company-info { margin-bottom: 30px; }
        .client-info { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .plan-info { background: #e3f2fd; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .signature-section { border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .signature-image { max-width: 200px; border: 1px solid #ccc; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${company.name}</h1>
        <p>Documento Contractual Firmado Digitalmente</p>
    </div>

    <div class="company-info">
        <h2>Información de la Empresa</h2>
        <p><strong>Nombre:</strong> ${company.name}</p>
        ${company.email ? `<p><strong>Email:</strong> ${company.email}</p>` : ''}
        ${company.phone ? `<p><strong>Teléfono:</strong> ${company.phone}</p>` : ''}
    </div>

    <div class="client-info">
        <h2>Información del Cliente</h2>
        <table>
            <tr><td><strong>Nombre Completo</strong></td><td>${client.first_name} ${client.last_name}</td></tr>
            <tr><td><strong>Email</strong></td><td>${client.email}</td></tr>
            ${client.phone ? `<tr><td><strong>Teléfono</strong></td><td>${client.phone}</td></tr>` : ''}
            ${client.dni ? `<tr><td><strong>DNI</strong></td><td>${client.dni}</td></tr>` : ''}
        </table>
    </div>

    <div class="plan-info">
        <h2>Plan Contratado</h2>
        <table>
            <tr><td><strong>Plan</strong></td><td>${plan.name}</td></tr>
            <tr><td><strong>Precio</strong></td><td>$${plan.price}</td></tr>
            ${plan.description ? `<tr><td><strong>Descripción</strong></td><td>${plan.description}</td></tr>` : ''}
        </table>
    </div>

    <div class="content">
        <h2>Contenido del Documento</h2>
        <div>${document.content}</div>
    </div>

    ${signatures.length > 0 ? `
    <div class="signature-section">
        <h2>Firmas Digitales</h2>
        ${signatures.map((sig, index) => `
            <div style="margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
                <h3>Firma ${index + 1}</h3>
                <p><strong>Fecha:</strong> ${new Date(sig.signed_at).toLocaleString()}</p>
                <div style="margin: 10px 0;">
                    <img src="${sig.signature_data}" alt="Firma digital" class="signature-image" />
                </div>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="footer">
        <p>Este documento ha sido generado automáticamente el ${new Date().toLocaleString()}</p>
        <p>Documento firmado digitalmente - Válido según normativas vigentes</p>
    </div>
</body>
</html>
  `.trim();
};

export const downloadPDF = async (content: string, filename: string) => {
  try {
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Error generating PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    // Fallback: open content in new window
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(content);
      newWindow.document.close();
    }
  }
};
