
-- Add amount column to beneficiaries table
ALTER TABLE beneficiaries 
ADD COLUMN amount numeric DEFAULT 0;
