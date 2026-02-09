-- Fix RLS: Allow admins and gestors to manage sale_documents (not just salesperson)
DROP POLICY IF EXISTS "Users can manage sale docs" ON public.sale_documents;

CREATE POLICY "Users can manage sale docs" 
ON public.sale_documents 
FOR ALL 
TO authenticated
USING (
  sale_id IN (
    SELECT sales.id FROM sales 
    WHERE sales.salesperson_id = auth.uid()
       OR has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'super_admin'::app_role)
       OR has_role(auth.uid(), 'gestor'::app_role)
  )
)
WITH CHECK (
  sale_id IN (
    SELECT sales.id FROM sales 
    WHERE sales.salesperson_id = auth.uid()
       OR has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'super_admin'::app_role)
       OR has_role(auth.uid(), 'gestor'::app_role)
  )
);

-- Also update the Contrato template content
UPDATE templates SET content = '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; font-size: 12px; line-height: 1.5;">

<div style="text-align: center; margin-bottom: 20px;">
<h3 style="margin: 0;">SAMAP</h3>
<p style="margin: 2px 0; font-size: 11px;">MEDICINA PREPAGA</p>
<p style="margin: 2px 0; font-size: 11px;">SANATORIO ADVENTISTA</p>
</div>

<h2 style="text-align: center; font-size: 14px; margin-bottom: 15px;">CONTRATO DE COBERTURA DE SERVICIOS DE SALUD A TRAVÉS DEL SISTEMA PREPAGO</h2>

<p>Por una parte, <strong>SAMAP</strong>, departamento de Medicina Prepaga del Sanatorio Adventista de Asunción, cuyo ente propietario es la Asociación Paraguaya de los Adventistas del Séptimo Día, con RUC N° 80009734-3 representado en este acto por el Lic. Eder Arguello González con C.I. N° 3.616.083. El domicilio legal del Sanatorio Adventista y SAMAP es en la calle Pettirossi Nº 380 de la Ciudad de Asunción, denominados en este contrato como la <strong>CONTRATADA</strong> y por otra parte el/la Sr/a <strong>{{titular_nombre}}</strong> con C.I. Nº <strong>{{titular_dni}}</strong> y con domicilio real en la calle <strong>{{titular_direccion}}</strong> del Barrio ________________________ de la Ciudad de <strong>{{titular_ciudad}}</strong> denominado de aquí en adelante el <strong>CONTRATANTE</strong>.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CONSIDERACIONES PRELIMINARES</h3>

<p>a). - Las partes declaran bajo fe de juramento, que los datos personales y las direcciones denunciadas en el presente contrato de Prestación de Servicios de Salud a través del sistema prepago se ajustan a la verdad, son reales y en caso de variar con el tiempo, las partes se obligan a comunicar al otro de dicho cambio en un lapso no mayor de tres (3) días, y de no hacerlo así, seguirá como válida para todos los efectos, el ultimo domicilio denunciado.</p>

<p>b). - En caso de incurrir en falsas informaciones se tendrá por valido el domicilio denunciado. Se agrega al presente contrato todas las documentaciones requeridas por SAMAP, y que forman parte del mismo cuerpo contractual.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA I - DEL OBJETO</h3>

<p>Este contrato tiene como objeto reglamentar la prestación de los siguientes servicios de salud a través del sistema prepago, por eventos aleatorios de salud: consultas médicas, estudios para aclaración de diagnóstico, internaciones sanatoriales para cirugía y tratamiento clínico, eventos de maternidad, traslado en ambulancia, tratamiento fisioterapéutico, terapia intensiva. Las coberturas, los límites de utilización y las carencias (antigüedad) de tiempo, están descritos en los anexos que acompañan a este contrato y que forman parte integrante del mismo, de acuerdo con el plan elegido. Los servicios que no estén explícitamente incluidos en este contrato y en los anexos, no están amparados por el mismo.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA II - DE LA ELECCIÓN DE LOS PLANES DE SALUD</h3>

<p>La Contratada pone a elección del Contratante los diversos planes de Prestación de Servicios de Salud a Través del Sistema Prepago, y este según su conveniencia selecciona en este acto el plan que más se adecua a sus necesidades, en forma libre, voluntaria y selectiva. La contratada evacuará todas las consultas sobre el alcance, servicios y cobertura que por derecho le corresponde al asegurado, y por su parte el contratante proveerá de toda información requerida sobre su estado de salud.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA III - DE LOS ADHERENTES</h3>

<p>El CONTRATANTE puede incluir en este contrato a su grupo familiar, como también a otras personas que considere conveniente, bajo la denominación de adherentes, siempre y cuando asuma la responsabilidad de abonar en único pago por mes adelantado la cuota mensual de su grupo. Los datos personales del CONTRATANTE y sus adherentes se detallan en este contrato, por lo tanto, los adherentes se rigen bajo las mismas condiciones emanadas de este contrato. Aquellos adherentes incluidos en fecha posterior a la firma de este contrato deberán cumplir con las carencias requeridas de acuerdo con su fecha efectiva de ingreso y de acuerdo con el plan elegido. Los recién nacidos deben ser incluidos por el CONTRATANTE en el plan seleccionado dentro de los ocho días de su nacimiento para gozar de vigencia inmediata.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA IV - DE LA VIGENCIA DE LAS PRESTACIONES MÉDICAS</h3>

<p>La CONTRATADA otorgará vigencia de las coberturas de acuerdo con las carencias (antigüedad) y condiciones generales detalladas en este contrato y sus anexos según el plan elegido. EL CONTRATANTE podrá usufructuar los beneficios del plan elegido con las limitaciones establecidas en este contrato y sus anexos, una vez finalizado todos los trámites administrativos de verificación, carga de datos, documentos y realizar el primer pago del plan elegido.</p>

<p>Solo la CONTRATADA podrá otorgar vigencia inmediata en los planes de cobertura de Medicina Prepaga ofrecidos sin necesidad de requerir carencias, cuando constituyan situaciones excepcionales a criterio de la CONTRATADA y reciban la autorización fehaciente de la misma. En ningún caso la vigencia inmediata contemplara internaciones, cirugías o procedimientos de cuadros preexistentes a la firma del contrato o la inclusión al mismo.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA V - DE LOS DEBERES DE LA CONTRATADA</h3>

<p>01.- La CONTRATADA entregará las credenciales al CONTRATANTE y sus adherentes y estas serán necesarias su presentación ante la contratada y sus prestadores de salud para la utilización y goce de servicios según su plan.</p>
<p>02.- La CONTRATADA deberá autorizar en todos los casos los servicios cubiertos para garantizar el acceso efectivo, oportuno y de calidad a los servicios médicos incluidos en el plan contratado.</p>
<p>03.- La CONTRATADA es quien proveerá al CONTRATANTE la nómina de médicos, centros de atención y demás profesionales de la salud incluidos como prestadores dentro del servicio de Medicina Prepaga.</p>
<p>04.- La inclusión o exclusión de prestadores serán a cargo exclusivo de la CONTRATADA.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA VI - DE LOS DERECHOS DE LA CONTRATADA</h3>

<p>01.- La CONTRATADA se reserva el derecho de solicitar un chequeo pre-admisional al CONTRATANTE y sus adherentes.</p>
<p>02.- La CONTRATADA se reserva el derecho de no aceptar la solicitud de ingreso de los interesados, sin necesidad de emitir justificación.</p>
<p>03.- La CONTRATADA suspenderá en forma inmediata y automática los beneficios ante el atraso en el pago de la cuota mensual.</p>
<p>04.- La CONTRATADA tiene derecho a recibir el monto total de la cuota pactada en tiempo y forma.</p>
<p>05.- La CONTRATADA se reserva el derecho de establecer los términos y condiciones del presente contrato.</p>
<p>06.- La CONTRATADA se reserva el derecho de revisar la veracidad de la información proporcionada por el CONTRATANTE.</p>
<p>07.- La CONTRATADA no otorgará cobertura de eventos expresamente excluidos en la cláusula N° IX.</p>
<p>08.- La CONTRATADA se reserva el derecho de dar por finalizado de forma unilateral el presente contrato ante el incumplimiento de cualquiera de sus cláusulas.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA VII - DE LOS DERECHOS Y OBLIGACIONES DEL CONTRATANTE</h3>

<h4 style="font-size: 12px;">Derechos</h4>
<p>01.- El CONTRATANTE y sus adherentes tienen derecho de hacer uso de todos los beneficios ofrecidos de acuerdo con el plan contratado.</p>
<p>02.- Derecho a ser informados de manera clara y suficiente sobre los alcances del plan de salud contratado.</p>
<p>03.- Derecho a que su información médica y personal sea tratada con reserva y confidencialidad.</p>
<p>04.- Derecho a recibir un trato digno y respetuoso, sin discriminación ni maltrato.</p>
<p>05.- Derecho a presentar peticiones, quejas y reclamos ante errores en la atención.</p>

<h4 style="font-size: 12px;">Obligaciones</h4>
<p>01.- Suministrar información veraz sobre antecedentes médicos y condiciones de salud.</p>
<p>02.- Usar adecuadamente las coberturas otorgadas por el plan elegido.</p>
<p>03.- Mantenerse al día con el pago de sus cuotas. El atraso por más de treinta días dará derecho a la CONTRATADA a suspender todos los servicios.</p>
<p>04.- El CONTRATANTE que llegue a adeudar 12 cuotas consecutivas, dará derecho a la CONTRATADA a rescindir este contrato.</p>
<p>05.- El CONTRATANTE y sus adherentes no están autorizados a otorgar el uso de las credenciales a personas no adheridas al contrato.</p>
<p>06.- Mantener un trato cordial y de respeto mutuo con los prestadores de servicios.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA VIII - DE LOS PLANES</h3>

<p>La CONTRATADA ha diseñado diferentes Planes de cobertura de salud. Las coberturas, exclusiones, tiempo de carencia y límites de utilización están detallados en los anexos de cada Plan. Si el CONTRATANTE desea cambiar el plan, se reconocerá la antigüedad para los servicios contemplados en su plan anterior.</p>
<p><em>Aclaración I:</em> Las coberturas no utilizadas dentro del año no son transferibles ni acumulables al año siguiente.</p>
<p><em>Aclaración II:</em> LA CONTRATADA podrá implementar el régimen de Copago para algunos prestadores y/o servicios.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA IX - DE LAS EXCLUSIONES</h3>

<p>Están excluidos de la cobertura del presente contrato los siguientes tratamientos y enfermedades:</p>
<ol style="font-size: 11px;">
<li>Enfermedades infectocontagiosas.</li>
<li>Enfermedades de origen genético u congénito y/o sus consecuencias.</li>
<li>Enfermedades mentales de cualquier origen. Tratamiento psicológico, psiquiátrico, consultas e internaciones.</li>
<li>Enfermedades crónicas conocidas o no por el beneficiario y/o sus consecuencias.</li>
<li>Traumatismos causados por la práctica de deportes de alto riesgo, guerras, violencia.</li>
<li>Tentativas de suicidio y sus consecuencias, abuso de estupefacientes.</li>
<li>Cirugía odonto-traumatológica o buco maxilofacial y tratamientos odontológicos.</li>
<li>Medicina nuclear. Utilización de rayos láser (excepto lo establecido en Anexo).</li>
<li>Trasplantes, implantes, injertos de cualquier índole.</li>
<li>Diálisis aguda o crónica.</li>
<li>Síndrome de Inmunodeficiencia Adquirida y sus consecuencias (SIDA).</li>
<li>Internación clínica para tratamiento cardiovascular (excepto Anexo).</li>
<li>Cirugía oftalmológica (excepto Anexo).</li>
<li>Biopsias por congelación o extemporáneas (excepto Anexo).</li>
<li>Accidentes cerebro vasculares y/o sus consecuencias.</li>
<li>Neurocirugía, Cirugía especializada de mano, hernia de disco, cirugía de columna.</li>
<li>Tratamiento para cualquier tipo de adicciones.</li>
<li>Epidemias, endemias y pandemias.</li>
<li>Quemaduras de segundo o tercer grado.</li>
<li>Enfermedades preexistentes a la firma de este contrato.</li>
<li>Internaciones no justificadas médicamente.</li>
<li>Tratamientos de enfermedades de alta complejidad médica.</li>
<li>Reintervenciones relacionadas con complicaciones del evento originario.</li>
<li>Enfermedades venéreas o de transmisión sexual.</li>
<li>Recargo de honorarios médicos por atención fuera del horario.</li>
<li>Exanguineo transfusión.</li>
<li>Tratamientos estéticos.</li>
<li>Medicina alternativa, homeopatía, acupuntura, métodos de anticoncepción.</li>
<li>Terapia intensiva para recién nacidos (excepto Anexo).</li>
<li>Honorarios de profesionales que no pertenecen al plantel de la CONTRATADA.</li>
<li>Vacunas, prótesis, aparatos ortopédicos, sangre y/o derivados, anteojos, lentes.</li>
<li>Oxígeno, Bomba Infusora, Colchón de Aire, Video laparoscopio, Microscopio (excepto Anexo).</li>
<li>Lesiones en accidente de tránsito en transgresión a las leyes vigentes.</li>
<li>Test alérgico o cualquier tratamiento especializado en alergia.</li>
<li>Tratamientos dietéticos, trastornos de la alimentación.</li>
<li>Enfermedades neoplásicas y sus tratamientos.</li>
<li>Secuelas de tratamientos derivados de afecciones previas al ingreso.</li>
<li>Prolongación de internaciones sin justificación clínica.</li>
<li>Pacientes en estado de descerebración (Glasgow 4 o menos).</li>
<li>Habitación para familiares mientras el paciente esté en terapia intensiva.</li>
<li>Gastos de eventos quirúrgicos sin cobertura original.</li>
<li>Cobertura de eventos cuando el titular se encuentre en estado etílico.</li>
<li>Enfermedades respiratorias relacionadas al tabaco o dispositivos electrónicos.</li>
<li>Atención en el extranjero.</li>
<li>Tratamiento médico experimental.</li>
<li>Enfermedades o lesiones relacionadas al trabajo con seguro de IPS.</li>
</ol>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA X - DE LA UTILIZACIÓN DE LOS SERVICIOS</h3>

<p>Cuando el CONTRATANTE y/o sus adherentes requieran de atención médica, deben dirigirse al Sanatorio Adventista de Asunción o centros autorizados, presentando credenciales y documento de identidad. La validez de las autorizaciones será de treinta (30) días.</p>

<p>El servicio de ambulancia está habilitado para urgencias y emergencias en: Asunción, Lambaré, Villa Elisa, Ñemby, Fernando de la Mora, San Lorenzo, Luque y Mariano Roque Alonso.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA XI - DE OTRAS COBERTURAS ADICIONALES</h3>

<p><strong>01 - ODONTOLOGÍA:</strong> El CONTRATANTE podrá acceder a un seguro odontológico adicional.</p>
<p><strong>02 - ASISTENCIA AL VIAJERO:</strong> Seguro opcional con 72 Hs de anticipación mínima.</p>
<p><strong>03 - REINTEGRO:</strong> Atenciones de urgencia en lugares sin prestadores habilitados podrán ser reembolsadas con aranceles internos.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA XII - DE LAS RESPONSABILIDADES PROFESIONALES</h3>

<p>La CONTRATADA es solamente la administradora de coberturas de servicios. Todo error, negligencia, imprudencia, impericia o "mala praxis" de los profesionales de la salud es de entera responsabilidad de estos.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA XIII - DE LA RENOVACIÓN</h3>

<p>La vigencia de este contrato es por tiempo indefinido, a partir del <strong>{{fecha_actual}}</strong>. Podrá ser rescindido por el CONTRATANTE según las siguientes condiciones:</p>
<ol>
<li>Contratos menores a 12 meses: al día con pagos + 2 cuotas de cláusula punitiva.</li>
<li>Contratos de 12 a 24 meses: al día con pagos + 1 cuota de cláusula punitiva.</li>
<li>Contratos mayores a 24 meses: solo requisito de estar al día con pagos.</li>
</ol>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA XIV - REAJUSTE DE PRECIOS</h3>

<p>El valor de las cuotas podrá sufrir modificaciones en base a: A) Costo de servicios utilizados. B) Aumento de aranceles. C) Inflación según datos del B.C.P. El incremento será comunicado con treinta días de antelación.</p>

<h3 style="font-size: 13px; margin-top: 20px;">CLÁUSULA XV - DE LOS ALCANCES DEL CONTRATO</h3>

<p>El CONTRATANTE manifiesta que comprende el contenido, alcance, límites, exclusiones y obligaciones del seguro contratado, y que presta su consentimiento de manera libre, voluntaria e informada. Las partes se comprometen a agotar de buena fe todas las vías amistosas antes de iniciar acciones judiciales. En caso de no avenir a un acuerdo, las partes se someterán a la justicia ordinaria de los tribunales de la Capital de la República del Paraguay.</p>

<h3 style="font-size: 13px; margin-top: 20px;">BENEFICIARIOS</h3>

<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
<thead>
<tr style="background-color: #f0f0f0;">
<th style="border: 1px solid #333; padding: 5px;">N°</th>
<th style="border: 1px solid #333; padding: 5px;">NOMBRES Y APELLIDOS</th>
<th style="border: 1px solid #333; padding: 5px;">FECHA NAC.</th>
<th style="border: 1px solid #333; padding: 5px;">EDAD</th>
<th style="border: 1px solid #333; padding: 5px;">C.I. N°</th>
<th style="border: 1px solid #333; padding: 5px;">SEXO</th>
<th style="border: 1px solid #333; padding: 5px;">CUOTA</th>
<th style="border: 1px solid #333; padding: 5px;">V.I.</th>
<th style="border: 1px solid #333; padding: 5px;">TIPO</th>
</tr>
</thead>
<tbody>
{{#beneficiarios}}
<tr>
<td style="border: 1px solid #333; padding: 5px; text-align: center;">{{_index}}</td>
<td style="border: 1px solid #333; padding: 5px;">{{first_name}} {{last_name}}</td>
<td style="border: 1px solid #333; padding: 5px; text-align: center;">{{birth_date}}</td>
<td style="border: 1px solid #333; padding: 5px; text-align: center;">______</td>
<td style="border: 1px solid #333; padding: 5px; text-align: center;">{{dni}}</td>
<td style="border: 1px solid #333; padding: 5px; text-align: center;">{{gender}}</td>
<td style="border: 1px solid #333; padding: 5px; text-align: center;">{{amount}}</td>
<td style="border: 1px solid #333; padding: 5px; text-align: center;">______</td>
<td style="border: 1px solid #333; padding: 5px; text-align: center;">{{relationship}}</td>
</tr>
{{/beneficiarios}}
<tr style="font-weight: bold;">
<td colspan="6" style="border: 1px solid #333; padding: 5px; text-align: right;">TOTAL:</td>
<td style="border: 1px solid #333; padding: 5px; text-align: center;">{{monto_total}}</td>
<td colspan="2" style="border: 1px solid #333; padding: 5px;"></td>
</tr>
</tbody>
</table>

<h3 style="font-size: 13px; margin-top: 20px;">DATOS DE FACTURACIÓN</h3>

<p>Razón Social: ________________________________________</p>
<p>R.U.C: ________________________________________</p>
<p>Correo electrónico: <strong>{{titular_email}}</strong></p>
<p>Celular: <strong>{{titular_telefono}}</strong></p>

<div style="margin-top: 40px; display: flex; justify-content: space-between;">
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #000; padding-top: 5px;">
<p><strong>CONTRATANTE</strong></p>
<p>{{titular_nombre}}</p>
<p>C.I. N°: {{titular_dni}}</p>
</div>
</div>
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #000; padding-top: 5px;">
<p><strong>CONTRATADA</strong></p>
<p>SAMAP</p>
<p>C.I. N°: 3.616.083</p>
</div>
</div>
</div>

<div style="text-align: center; margin-top: 20px; font-size: 10px; color: #666;">
<p>Avda. Pettirossi 380 | Tel: (021) 219 6700 | www.samap.com.py</p>
</div>

</div>'
WHERE id = 'f66ef9fe-79e1-416e-88ae-304066126037';