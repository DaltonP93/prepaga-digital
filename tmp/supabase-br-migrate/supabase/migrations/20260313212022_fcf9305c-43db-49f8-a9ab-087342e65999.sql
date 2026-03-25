CREATE TABLE IF NOT EXISTS public._type_regen_force (
  id serial PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

DROP TABLE IF EXISTS public._type_regen_force;