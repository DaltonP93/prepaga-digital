UPDATE public.templates 
SET content = '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">

<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
<tr>
<td style="width: 33%; text-align: left; font-size: 11px; color: #666;">SISTEMA DE GESTIÓN DE CALIDAD</td>
<td style="width: 33%; text-align: center; font-weight: bold; font-size: 14px;">Medicina Pre-paga</td>
<td style="width: 33%; text-align: right; font-size: 11px; color: #666;">Versión: 03</td>
</tr>
<tr>
<td style="text-align: left; font-size: 11px; color: #666;">Documento integrante del contrato</td>
<td style="text-align: center; font-weight: bold; font-size: 16px; padding: 10px 0;">DECLARACIÓN JURADA DE SALUD</td>
<td style="text-align: right; font-size: 11px; color: #666;">Fecha: {{fecha_actual}}<br/>Página 1 de 1</td>
</tr>
</table>

<hr style="border: 1px solid #333; margin-bottom: 15px;"/>

<h3 style="margin: 10px 0 5px; font-size: 13px;">Titular/CI: <span style="font-weight: normal;">{{titular_nombre}} {{titular_apellido}} / {{titular_dni}}</span></h3>
<p style="margin: 5px 0; font-size: 12px;">Peso: ________ &nbsp;&nbsp;&nbsp; Altura: ________</p>

<h3 style="margin: 15px 0 8px; font-size: 13px;">Beneficiarios</h3>
<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
<tr style="background: #f0f0f0;">
<th style="border: 1px solid #ccc; padding: 4px; text-align: left;">Beneficiario / CI</th>
<th style="border: 1px solid #ccc; padding: 4px; text-align: center; width: 80px;">Peso</th>
<th style="border: 1px solid #ccc; padding: 4px; text-align: center; width: 80px;">Altura</th>
</tr>
{{#beneficiarios}}
<tr>
<td style="border: 1px solid #ccc; padding: 4px;">{{first_name}} {{last_name}} / {{dni}}</td>
<td style="border: 1px solid #ccc; padding: 4px; text-align: center;">______</td>
<td style="border: 1px solid #ccc; padding: 4px; text-align: center;">______</td>
</tr>
{{/beneficiarios}}
</table>

<h3 style="margin: 15px 0 8px; font-size: 13px;">Enfermedades o condiciones</h3>
<p style="font-size: 10px; color: #555; margin-bottom: 8px;">Indique con X en la celda correspondiente las enfermedades o condiciones que padece o ha padecido cada Beneficiario.</p>

<table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 15px;">
<tr style="background: #f0f0f0;">
<th style="border: 1px solid #ccc; padding: 5px; text-align: left; width: 35%;">Categoría</th>
<th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Detalle</th>
<th style="border: 1px solid #ccc; padding: 5px; text-align: center; width: 40px;">X</th>
<th style="border: 1px solid #ccc; padding: 5px; text-align: left; width: 25%;">Observaciones</th>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Sistema Respiratorio</td>
<td style="border: 1px solid #ccc; padding: 5px;">Asma, alergias, Sinusitis, Adenoides, Amígdalas, EPOC, u otros.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Enfermedades congénitas</td>
<td style="border: 1px solid #ccc; padding: 5px;">Enfermedades y/o afecciones congénitas.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Sistema endócrino e inmune</td>
<td style="border: 1px solid #ccc; padding: 5px;">Diabetes, Tiroides, Celiaquía, Lupus, Artritis, Arteriosclerosis, u otros.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Sistema Cardiovascular</td>
<td style="border: 1px solid #ccc; padding: 5px;">HTA, ACV, Arritmias, Soplo cardíaco, Insuficiencia cardíaca, Marcapasos, cardiopatías congénitas u otros.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Enfermedades Hematológicas</td>
<td style="border: 1px solid #ccc; padding: 5px;">Anemia, Leucemia, Enf. de coagulación, Linfomas, Mielomas, Hemofilia, u otras.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Enfermedades oncológicas</td>
<td style="border: 1px solid #ccc; padding: 5px;">Tumores malignos o benignos, quistes.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Afecciones ginecológicas</td>
<td style="border: 1px solid #ccc; padding: 5px;">Mioma, Prolapso, Hiperplasias, Endometriosis, Quistes de Ovario, Trompas y Mamas, Pólipo u otras.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Sistema digestivo y Urinario</td>
<td style="border: 1px solid #ccc; padding: 5px;">Hepatitis, Pancreatitis, Cálculos Biliares, Úlceras, Gastritis, Diverticulitis, Hemorroides, Incontinencia Urinaria, Cálculo renal, Próstata u otros.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Enfermedades traumatológicas</td>
<td style="border: 1px solid #ccc; padding: 5px;">Hernia de disco, Artrosis, Osteoporosis, Tendinitis, Meniscos, ligamentos u otras.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Cirugías realizadas</td>
<td style="border: 1px solid #ccc; padding: 5px;">Incluyendo cesáreas y cirugías estéticas.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Otra enfermedad o condición</td>
<td style="border: 1px solid #ccc; padding: 5px;">¿Padece alguna enfermedad no mencionada anteriormente? Indicar cuál/les.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Medicación habitual</td>
<td style="border: 1px solid #ccc; padding: 5px;">Medicación que utiliza habitualmente.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">IMC</td>
<td style="border: 1px solid #ccc; padding: 5px;">Índice de Masa Corporal.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">FUM</td>
<td style="border: 1px solid #ccc; padding: 5px;">Fecha de última menstruación.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Menores de 0 a 2 años</td>
<td style="border: 1px solid #ccc; padding: 5px;">Citar nombre del Pediatra y Centro Asistencial de Nacimiento.</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">Tratamiento psicológico/psiquiátrico</td>
<td style="border: 1px solid #ccc; padding: 5px;">¿Se encuentra en tratamiento psicológico o psiquiátrico?</td>
<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"></td>
<td style="border: 1px solid #ccc; padding: 5px;"></td>
</tr>
</table>

<h3 style="margin: 15px 0 8px; font-size: 13px;">Declaración</h3>
<p style="font-size: 10px; text-align: justify; line-height: 1.5; margin-bottom: 10px;">
Declaro(amos) bajo fe de juramento que la información suministrada es auténtica y que no hemos omitido ningún dato acerca del estado de salud de las personas incluidas en este documento. Tenemos conocimiento que cualquier falsedad, omisión o inexactitud, deliberadas o no, podrá invalidar el contrato sin perjuicio de exigir la restitución del costo de las prestaciones en infracción del ejercicio de las acciones civiles.
</p>
<p style="font-size: 10px; text-align: justify; line-height: 1.5; margin-bottom: 10px;">
Autorizo(amos) a la empresa a solicitar a prestadores de servicios, los informes que requiera para los fines de Auditoría Médica. La empresa resguardará de terceros no autorizados los diagnósticos médicos y servicios utilizados por el/la Titular y los beneficiarios, salvo orden judicial.
</p>
<p style="font-size: 10px; text-align: justify; line-height: 1.5; margin-bottom: 15px;">
La firma estampada en la presente Declaración Jurada de Salud corresponde al titular y a cada beneficiario mayor de edad. Firma del Padre/Madre o Responsable para menores de 18 años.
</p>

<h3 style="margin: 15px 0 8px; font-size: 13px;">Firmas</h3>
<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
<tr>
<td style="border: 1px solid #ccc; padding: 10px; width: 50%;">Firma Titular:<br/><br/><br/>________________________<br/>{{titular_nombre}} {{titular_apellido}}</td>
<td style="border: 1px solid #ccc; padding: 10px; width: 50%;">Firma Beneficiario 1:<br/><br/><br/>________________________</td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 10px;">Firma Beneficiario 2:<br/><br/><br/>________________________</td>
<td style="border: 1px solid #ccc; padding: 10px;">Firma Beneficiario 3:<br/><br/><br/>________________________</td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 10px;">Firma Beneficiario 4:<br/><br/><br/>________________________</td>
<td style="border: 1px solid #ccc; padding: 10px;">Firma Beneficiario 5:<br/><br/><br/>________________________</td>
</tr>
<tr>
<td style="border: 1px solid #ccc; padding: 10px;">Firma Beneficiario 6:<br/><br/><br/>________________________</td>
<td style="border: 1px solid #ccc; padding: 10px;">Firma Padre/Madre o Responsable:<br/><br/><br/>________________________</td>
</tr>
<tr>
<td colspan="2" style="border: 1px solid #ccc; padding: 10px;">Fecha: {{fecha_actual}} &nbsp;&nbsp;&nbsp;&nbsp; Aclaración: ________________________</td>
</tr>
</table>

</div>'
WHERE id = '784e7d0e-8001-48a6-a44d-945722293fc4';