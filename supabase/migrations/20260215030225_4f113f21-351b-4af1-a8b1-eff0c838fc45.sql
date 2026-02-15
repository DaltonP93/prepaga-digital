
-- Insert DDJJ health questions as template_questions for the "Declaración Jurada de Salud" template
INSERT INTO public.template_questions (template_id, question_text, question_type, is_required, sort_order, placeholder_name) VALUES
('784e7d0e-8001-48a6-a44d-945722293fc4', '¿Padece alguna enfermedad crónica (diabetes, hipertensión, asma, EPOC, reumatológicas, tiroideas, insuficiencia renal u otras)?', 'yes_no_detail', true, 1, 'ddjj_pregunta_1'),
('784e7d0e-8001-48a6-a44d-945722293fc4', '¿Padece o ha padecido alguna enfermedad o trastorno mental o neurológico (ansiedad, depresión, convulsiones u otros)?', 'yes_no_detail', true, 2, 'ddjj_pregunta_2'),
('784e7d0e-8001-48a6-a44d-945722293fc4', '¿Padece o ha padecido enfermedad cardiovascular o coronaria, o se ha sometido a procedimientos (marcapasos, bypass, cateterismo, etc.)?', 'yes_no_detail', true, 3, 'ddjj_pregunta_3'),
('784e7d0e-8001-48a6-a44d-945722293fc4', '¿Posee o ha poseído quistes, tumores o enfermedades oncológicas que hayan requerido cirugía, quimioterapia o radioterapia?', 'yes_no_detail', true, 4, 'ddjj_pregunta_4'),
('784e7d0e-8001-48a6-a44d-945722293fc4', '¿Ha sido internado/a o sometido/a a alguna cirugía?', 'yes_no_detail', true, 5, 'ddjj_pregunta_5'),
('784e7d0e-8001-48a6-a44d-945722293fc4', '¿Consume medicamentos, sustancias o se somete a tratamientos, de origen médico, natural o experimental?', 'yes_no_detail', true, 6, 'ddjj_pregunta_6'),
('784e7d0e-8001-48a6-a44d-945722293fc4', 'Otras enfermedades o condiciones no mencionadas', 'yes_no_detail', true, 7, 'ddjj_pregunta_7'),
('784e7d0e-8001-48a6-a44d-945722293fc4', 'Peso (kg)', 'text', false, 8, 'ddjj_peso'),
('784e7d0e-8001-48a6-a44d-945722293fc4', 'Estatura (cm)', 'text', false, 9, 'ddjj_altura'),
('784e7d0e-8001-48a6-a44d-945722293fc4', 'Fuma', 'boolean', false, 10, 'ddjj_fuma'),
('784e7d0e-8001-48a6-a44d-945722293fc4', 'Vapea', 'boolean', false, 11, 'ddjj_vapea'),
('784e7d0e-8001-48a6-a44d-945722293fc4', 'Consume bebidas alcohólicas', 'boolean', false, 12, 'ddjj_alcohol'),
('784e7d0e-8001-48a6-a44d-945722293fc4', 'Última menstruación/embarazo', 'text', false, 13, 'ddjj_menstruacion');
