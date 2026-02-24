
-- Fix template save: make the version trigger SECURITY DEFINER so it can INSERT into template_versions
CREATE OR REPLACE FUNCTION public.create_template_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF OLD.content IS DISTINCT FROM NEW.content THEN
        INSERT INTO public.template_versions (template_id, version_number, content, created_by)
        VALUES (NEW.id, NEW.version, OLD.content, NEW.created_by);
        NEW.version = NEW.version + 1;
    END IF;
    RETURN NEW;
END;
$function$;
