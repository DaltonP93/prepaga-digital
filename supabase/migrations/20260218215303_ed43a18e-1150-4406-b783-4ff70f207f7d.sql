UPDATE templates SET content = '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
<h2 style="margin: 0;">SAMAP - Medicina Prepaga</h2>
<h3 style="margin: 5px 0;">SANATORIO ADVENTISTA</h3>
<h1 style="margin: 10px 0; font-size: 22px;">DECLARACIÓN JURADA DE SALUD</h1>
</div>

<p>Yo, <strong>{{titular_nombre}}</strong>, Cédula de Identidad N.º <strong>{{titular_dni}}</strong>, declaro bajo juramento que la información consignada es veraz, completa y correcta, asumiendo plena responsabilidad por la misma.</p>

<h3 style="margin-top: 25px;">Datos Biométricos</h3>
<p><strong>Peso:</strong> {{respuestas.ddjj_peso}} kg &nbsp;&nbsp; <strong>Estatura:</strong> {{respuestas.ddjj_altura}} cm</p>

<h3 style="margin-top: 25px;">Preguntas de Salud</h3>

<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
<tr style="background: #f0f0f0;"><th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Pregunta</th><th style="border: 1px solid #ccc; padding: 8px;">Respuesta</th></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">1. ¿Padece alguna enfermedad crónica?</td><td style="border: 1px solid #ccc; padding: 8px;">{{respuestas.ddjj_pregunta_1}}</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">2. ¿Padece enfermedad mental o neurológica?</td><td style="border: 1px solid #ccc; padding: 8px;">{{respuestas.ddjj_pregunta_2}}</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">3. ¿Padece enfermedad cardiovascular o coronaria?</td><td style="border: 1px solid #ccc; padding: 8px;">{{respuestas.ddjj_pregunta_3}}</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">4. ¿Quistes, tumores o enfermedades oncológicas?</td><td style="border: 1px solid #ccc; padding: 8px;">{{respuestas.ddjj_pregunta_4}}</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">5. ¿Ha sido internado/a o sometido/a a cirugía?</td><td style="border: 1px solid #ccc; padding: 8px;">{{respuestas.ddjj_pregunta_5}}</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">6. ¿Consume medicamentos o tratamientos?</td><td style="border: 1px solid #ccc; padding: 8px;">{{respuestas.ddjj_pregunta_6}}</td></tr>
<tr><td style="border: 1px solid #ccc; padding: 8px;">7. Otras enfermedades o condiciones</td><td style="border: 1px solid #ccc; padding: 8px;">{{respuestas.ddjj_pregunta_7}}</td></tr>
</table>

<p><strong>Hábitos:</strong> Fuma: {{respuestas.ddjj_fuma}} | Vapea: {{respuestas.ddjj_vapea}} | Alcohol: {{respuestas.ddjj_alcohol}}</p>

<p><strong>Última menstruación/embarazo:</strong> {{respuestas.ddjj_menstruacion}}</p>

<p style="margin-top: 20px; font-style: italic;">Declaro que los datos precedentes son fieles a la verdad y me comprometo a informar cualquier modificación en mi estado de salud.</p>

<div style="margin-top: 40px; display: flex; justify-content: space-between;">
<div style="text-align: center; width: 45%;"><div style="border-top: 1px solid #333; padding-top: 5px;">Firma</div></div>
<div style="text-align: center; width: 45%;"><div style="border-top: 1px solid #333; padding-top: 5px;">Aclaración - C.I. N.º</div></div>
</div>

<div style="margin-top: 30px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
Avda. Pettirossi 380 Tel: (021) 219 6700 www.samap.com.py
</div>
</div>' WHERE id = '784e7d0e-8001-48a6-a44d-945722293fc4';
