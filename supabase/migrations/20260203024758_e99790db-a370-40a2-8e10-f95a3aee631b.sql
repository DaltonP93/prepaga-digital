-- Crear empresa inicial
INSERT INTO public.companies (id, name, email, phone, is_active)
VALUES (
  gen_random_uuid(),
  'Prepaga Digital',
  'admin@prepagadigital.com',
  '+54 11 1234-5678',
  true
);

-- Insertar país Argentina
INSERT INTO public.countries (id, name, code, phone_code)
VALUES (gen_random_uuid(), 'Argentina', 'AR', '+54')
ON CONFLICT DO NOTHING;