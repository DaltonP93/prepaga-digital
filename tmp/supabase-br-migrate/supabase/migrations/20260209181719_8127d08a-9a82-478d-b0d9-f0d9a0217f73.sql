-- Update default currency settings to Guaraníes
ALTER TABLE public.company_currency_settings 
  ALTER COLUMN currency_code SET DEFAULT 'PYG',
  ALTER COLUMN currency_symbol SET DEFAULT 'Gs.',
  ALTER COLUMN decimal_places SET DEFAULT 0,
  ALTER COLUMN thousand_separator SET DEFAULT '.',
  ALTER COLUMN decimal_separator SET DEFAULT ',';

-- Update existing records to Guaraníes
UPDATE public.company_currency_settings 
SET currency_code = 'PYG', 
    currency_symbol = 'Gs.', 
    decimal_places = 0, 
    thousand_separator = '.', 
    decimal_separator = ','
WHERE currency_code = 'ARS' OR currency_symbol = '$';

-- Update the DDJJ Salud template with the new DECLARACION JURADA 2026 content
UPDATE public.templates 
SET content = '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
<h2 style="margin: 0;">SAMAP - Medicina Prepaga</h2>
<h3 style="margin: 5px 0;">SANATORIO ADVENTISTA</h3>
<h1 style="margin: 10px 0; font-size: 22px;">DECLARACIÓN JURADA DE SALUD</h1>
</div>

<p>Yo, <strong>{{titular_nombre}}</strong>, Cédula de Identidad N.º <strong>{{titular_dni}}</strong>, declaro bajo juramento que la información consignada es veraz, completa y correcta, asumiendo plena responsabilidad por la misma.</p>

<h3 style="margin-top: 25px;">Preguntas de Salud</h3>

<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
<tr style="background: #f0f0f0;"><th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Pregunta</th><th style="border: 1px solid #ccc; padding: 8px; width: 60px;">SÍ</th><th style="border: 1px solid #ccc; padding: 8px; width: 60px;">NO</th><th style="border: 1px solid #ccc; padding: 8px;">Especificar</th></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">1. ¿Padece alguna enfermedad crónica (diabetes, hipertensión, asma, EPOC, reumatológicas, tiroideas, insuficiencia renal u otras)?</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px;">_______________</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">2. ¿Padece o ha padecido alguna enfermedad o trastorno mental o neurológico (ansiedad, depresión, convulsiones u otros)?</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px;">_______________</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">3. ¿Padece o ha padecido enfermedad cardiovascular o coronaria, o se ha sometido a procedimientos (marcapasos, bypass, cateterismo, etc.)?</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px;">_______________</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">4. ¿Posee o ha poseído quistes, tumores o enfermedades oncológicas que hayan requerido cirugía, quimioterapia o radioterapia?</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px;">_______________</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">5. ¿Ha sido internado/a o sometido/a a alguna cirugía?</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px;">_______________</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">6. ¿Consume medicamentos, sustancias o se somete a tratamientos, de origen médico, natural o experimental?</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 8px;">_______________</td></tr>
</table>

<p><strong>Hábitos:</strong> ☐ Fuma &nbsp; ☐ Vapea &nbsp; ☐ Consume bebidas alcohólicas</p>

<p><strong>Fecha de última menstruación o embarazo (si corresponde):</strong> ______________________</p>

<p><strong>Otras enfermedades o condiciones no mencionadas:</strong> ______________________________</p>

<p><strong>Peso:</strong> __________ kg &nbsp;&nbsp; <strong>Estatura:</strong> __________ cm</p>

<p style="margin-top: 20px; font-style: italic;">Declaro que los datos precedentes son fieles a la verdad y me comprometo a informar cualquier modificación en mi estado de salud.</p>

<div style="margin-top: 40px; display: flex; justify-content: space-between;">
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #333; padding-top: 5px;">Firma</div>
</div>
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #333; padding-top: 5px;">Aclaración - C.I. N.º</div>
</div>
</div>

<div style="margin-top: 30px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
Avda. Pettirossi 380 Tel: (021) 219 6700 www.samap.com.py
</div>
</div>'
WHERE name ILIKE '%Declaraci_n Jurada de Salud%' AND name NOT ILIKE '%DDJJ Salud%';

-- Also update the DDJJ Salud template
UPDATE public.templates 
SET content = '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
<h2 style="margin: 0;">SAMAP - Medicina Prepaga</h2>
<h3 style="margin: 5px 0;">SANATORIO ADVENTISTA</h3>
<h1 style="margin: 10px 0; font-size: 22px;">DECLARACIÓN JURADA DE SALUD</h1>
</div>

<p>Yo, <strong>{{titular_nombre}}</strong>, Cédula de Identidad N.º <strong>{{titular_dni}}</strong>, declaro bajo juramento que la información consignada es veraz, completa y correcta, asumiendo plena responsabilidad por la misma.</p>

{{#beneficiarios}}
<h3 style="background: #f0f0f0; padding: 8px; margin-top: 20px;">{{nombre}} {{apellido}} - {{parentesco}} (C.I.: {{dni}})</h3>

<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
<tr style="background: #e8e8e8;"><th style="border: 1px solid #ccc; padding: 6px; text-align: left;">Pregunta</th><th style="border: 1px solid #ccc; padding: 6px; width: 50px;">SÍ</th><th style="border: 1px solid #ccc; padding: 6px; width: 50px;">NO</th><th style="border: 1px solid #ccc; padding: 6px;">Detalle</th></tr>
<tr><td style="border: 1px solid #ccc; padding: 6px; font-size: 12px;">1. Enfermedad crónica</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px;">_______</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 6px; font-size: 12px;">2. Trastorno mental/neurológico</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px;">_______</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 6px; font-size: 12px;">3. Enfermedad cardiovascular</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px;">_______</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 6px; font-size: 12px;">4. Oncológicas</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px;">_______</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 6px; font-size: 12px;">5. Internaciones/Cirugías</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px;">_______</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 6px; font-size: 12px;">6. Medicamentos/Tratamientos</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">☐</td><td style="border: 1px solid #ccc; padding: 6px;">_______</td></tr>
</table>
<p style="font-size: 12px;"><strong>Peso:</strong> ______ kg &nbsp; <strong>Estatura:</strong> ______ cm</p>
{{/beneficiarios}}

<p style="margin-top: 20px; font-style: italic; font-size: 12px;">Declaro que los datos precedentes son fieles a la verdad y me comprometo a informar cualquier modificación en mi estado de salud.</p>

<div style="margin-top: 40px; display: flex; justify-content: space-between;">
<div style="text-align: center; width: 45%;"><div style="border-top: 1px solid #333; padding-top: 5px;">Firma</div></div>
<div style="text-align: center; width: 45%;"><div style="border-top: 1px solid #333; padding-top: 5px;">Aclaración - C.I. N.º</div></div>
</div>

<div style="margin-top: 20px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
Avda. Pettirossi 380 Tel: (021) 219 6700 www.samap.com.py
</div>
</div>'
WHERE name ILIKE '%DDJJ Salud%';