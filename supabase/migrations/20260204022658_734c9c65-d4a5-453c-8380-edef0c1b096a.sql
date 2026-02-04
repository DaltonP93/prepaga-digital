-- Agregar columnas a beneficiaries para gestión completa de adherentes
ALTER TABLE beneficiaries 
ADD COLUMN IF NOT EXISTS amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS email varchar(255),
ADD COLUMN IF NOT EXISTS phone varchar(50);