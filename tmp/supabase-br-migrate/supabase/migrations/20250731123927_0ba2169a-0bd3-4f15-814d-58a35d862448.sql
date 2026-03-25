
-- Fix the generate_request_number function security issue by setting search_path
CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  daily_sequence integer;
BEGIN
  IF NEW.request_number IS NULL THEN
    -- Get the next sequential number for the day
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 'REQ-[0-9]{8}-([0-9]{4})') AS INTEGER)), 0) + 1
    INTO daily_sequence
    FROM public.sales 
    WHERE request_number LIKE 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';
    
    -- If no records for the day, start from 1
    IF daily_sequence IS NULL THEN
      daily_sequence := 1;
    END IF;
    
    NEW.request_number := 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(daily_sequence::text, 4, '0');
  END IF;
  
  -- Generate contract number if not provided
  IF NEW.contract_number IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 'CON-[0-9]{6}-([0-9]{4})') AS INTEGER)), 0) + 1
    INTO daily_sequence
    FROM public.sales 
    WHERE contract_number LIKE 'CON-' || TO_CHAR(NOW(), 'YYYYMM') || '-%';
    
    IF daily_sequence IS NULL THEN
      daily_sequence := 1;
    END IF;
    
    NEW.contract_number := 'CON-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(daily_sequence::text, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$function$
