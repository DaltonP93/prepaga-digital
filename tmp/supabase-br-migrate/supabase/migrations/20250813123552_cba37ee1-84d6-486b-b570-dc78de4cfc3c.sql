
-- Primero, verificar el estado actual del tipo sale_status
SELECT t.typname AS enum_type, e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname = 'sale_status'
ORDER BY e.enumsortorder;

-- Actualizar el tipo sale_status para incluir los valores faltantes
DO $$
BEGIN
    -- Verificar si el tipo existe
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_status') THEN
        -- Añadir valores que faltan si no existen
        BEGIN
            ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'pendiente';
        EXCEPTION WHEN duplicate_object THEN 
            NULL;
        END;
        
        BEGIN
            ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'en_auditoria';
        EXCEPTION WHEN duplicate_object THEN 
            NULL;
        END;
    ELSE
        -- Si el tipo no existe, crearlo con todos los valores
        CREATE TYPE sale_status AS ENUM (
            'borrador', 
            'pendiente', 
            'enviado', 
            'firmado', 
            'completado', 
            'cancelado', 
            'en_auditoria'
        );
    END IF;
END
$$;

-- Actualizar la columna status en la tabla sales para usar el tipo correcto
ALTER TABLE public.sales ALTER COLUMN status TYPE sale_status USING status::sale_status;
