


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'super_admin',
    'admin',
    'gestor',
    'vendedor',
    'supervisor',
    'auditor',
    'financiero'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."document_status" AS ENUM (
    'pendiente',
    'firmado',
    'vencido'
);


ALTER TYPE "public"."document_status" OWNER TO "postgres";


CREATE TYPE "public"."sale_status" AS ENUM (
    'borrador',
    'enviado',
    'firmado',
    'completado',
    'cancelado',
    'pendiente',
    'en_auditoria',
    'rechazado',
    'aprobado_para_templates',
    'preparando_documentos',
    'esperando_ddjj',
    'en_revision',
    'listo_para_enviar',
    'firmado_parcial',
    'expirado'
);


ALTER TYPE "public"."sale_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_advance_sale_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- When a signature link is marked as completado
  IF NEW.status = 'completado' AND (OLD.status IS NULL OR OLD.status != 'completado') THEN
    -- Check if ALL signature links for this sale are now completed
    IF public.check_all_signatures_completed(NEW.sale_id) THEN
      UPDATE public.sales
      SET 
        all_signatures_completed = true,
        signature_completed_at = NOW(),
        status = 'completado'
      WHERE id = NEW.sale_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_advance_sale_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_all_signatures_completed"("p_sale_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  total_links INTEGER;
  completed_links INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completado')
  INTO total_links, completed_links
  FROM public.signature_links
  WHERE sale_id = p_sale_id;
  
  IF total_links = 0 THEN
    RETURN false;
  END IF;
  
  RETURN total_links = completed_links;
END;
$$;


ALTER FUNCTION "public"."check_all_signatures_completed"("p_sale_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_vendedor_edit_restriction"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'vendedor'
  ) AND NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'supervisor', 'auditor', 'gestor','vendedor')
  ) THEN
    IF OLD.status != 'borrador' THEN
      RAISE EXCEPTION 'Vendedor solo puede editar ventas en estado borrador. Estado actual: %', OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_vendedor_edit_restriction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_template_version"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF OLD.content IS DISTINCT FROM NEW.content THEN
        INSERT INTO public.template_versions (template_id, version_number, content, created_by)
        VALUES (NEW.id, NEW.version, OLD.content, NEW.created_by);
        NEW.version = NEW.version + 1;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_template_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'vendedor');
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_contract_number"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  year_part TEXT;
  sequence_part TEXT;
  next_number INTEGER;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 6 FOR 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.sales
  WHERE contract_number LIKE year_part || '-%';
  
  sequence_part := LPAD(next_number::TEXT, 6, '0');
  NEW.contract_number := year_part || '-' || sequence_part;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_contract_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_otp_policy_for_signature"("p_company_id" "uuid") RETURNS TABLE("otp_length" integer, "otp_expiration_seconds" integer, "max_attempts" integer, "allowed_channels" "jsonb", "default_channel" "text", "require_otp_for_signature" boolean, "whatsapp_otp_enabled" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    otp_length,
    otp_expiration_seconds,
    max_attempts,
    allowed_channels::jsonb,
    default_channel,
    require_otp_for_signature,
    whatsapp_otp_enabled
  FROM public.company_otp_policy
  WHERE company_id = p_company_id
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_otp_policy_for_signature"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sale_id_from_signature_token"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT sale_id
  FROM public.signature_links
  WHERE token = COALESCE(
    ((current_setting('request.headers'::text, true))::json ->> 'x-signature-token'),
    ''
  )
  AND expires_at > now()
  AND status != 'revocado'
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_sale_id_from_signature_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_signature_link_id_from_token"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id
  FROM public.signature_links
  WHERE token = COALESCE(
    ((current_setting('request.headers'::text, true))::json ->> 'x-signature-token'),
    ''
  )
  AND expires_at > now()
  AND status != 'revocado'
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_signature_link_id_from_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_company_id"("_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT company_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_user_company_id"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("_user_id" "uuid") RETURNS "public"."app_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'super_admin' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'supervisor' THEN 3
      WHEN 'auditor' THEN 4
      WHEN 'gestor' THEN 5 
      WHEN 'vendedor' THEN 6 
    END
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_user_role"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_sale_total_amount"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_sale_id UUID;
  v_total NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_sale_id := OLD.sale_id;
  ELSE
    v_sale_id := NEW.sale_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM beneficiaries
  WHERE sale_id = v_sale_id;

  UPDATE sales SET total_amount = v_total WHERE id = v_sale_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."recalculate_sale_total_amount"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_titular_amount_on_save"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_adherent_sum NUMERIC;
  v_sale_total NUMERIC;
BEGIN
  IF (NEW.is_primary = true OR LOWER(NEW.relationship) = 'titular') AND (NEW.amount IS NULL OR NEW.amount = 0) THEN
    -- Get sale total
    SELECT COALESCE(s.total_amount, COALESCE(p.price, 0))
    INTO v_sale_total
    FROM sales s
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE s.id = NEW.sale_id;

    -- Sum existing adherent amounts
    SELECT COALESCE(SUM(amount), 0)
    INTO v_adherent_sum
    FROM beneficiaries
    WHERE sale_id = NEW.sale_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (is_primary = false OR is_primary IS NULL)
      AND LOWER(COALESCE(relationship, '')) != 'titular';

    NEW.amount := GREATEST(v_sale_total - v_adherent_sum, 0);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_titular_amount_on_save"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_incident_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_incident_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_workflow_config_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_workflow_config_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "sale_status_at_comment" "text",
    "audit_action" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_comments_audit_action_check" CHECK (("audit_action" = ANY (ARRAY['approve'::"text", 'reject'::"text", 'comment'::"text", 'return'::"text"])))
);


ALTER TABLE "public"."audit_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "company_id" "uuid",
    "action" character varying(100) NOT NULL,
    "entity_type" character varying(100),
    "entity_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" character varying(45),
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_processes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "auditor_id" "uuid",
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "notes" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_processes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "ip_address" character varying(45),
    "user_agent" "text",
    "success" boolean DEFAULT false,
    "failure_reason" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."auth_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."beneficiaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "dni" character varying(20),
    "birth_date" "date",
    "relationship" character varying(50),
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "amount" numeric(12,2) DEFAULT 0,
    "email" character varying(255),
    "phone" character varying(50),
    "document_type" character varying,
    "document_number" character varying,
    "gender" character varying,
    "marital_status" character varying,
    "address" "text",
    "city" character varying,
    "province" character varying,
    "postal_code" character varying,
    "occupation" character varying,
    "has_preexisting_conditions" boolean DEFAULT false,
    "preexisting_conditions_detail" "text",
    "signature_required" boolean DEFAULT true,
    "signature_link_id" "uuid",
    "barrio" character varying
);


ALTER TABLE "public"."beneficiaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."beneficiary_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "beneficiary_id" "uuid" NOT NULL,
    "document_type_id" "uuid",
    "file_name" character varying NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" character varying,
    "file_size" integer,
    "uploaded_by" "uuid",
    "upload_source" character varying DEFAULT 'vendedor'::character varying,
    "is_verified" boolean DEFAULT false,
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."beneficiary_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "email" character varying(255),
    "phone" character varying(50),
    "dni" character varying(20),
    "birth_date" "date",
    "address" "text",
    "city" character varying(100),
    "province" character varying(100),
    "country_id" "uuid",
    "postal_code" character varying(20),
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "barrio" character varying(100),
    "gender" character varying(20),
    "marital_status" character varying(30),
    CONSTRAINT "clients_gender_check" CHECK ((("gender" IS NULL) OR (("gender")::"text" = ANY ((ARRAY['Masculino'::character varying, 'Femenino'::character varying])::"text"[])))),
    CONSTRAINT "clients_marital_status_check" CHECK ((("marital_status" IS NULL) OR (("marital_status")::"text" = ANY ((ARRAY['Soltero/a'::character varying, 'Casado/a'::character varying, 'Divorciado/a'::character varying, 'Viudo/a'::character varying, 'Unión libre'::character varying])::"text"[]))))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clients"."gender" IS 'Género del cliente: Masculino | Femenino';



COMMENT ON COLUMN "public"."clients"."marital_status" IS 'Estado civil: Soltero/a | Casado/a | Divorciado/a | Viudo/a | Unión libre';



CREATE TABLE IF NOT EXISTS "public"."communication_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "sale_id" "uuid",
    "client_id" "uuid",
    "channel" character varying(50) NOT NULL,
    "direction" character varying(20) DEFAULT 'outbound'::character varying,
    "subject" character varying(255),
    "content" "text",
    "status" character varying(50) DEFAULT 'sent'::character varying,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."communication_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "logo_url" "text",
    "primary_color" character varying(7) DEFAULT '#3B82F6'::character varying,
    "secondary_color" character varying(7) DEFAULT '#1E40AF'::character varying,
    "email" character varying(255),
    "phone" character varying(50),
    "address" "text",
    "website" character varying(255),
    "tax_id" character varying(50),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "accent_color" "text",
    "login_logo_url" "text",
    "login_background_url" "text",
    "border_radius" "text",
    "dark_mode" boolean DEFAULT false,
    "font_family" "text",
    "shadows" boolean DEFAULT true,
    "custom_css" "text",
    "favicon" "text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_currency_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "currency_code" character varying(3) DEFAULT 'PYG'::character varying,
    "currency_symbol" character varying(5) DEFAULT 'Gs.'::character varying,
    "decimal_places" integer DEFAULT 0,
    "thousand_separator" character varying(1) DEFAULT '.'::character varying,
    "decimal_separator" character varying(1) DEFAULT ','::character varying,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_currency_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_otp_policy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "require_otp_for_signature" boolean DEFAULT true NOT NULL,
    "otp_length" integer DEFAULT 6 NOT NULL,
    "otp_expiration_seconds" integer DEFAULT 300 NOT NULL,
    "max_attempts" integer DEFAULT 3 NOT NULL,
    "default_channel" "text" DEFAULT 'email'::"text" NOT NULL,
    "allowed_channels" "jsonb" DEFAULT '["email"]'::"jsonb" NOT NULL,
    "whatsapp_otp_enabled" boolean DEFAULT false NOT NULL,
    "smtp_host" "text",
    "smtp_port" integer DEFAULT 587,
    "smtp_user" "text",
    "smtp_password_encrypted" "text",
    "smtp_from_address" "text",
    "smtp_from_name" "text",
    "smtp_tls" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "smtp_relay_url" "text"
);


ALTER TABLE "public"."company_otp_policy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "whatsapp_api_key" "text",
    "whatsapp_phone_id" "text",
    "sms_api_key" "text",
    "sms_sender_id" "text",
    "email_api_key" "text",
    "email_from_address" character varying(255),
    "email_from_name" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "menu_config" "jsonb",
    "signwell_enabled" boolean DEFAULT false,
    "signwell_api_key" "text",
    "whatsapp_gateway_url" "text",
    "whatsapp_linked_phone" "text",
    "email_provider" "text" DEFAULT 'resend'::"text",
    "whatsapp_provider" "text" DEFAULT 'wame_fallback'::"text" NOT NULL,
    "twilio_account_sid" "text",
    "twilio_auth_token" "text",
    "twilio_whatsapp_number" "text",
    "contratada_signature_mode" "text" DEFAULT 'auto'::"text" NOT NULL,
    "contratada_signer_name" "text",
    "contratada_signer_email" "text",
    "contratada_signer_dni" "text",
    "contratada_signer_phone" "text",
    "signature_block_style" "jsonb" DEFAULT '{"size": "normal", "type": "electronic", "align": "left", "show_ip": false, "version": "v2", "show_dni": true, "show_timestamp": true}'::"jsonb"
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."company_settings"."menu_config" IS 'Configuración de visibilidad de menú por rol. Estructura: { "routeKey": { "role": boolean } }';



COMMENT ON COLUMN "public"."company_settings"."contratada_signature_mode" IS 'auto: firma automática con datos empresa, link: enviar link al representante';



COMMENT ON COLUMN "public"."company_settings"."contratada_signer_name" IS 'Nombre del representante legal para firma';



COMMENT ON COLUMN "public"."company_settings"."contratada_signer_email" IS 'Email del representante para envío de link de firma';



COMMENT ON COLUMN "public"."company_settings"."contratada_signer_dni" IS 'C.I./RUC del representante legal';



CREATE OR REPLACE VIEW "public"."company_settings_public" WITH ("security_invoker"='true') AS
 SELECT "company_id",
    "contratada_signer_name",
    "contratada_signature_mode",
    "signature_block_style"
   FROM "public"."company_settings";


ALTER VIEW "public"."company_settings_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_ui_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "theme" character varying(20) DEFAULT 'light'::character varying,
    "sidebar_collapsed" boolean DEFAULT false,
    "dashboard_layout" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sale_progress_config" "jsonb",
    "analytics_config" "jsonb"
);


ALTER TABLE "public"."company_ui_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."company_ui_settings"."sale_progress_config" IS 'JSON object mapping sale statuses to progress percentages (0-100)';



COMMENT ON COLUMN "public"."company_ui_settings"."analytics_config" IS 'JSON object with kpis and tabs visibility toggles for analytics dashboard';



CREATE TABLE IF NOT EXISTS "public"."company_workflow_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "workflow_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."company_workflow_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."countries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "code" character varying(3) NOT NULL,
    "phone_code" character varying(10),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_widgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "widget_type" character varying(100) NOT NULL,
    "position" integer DEFAULT 0,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "is_visible" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dashboard_widgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "access_type" character varying(50) DEFAULT 'view'::character varying,
    "ip_address" character varying(45),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."document_access_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_field_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "field_id" "uuid" NOT NULL,
    "signature_link_id" "uuid" NOT NULL,
    "value_text" "text",
    "value_json" "jsonb",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."document_field_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "signer_role" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "page" integer DEFAULT 1 NOT NULL,
    "x" numeric NOT NULL,
    "y" numeric NOT NULL,
    "w" numeric NOT NULL,
    "h" numeric NOT NULL,
    "required" boolean DEFAULT true NOT NULL,
    "label" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."document_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_package_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "package_id" "uuid" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "is_required" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."document_package_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "package_type" character varying DEFAULT 'firma_cliente'::character varying,
    "name" character varying NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."document_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying NOT NULL,
    "name" character varying NOT NULL,
    "description" "text",
    "requires_signature" boolean DEFAULT false,
    "is_required" boolean DEFAULT false,
    "applies_to" character varying DEFAULT 'titular'::character varying,
    "template_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."document_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "document_type" character varying(50),
    "content" "text",
    "file_url" "text",
    "status" "public"."document_status" DEFAULT 'pendiente'::"public"."document_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "document_type_id" "uuid",
    "generated_from_template" boolean DEFAULT false,
    "requires_signature" boolean DEFAULT false,
    "signed_by" "uuid",
    "signed_at" timestamp with time zone,
    "signature_data" "text",
    "beneficiary_id" "uuid",
    "version" integer DEFAULT 1,
    "is_final" boolean DEFAULT false,
    "base_pdf_url" "text",
    "signed_pdf_url" "text",
    "base_pdf_hash" "text",
    "signed_pdf_hash" "text",
    "evidence_certificate_url" "text",
    "evidence_certificate_hash" "text",
    "template_version_id" "uuid",
    "template_designer_version" "text"
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "name" character varying(255) NOT NULL,
    "subject" character varying(255),
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "sent_count" integer DEFAULT 0,
    "opened_count" integer DEFAULT 0,
    "clicked_count" integer DEFAULT 0,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "subject" character varying(255) NOT NULL,
    "body" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "channel" "text" DEFAULT 'email'::"text" NOT NULL,
    "template_key" "text"
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."file_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "uploaded_by" "uuid",
    "file_name" character varying(255) NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" character varying(100),
    "file_size" integer,
    "entity_type" character varying(100),
    "entity_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."file_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hash_anchors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evidence_bundle_id" "uuid" NOT NULL,
    "hash_value" "text" NOT NULL,
    "anchor_type" "text" DEFAULT 'internal'::"text" NOT NULL,
    "anchor_reference" "text",
    "anchored_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hash_anchors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incident_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "incident_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text",
    "file_size" bigint,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."incident_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incident_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "incident_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "content" "text" NOT NULL,
    "is_internal" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."incident_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incidents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "module" "text" NOT NULL,
    "priority" "text" DEFAULT 'media'::"text" NOT NULL,
    "status" "text" DEFAULT 'nuevo'::"text" NOT NULL,
    "reported_by" "uuid",
    "assigned_to" "uuid",
    "company_id" "uuid",
    "resolution_notes" "text",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "analysis_notes" "text",
    "estimated_hours" numeric(6,2),
    "development_started_at" timestamp with time zone,
    "development_ended_at" timestamp with time zone,
    CONSTRAINT "incidents_priority_check" CHECK (("priority" = ANY (ARRAY['baja'::"text", 'media'::"text", 'alta'::"text", 'critica'::"text"]))),
    CONSTRAINT "incidents_status_check" CHECK (("status" = ANY (ARRAY['nuevo'::"text", 'analisis'::"text", 'pendiente_aprobacion'::"text", 'pendiente_desarrollo'::"text", 'desarrollo'::"text", 'estabilizacion'::"text", 'resuelto'::"text", 'cancelado'::"text"])))
);


ALTER TABLE "public"."incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."information_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "requested_by" "uuid",
    "request_type" character varying(100) NOT NULL,
    "description" "text",
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "response" "text",
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."information_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legal_evidence_certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "document_id" "uuid",
    "signature_link_id" "uuid",
    "certificate_url" "text",
    "certificate_hash" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."legal_evidence_certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" "text",
    "type" character varying(50) DEFAULT 'info'::character varying,
    "is_read" boolean DEFAULT false,
    "link" character varying(500),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" character varying(255) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "price" numeric(12,2) DEFAULT 0 NOT NULL,
    "coverage_details" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_traces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid",
    "user_id" "uuid",
    "action" character varying(100) NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."process_traces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "company_id" "uuid",
    "first_name" character varying(100),
    "last_name" character varying(100),
    "email" character varying(255),
    "phone" character varying(50),
    "avatar_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" character varying(50),
    "file_size" integer,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sale_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "note_text" "text" NOT NULL,
    "is_internal" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sale_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "requirement_text" "text" NOT NULL,
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sale_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sale_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_workflow_states" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "previous_status" character varying,
    "new_status" character varying NOT NULL,
    "changed_by" "uuid",
    "change_reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sale_workflow_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "plan_id" "uuid",
    "salesperson_id" "uuid",
    "template_id" "uuid",
    "status" "public"."sale_status" DEFAULT 'borrador'::"public"."sale_status",
    "total_amount" numeric(12,2) DEFAULT 0,
    "notes" "text",
    "signature_token" "uuid",
    "signature_expires_at" timestamp with time zone,
    "signed_at" timestamp with time zone,
    "signed_ip" character varying(45),
    "contract_pdf_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sale_date" "date" DEFAULT CURRENT_DATE,
    "contract_number" character varying,
    "request_number" character varying,
    "requires_adherents" boolean DEFAULT false,
    "adherents_count" integer DEFAULT 0,
    "all_signatures_completed" boolean DEFAULT false,
    "signature_completed_at" timestamp with time zone,
    "auditor_id" "uuid",
    "audited_at" timestamp with time zone,
    "audit_status" character varying DEFAULT 'pendiente'::character varying,
    "audit_notes" "text",
    "signer_type" character varying DEFAULT 'titular'::character varying,
    "signer_name" character varying,
    "signer_dni" character varying,
    "signer_relationship" character varying,
    "billing_razon_social" "text",
    "billing_ruc" "text",
    "billing_email" "text",
    "billing_phone" "text",
    "contract_start_date" "date",
    "immediate_coverage" boolean DEFAULT false,
    "sale_type" character varying DEFAULT 'venta_nueva'::character varying
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sales"."billing_razon_social" IS 'Razón social para facturación';



COMMENT ON COLUMN "public"."sales"."billing_ruc" IS 'RUC para facturación';



COMMENT ON COLUMN "public"."sales"."billing_email" IS 'Email para facturación';



COMMENT ON COLUMN "public"."sales"."billing_phone" IS 'Celular para facturación';



COMMENT ON COLUMN "public"."sales"."contract_start_date" IS 'Auto-calculated: first day of the month when sale is approved';



CREATE TABLE IF NOT EXISTS "public"."signature_consent_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "signature_link_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "document_id" "uuid",
    "consent_text_version" "text" DEFAULT 'v1.0'::"text" NOT NULL,
    "consent_text" "text" NOT NULL,
    "checkbox_state" boolean DEFAULT false NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."signature_consent_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signature_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "signature_link_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "document_id" "uuid",
    "document_hash" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "identity_verified" boolean DEFAULT false NOT NULL,
    "identity_verification_id" "uuid",
    "consent_record_id" "uuid",
    "document_version" "text",
    "signature_method" "text" DEFAULT 'electronic'::"text" NOT NULL,
    "evidence_bundle_hash" "text",
    "evidence_bundle_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "signed_pdf_hash" "text"
);


ALTER TABLE "public"."signature_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signature_evidence_bundles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "signature_link_id" "uuid",
    "signature_event_id" "uuid",
    "sale_id" "uuid" NOT NULL,
    "document_id" "uuid",
    "document_hash" "text" NOT NULL,
    "pdf_hash" "text",
    "evidence_json" "jsonb" NOT NULL,
    "bundle_hash" "text" NOT NULL,
    "storage_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."signature_evidence_bundles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signature_identity_verification" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "signature_link_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "auth_method" "text" DEFAULT 'OTP_EMAIL'::"text" NOT NULL,
    "destination_masked" "text",
    "otp_code_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "attempts" integer DEFAULT 0 NOT NULL,
    "max_attempts" integer DEFAULT 3 NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "result" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "channel" "text" DEFAULT 'email'::"text"
);


ALTER TABLE "public"."signature_identity_verification" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signature_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "package_id" "uuid",
    "token" character varying NOT NULL,
    "recipient_type" character varying NOT NULL,
    "recipient_id" "uuid",
    "recipient_email" character varying,
    "recipient_phone" character varying,
    "expires_at" timestamp with time zone NOT NULL,
    "accessed_at" timestamp with time zone,
    "access_count" integer DEFAULT 0,
    "ip_addresses" "jsonb" DEFAULT '[]'::"jsonb",
    "status" character varying DEFAULT 'pendiente'::character varying,
    "completed_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "signwell_document_id" "text",
    "signwell_signing_url" "text",
    "step_order" integer DEFAULT 1,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."signature_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signature_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" "text" NOT NULL,
    "title" "text" DEFAULT 'Política de Firma Electrónica'::"text" NOT NULL,
    "content" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."signature_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signature_workflow_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "signature_link_id" "uuid" NOT NULL,
    "step_order" integer NOT NULL,
    "step_type" character varying NOT NULL,
    "document_id" "uuid",
    "status" character varying DEFAULT 'pendiente'::character varying,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."signature_workflow_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signatures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "document_id" "uuid",
    "signature_data" "text" NOT NULL,
    "signer_name" character varying(255),
    "signer_email" character varying(255),
    "signer_ip" character varying(45),
    "signed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."signatures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "sent_count" integer DEFAULT 0,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sms_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "views_count" integer DEFAULT 0,
    "completions_count" integer DEFAULT 0,
    "avg_completion_time" integer,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."template_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_asset_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "page_number" integer NOT NULL,
    "preview_image_url" "text",
    "width" numeric,
    "height" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."template_asset_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "asset_type" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "mime_type" "text",
    "file_size" bigint,
    "page_count" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'uploaded'::"text" NOT NULL,
    "converted_asset_id" "uuid",
    "processing_error" "text",
    "processing_progress" integer DEFAULT 0
);


ALTER TABLE "public"."template_assets" OWNER TO "postgres";


COMMENT ON TABLE "public"."template_assets" IS 'Template designer 2.0 assets with processing support';



COMMENT ON COLUMN "public"."template_assets"."status" IS 'Valores: uploaded, processing, ready, error';



CREATE TABLE IF NOT EXISTS "public"."template_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text",
    "file_size" integer,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."template_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "block_type" "text" NOT NULL,
    "page" integer DEFAULT 1 NOT NULL,
    "x" numeric DEFAULT 0 NOT NULL,
    "y" numeric DEFAULT 0 NOT NULL,
    "w" numeric DEFAULT 100 NOT NULL,
    "h" numeric DEFAULT 50 NOT NULL,
    "z_index" integer DEFAULT 0 NOT NULL,
    "rotation" numeric DEFAULT 0 NOT NULL,
    "is_locked" boolean DEFAULT false NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "style" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "visibility_rules" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."template_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "comment_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."template_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "block_id" "uuid",
    "signer_role" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "page" integer DEFAULT 1 NOT NULL,
    "x" numeric DEFAULT 0 NOT NULL,
    "y" numeric DEFAULT 0 NOT NULL,
    "w" numeric DEFAULT 100 NOT NULL,
    "h" numeric DEFAULT 30 NOT NULL,
    "required" boolean DEFAULT true NOT NULL,
    "label" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."template_fields" OWNER TO "postgres";


COMMENT ON COLUMN "public"."template_fields"."field_type" IS 'Valores: signature, initials, date, text, name, email, dni, checkbox, stamp';



CREATE TABLE IF NOT EXISTS "public"."template_placeholders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "placeholder_name" character varying(100) NOT NULL,
    "placeholder_label" character varying(255) NOT NULL,
    "placeholder_type" character varying(50) DEFAULT 'text'::character varying,
    "description" "text",
    "default_value" "text",
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."template_placeholders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_question_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_text" character varying(255) NOT NULL,
    "option_value" character varying(255),
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."template_question_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_type" character varying(50) DEFAULT 'text'::character varying,
    "is_required" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "placeholder_name" character varying(100),
    "validation_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."template_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "response_value" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."template_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "content" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "designer_version" "text" DEFAULT '1.0'::"text" NOT NULL,
    "layout_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "version_label" "text",
    "is_published" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."template_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_workflow_states" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "state_name" character varying(100) NOT NULL,
    "state_order" integer DEFAULT 0,
    "is_final" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."template_workflow_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "content" "text",
    "is_active" boolean DEFAULT true,
    "version" integer DEFAULT 1,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "template_type" character varying DEFAULT 'contrato'::character varying,
    "uses_dynamic_fields" boolean DEFAULT true,
    "pdf_layout" "jsonb" DEFAULT '{}'::"jsonb",
    "requires_signature" boolean DEFAULT true,
    "designer_version" "text" DEFAULT '1.0'::"text" NOT NULL,
    "render_engine" "text" DEFAULT 'legacy'::"text" NOT NULL,
    "published_version_id" "uuid"
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."templates" IS 'Company document templates - cache refresh';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" DEFAULT 'vendedor'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "sale_id" "uuid",
    "signature_link_id" "uuid",
    "phone_number" character varying NOT NULL,
    "message_type" character varying DEFAULT 'signature_link'::character varying,
    "message_body" "text" NOT NULL,
    "whatsapp_message_id" character varying,
    "status" character varying DEFAULT 'pending'::character varying,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "error_message" "text",
    "sent_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."whatsapp_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "sale_id" "uuid",
    "phone_number" character varying(50) NOT NULL,
    "message" "text" NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "sent_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."whatsapp_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "template_key" "text" NOT NULL,
    "template_name" "text" NOT NULL,
    "description" "text",
    "message_body" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."whatsapp_templates" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_comments"
    ADD CONSTRAINT "audit_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_processes"
    ADD CONSTRAINT "audit_processes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_attempts"
    ADD CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beneficiaries"
    ADD CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beneficiary_documents"
    ADD CONSTRAINT "beneficiary_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_logs"
    ADD CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_currency_settings"
    ADD CONSTRAINT "company_currency_settings_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."company_currency_settings"
    ADD CONSTRAINT "company_currency_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_otp_policy"
    ADD CONSTRAINT "company_otp_policy_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."company_otp_policy"
    ADD CONSTRAINT "company_otp_policy_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_ui_settings"
    ADD CONSTRAINT "company_ui_settings_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."company_ui_settings"
    ADD CONSTRAINT "company_ui_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_workflow_config"
    ADD CONSTRAINT "company_workflow_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_widgets"
    ADD CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_access_logs"
    ADD CONSTRAINT "document_access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_field_values"
    ADD CONSTRAINT "document_field_values_field_id_signature_link_id_key" UNIQUE ("field_id", "signature_link_id");



ALTER TABLE ONLY "public"."document_field_values"
    ADD CONSTRAINT "document_field_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_fields"
    ADD CONSTRAINT "document_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_package_items"
    ADD CONSTRAINT "document_package_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_packages"
    ADD CONSTRAINT "document_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_types"
    ADD CONSTRAINT "document_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."document_types"
    ADD CONSTRAINT "document_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_uploads"
    ADD CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hash_anchors"
    ADD CONSTRAINT "hash_anchors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incident_attachments"
    ADD CONSTRAINT "incident_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incident_comments"
    ADD CONSTRAINT "incident_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."information_requests"
    ADD CONSTRAINT "information_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_evidence_certificates"
    ADD CONSTRAINT "legal_evidence_certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_traces"
    ADD CONSTRAINT "process_traces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_documents"
    ADD CONSTRAINT "sale_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_notes"
    ADD CONSTRAINT "sale_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_requirements"
    ADD CONSTRAINT "sale_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_templates"
    ADD CONSTRAINT "sale_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_templates"
    ADD CONSTRAINT "sale_templates_sale_id_template_id_key" UNIQUE ("sale_id", "template_id");



ALTER TABLE ONLY "public"."sale_workflow_states"
    ADD CONSTRAINT "sale_workflow_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signature_consent_records"
    ADD CONSTRAINT "signature_consent_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signature_events"
    ADD CONSTRAINT "signature_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signature_evidence_bundles"
    ADD CONSTRAINT "signature_evidence_bundles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signature_identity_verification"
    ADD CONSTRAINT "signature_identity_verification_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signature_links"
    ADD CONSTRAINT "signature_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signature_links"
    ADD CONSTRAINT "signature_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."signature_policies"
    ADD CONSTRAINT "signature_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signature_workflow_steps"
    ADD CONSTRAINT "signature_workflow_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signatures"
    ADD CONSTRAINT "signatures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_campaigns"
    ADD CONSTRAINT "sms_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_analytics"
    ADD CONSTRAINT "template_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_asset_pages"
    ADD CONSTRAINT "template_asset_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_assets"
    ADD CONSTRAINT "template_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_attachments"
    ADD CONSTRAINT "template_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_blocks"
    ADD CONSTRAINT "template_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_comments"
    ADD CONSTRAINT "template_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_fields"
    ADD CONSTRAINT "template_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_placeholders"
    ADD CONSTRAINT "template_placeholders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_placeholders"
    ADD CONSTRAINT "template_placeholders_placeholder_name_key" UNIQUE ("placeholder_name");



ALTER TABLE ONLY "public"."template_question_options"
    ADD CONSTRAINT "template_question_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_questions"
    ADD CONSTRAINT "template_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_responses"
    ADD CONSTRAINT "template_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_responses"
    ADD CONSTRAINT "template_responses_sale_template_question_unique" UNIQUE ("sale_id", "template_id", "question_id");



ALTER TABLE ONLY "public"."template_versions"
    ADD CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_versions"
    ADD CONSTRAINT "template_versions_template_id_version_number_key" UNIQUE ("template_id", "version_number");



ALTER TABLE ONLY "public"."template_workflow_states"
    ADD CONSTRAINT "template_workflow_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_workflow_config"
    ADD CONSTRAINT "unique_company_workflow" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_notifications"
    ADD CONSTRAINT "whatsapp_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_templates"
    ADD CONSTRAINT "whatsapp_templates_company_id_template_key_key" UNIQUE ("company_id", "template_key");



ALTER TABLE ONLY "public"."whatsapp_templates"
    ADD CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id");



CREATE INDEX "email_templates_company_channel_key_idx" ON "public"."email_templates" USING "btree" ("company_id", "channel", "template_key");



CREATE UNIQUE INDEX "email_templates_unique_company_channel_key" ON "public"."email_templates" USING "btree" ("company_id", "channel", "template_key") WHERE ("template_key" IS NOT NULL);



CREATE INDEX "idx_audit_comments_sale" ON "public"."audit_comments" USING "btree" ("sale_id");



CREATE INDEX "idx_audit_comments_sale_id" ON "public"."audit_comments" USING "btree" ("sale_id");



CREATE INDEX "idx_audit_comments_user" ON "public"."audit_comments" USING "btree" ("user_id");



CREATE INDEX "idx_audit_comments_user_id" ON "public"."audit_comments" USING "btree" ("user_id");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_beneficiaries_sale_id" ON "public"."beneficiaries" USING "btree" ("sale_id");



CREATE INDEX "idx_beneficiary_documents_beneficiary" ON "public"."beneficiary_documents" USING "btree" ("beneficiary_id");



CREATE INDEX "idx_clients_company_id" ON "public"."clients" USING "btree" ("company_id");



CREATE INDEX "idx_company_workflow_config_company" ON "public"."company_workflow_config" USING "btree" ("company_id");



CREATE INDEX "idx_document_packages_sale" ON "public"."document_packages" USING "btree" ("sale_id");



CREATE INDEX "idx_documents_sale_id" ON "public"."documents" USING "btree" ("sale_id");



CREATE INDEX "idx_documents_sale_type" ON "public"."documents" USING "btree" ("sale_id", "document_type");



CREATE INDEX "idx_incident_attachments_incident" ON "public"."incident_attachments" USING "btree" ("incident_id");



CREATE INDEX "idx_incident_comments_incident" ON "public"."incident_comments" USING "btree" ("incident_id");



CREATE INDEX "idx_incidents_company" ON "public"."incidents" USING "btree" ("company_id");



CREATE INDEX "idx_incidents_reported_by" ON "public"."incidents" USING "btree" ("reported_by");



CREATE INDEX "idx_incidents_status" ON "public"."incidents" USING "btree" ("status");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_plans_company_id" ON "public"."plans" USING "btree" ("company_id");



CREATE INDEX "idx_process_traces_sale_id" ON "public"."process_traces" USING "btree" ("sale_id");



CREATE INDEX "idx_profiles_company_id" ON "public"."profiles" USING "btree" ("company_id");



CREATE INDEX "idx_sale_workflow_states_sale" ON "public"."sale_workflow_states" USING "btree" ("sale_id");



CREATE INDEX "idx_sales_client_id" ON "public"."sales" USING "btree" ("client_id");



CREATE INDEX "idx_sales_company_id" ON "public"."sales" USING "btree" ("company_id");



CREATE INDEX "idx_sales_salesperson_id" ON "public"."sales" USING "btree" ("salesperson_id");



CREATE INDEX "idx_sales_signature_token" ON "public"."sales" USING "btree" ("signature_token");



CREATE INDEX "idx_sales_status" ON "public"."sales" USING "btree" ("status");



CREATE INDEX "idx_sig_identity_link_id" ON "public"."signature_identity_verification" USING "btree" ("signature_link_id");



CREATE INDEX "idx_sig_identity_sale_id" ON "public"."signature_identity_verification" USING "btree" ("sale_id");



CREATE INDEX "idx_signature_links_sale" ON "public"."signature_links" USING "btree" ("sale_id");



CREATE INDEX "idx_signature_links_status" ON "public"."signature_links" USING "btree" ("status");



CREATE INDEX "idx_signature_links_token" ON "public"."signature_links" USING "btree" ("token");



CREATE INDEX "idx_signatures_sale_id" ON "public"."signatures" USING "btree" ("sale_id");



CREATE INDEX "idx_template_asset_pages_asset" ON "public"."template_asset_pages" USING "btree" ("asset_id", "page_number");



CREATE INDEX "idx_template_assets_template" ON "public"."template_assets" USING "btree" ("template_id", "asset_type", "status");



CREATE INDEX "idx_template_fields_template_page" ON "public"."template_fields" USING "btree" ("template_id", "page");



CREATE INDEX "idx_template_questions_template_id" ON "public"."template_questions" USING "btree" ("template_id");



CREATE INDEX "idx_template_responses_sale_id" ON "public"."template_responses" USING "btree" ("sale_id");



CREATE INDEX "idx_templates_company_id" ON "public"."templates" USING "btree" ("company_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_whatsapp_messages_sale" ON "public"."whatsapp_messages" USING "btree" ("sale_id");



CREATE OR REPLACE TRIGGER "auto_advance_sale_status_trigger" AFTER UPDATE ON "public"."signature_links" FOR EACH ROW EXECUTE FUNCTION "public"."auto_advance_sale_status"();



CREATE OR REPLACE TRIGGER "create_template_version_trigger" BEFORE UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."create_template_version"();



CREATE OR REPLACE TRIGGER "generate_contract_number_trigger" BEFORE INSERT ON "public"."sales" FOR EACH ROW WHEN (("new"."contract_number" IS NULL)) EXECUTE FUNCTION "public"."generate_contract_number"();



CREATE OR REPLACE TRIGGER "trg_auto_advance_sale_status" AFTER UPDATE ON "public"."signature_links" FOR EACH ROW EXECUTE FUNCTION "public"."auto_advance_sale_status"();



CREATE OR REPLACE TRIGGER "trg_incident_updated_at" BEFORE UPDATE ON "public"."incidents" FOR EACH ROW EXECUTE FUNCTION "public"."update_incident_updated_at"();



CREATE OR REPLACE TRIGGER "trg_recalculate_sale_total" AFTER INSERT OR DELETE OR UPDATE ON "public"."beneficiaries" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_sale_total_amount"();



CREATE OR REPLACE TRIGGER "trg_set_titular_amount" BEFORE INSERT OR UPDATE ON "public"."beneficiaries" FOR EACH ROW EXECUTE FUNCTION "public"."set_titular_amount_on_save"();



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_company_workflow_config_updated_at" BEFORE UPDATE ON "public"."company_workflow_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_workflow_config_updated_at"();



CREATE OR REPLACE TRIGGER "update_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_plans_updated_at" BEFORE UPDATE ON "public"."plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sales_updated_at" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_template_blocks_updated_at" BEFORE UPDATE ON "public"."template_blocks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_templates_updated_at" BEFORE UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "vendedor_edit_restriction" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."check_vendedor_edit_restriction"();



ALTER TABLE ONLY "public"."audit_comments"
    ADD CONSTRAINT "audit_comments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_comments"
    ADD CONSTRAINT "audit_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_processes"
    ADD CONSTRAINT "audit_processes_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_processes"
    ADD CONSTRAINT "audit_processes_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beneficiaries"
    ADD CONSTRAINT "beneficiaries_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beneficiary_documents"
    ADD CONSTRAINT "beneficiary_documents_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beneficiary_documents"
    ADD CONSTRAINT "beneficiary_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id");



ALTER TABLE ONLY "public"."beneficiary_documents"
    ADD CONSTRAINT "beneficiary_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."beneficiary_documents"
    ADD CONSTRAINT "beneficiary_documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id");



ALTER TABLE ONLY "public"."communication_logs"
    ADD CONSTRAINT "communication_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."communication_logs"
    ADD CONSTRAINT "communication_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_logs"
    ADD CONSTRAINT "communication_logs_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_currency_settings"
    ADD CONSTRAINT "company_currency_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_otp_policy"
    ADD CONSTRAINT "company_otp_policy_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_ui_settings"
    ADD CONSTRAINT "company_ui_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_workflow_config"
    ADD CONSTRAINT "company_workflow_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_workflow_config"
    ADD CONSTRAINT "company_workflow_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."dashboard_widgets"
    ADD CONSTRAINT "dashboard_widgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_access_logs"
    ADD CONSTRAINT "document_access_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_access_logs"
    ADD CONSTRAINT "document_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_field_values"
    ADD CONSTRAINT "document_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."document_fields"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_field_values"
    ADD CONSTRAINT "document_field_values_signature_link_id_fkey" FOREIGN KEY ("signature_link_id") REFERENCES "public"."signature_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_fields"
    ADD CONSTRAINT "document_fields_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_package_items"
    ADD CONSTRAINT "document_package_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_package_items"
    ADD CONSTRAINT "document_package_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."document_packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_packages"
    ADD CONSTRAINT "document_packages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."document_packages"
    ADD CONSTRAINT "document_packages_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_types"
    ADD CONSTRAINT "document_types_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."file_uploads"
    ADD CONSTRAINT "file_uploads_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."file_uploads"
    ADD CONSTRAINT "file_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hash_anchors"
    ADD CONSTRAINT "hash_anchors_evidence_bundle_id_fkey" FOREIGN KEY ("evidence_bundle_id") REFERENCES "public"."signature_evidence_bundles"("id");



ALTER TABLE ONLY "public"."incident_attachments"
    ADD CONSTRAINT "incident_attachments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incident_attachments"
    ADD CONSTRAINT "incident_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incident_comments"
    ADD CONSTRAINT "incident_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incident_comments"
    ADD CONSTRAINT "incident_comments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."information_requests"
    ADD CONSTRAINT "information_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."information_requests"
    ADD CONSTRAINT "information_requests_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."legal_evidence_certificates"
    ADD CONSTRAINT "legal_evidence_certificates_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id");



ALTER TABLE ONLY "public"."legal_evidence_certificates"
    ADD CONSTRAINT "legal_evidence_certificates_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."legal_evidence_certificates"
    ADD CONSTRAINT "legal_evidence_certificates_signature_link_id_fkey" FOREIGN KEY ("signature_link_id") REFERENCES "public"."signature_links"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."process_traces"
    ADD CONSTRAINT "process_traces_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."process_traces"
    ADD CONSTRAINT "process_traces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_documents"
    ADD CONSTRAINT "sale_documents_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_documents"
    ADD CONSTRAINT "sale_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sale_notes"
    ADD CONSTRAINT "sale_notes_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_notes"
    ADD CONSTRAINT "sale_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sale_requirements"
    ADD CONSTRAINT "sale_requirements_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sale_requirements"
    ADD CONSTRAINT "sale_requirements_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_templates"
    ADD CONSTRAINT "sale_templates_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_templates"
    ADD CONSTRAINT "sale_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_workflow_states"
    ADD CONSTRAINT "sale_workflow_states_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sale_workflow_states"
    ADD CONSTRAINT "sale_workflow_states_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."signature_consent_records"
    ADD CONSTRAINT "signature_consent_records_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."signature_consent_records"
    ADD CONSTRAINT "signature_consent_records_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signature_consent_records"
    ADD CONSTRAINT "signature_consent_records_signature_link_id_fkey" FOREIGN KEY ("signature_link_id") REFERENCES "public"."signature_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signature_events"
    ADD CONSTRAINT "signature_events_consent_record_id_fkey" FOREIGN KEY ("consent_record_id") REFERENCES "public"."signature_consent_records"("id");



ALTER TABLE ONLY "public"."signature_events"
    ADD CONSTRAINT "signature_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."signature_events"
    ADD CONSTRAINT "signature_events_identity_verification_id_fkey" FOREIGN KEY ("identity_verification_id") REFERENCES "public"."signature_identity_verification"("id");



ALTER TABLE ONLY "public"."signature_events"
    ADD CONSTRAINT "signature_events_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signature_events"
    ADD CONSTRAINT "signature_events_signature_link_id_fkey" FOREIGN KEY ("signature_link_id") REFERENCES "public"."signature_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signature_evidence_bundles"
    ADD CONSTRAINT "signature_evidence_bundles_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id");



ALTER TABLE ONLY "public"."signature_evidence_bundles"
    ADD CONSTRAINT "signature_evidence_bundles_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."signature_evidence_bundles"
    ADD CONSTRAINT "signature_evidence_bundles_signature_event_id_fkey" FOREIGN KEY ("signature_event_id") REFERENCES "public"."signature_events"("id");



ALTER TABLE ONLY "public"."signature_evidence_bundles"
    ADD CONSTRAINT "signature_evidence_bundles_signature_link_id_fkey" FOREIGN KEY ("signature_link_id") REFERENCES "public"."signature_links"("id");



ALTER TABLE ONLY "public"."signature_identity_verification"
    ADD CONSTRAINT "signature_identity_verification_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signature_identity_verification"
    ADD CONSTRAINT "signature_identity_verification_signature_link_id_fkey" FOREIGN KEY ("signature_link_id") REFERENCES "public"."signature_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signature_links"
    ADD CONSTRAINT "signature_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."signature_links"
    ADD CONSTRAINT "signature_links_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."document_packages"("id");



ALTER TABLE ONLY "public"."signature_links"
    ADD CONSTRAINT "signature_links_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signature_workflow_steps"
    ADD CONSTRAINT "signature_workflow_steps_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id");



ALTER TABLE ONLY "public"."signature_workflow_steps"
    ADD CONSTRAINT "signature_workflow_steps_signature_link_id_fkey" FOREIGN KEY ("signature_link_id") REFERENCES "public"."signature_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signatures"
    ADD CONSTRAINT "signatures_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."signatures"
    ADD CONSTRAINT "signatures_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_campaigns"
    ADD CONSTRAINT "sms_campaigns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_analytics"
    ADD CONSTRAINT "template_analytics_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_asset_pages"
    ADD CONSTRAINT "template_asset_pages_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."template_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_assets"
    ADD CONSTRAINT "template_assets_converted_asset_id_fkey" FOREIGN KEY ("converted_asset_id") REFERENCES "public"."template_assets"("id");



ALTER TABLE ONLY "public"."template_assets"
    ADD CONSTRAINT "template_assets_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_attachments"
    ADD CONSTRAINT "template_attachments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_blocks"
    ADD CONSTRAINT "template_blocks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_comments"
    ADD CONSTRAINT "template_comments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_comments"
    ADD CONSTRAINT "template_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."template_fields"
    ADD CONSTRAINT "template_fields_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."template_blocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_fields"
    ADD CONSTRAINT "template_fields_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_question_options"
    ADD CONSTRAINT "template_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."template_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_questions"
    ADD CONSTRAINT "template_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_responses"
    ADD CONSTRAINT "template_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."template_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_responses"
    ADD CONSTRAINT "template_responses_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_responses"
    ADD CONSTRAINT "template_responses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_versions"
    ADD CONSTRAINT "template_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."template_versions"
    ADD CONSTRAINT "template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_workflow_states"
    ADD CONSTRAINT "template_workflow_states_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_signature_link_id_fkey" FOREIGN KEY ("signature_link_id") REFERENCES "public"."signature_links"("id");



ALTER TABLE ONLY "public"."whatsapp_notifications"
    ADD CONSTRAINT "whatsapp_notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_notifications"
    ADD CONSTRAINT "whatsapp_notifications_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."whatsapp_templates"
    ADD CONSTRAINT "whatsapp_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can insert certificates" ON "public"."legal_evidence_certificates" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin'::"public"."app_role"]))))));



CREATE POLICY "Admins can manage OTP policy" ON "public"."company_otp_policy" USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can manage UI settings" ON "public"."company_ui_settings" USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can manage audit processes" ON "public"."audit_processes" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'gestor'::"public"."app_role")));



CREATE POLICY "Admins can manage companies" ON "public"."companies" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage company settings" ON "public"."company_settings" USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can manage currency settings" ON "public"."company_currency_settings" USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can manage document types" ON "public"."document_types" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")));



CREATE POLICY "Admins can manage email campaigns" ON "public"."email_campaigns" USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can manage email templates" ON "public"."email_templates" USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can manage plans" ON "public"."plans" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage signature policies" ON "public"."signature_policies" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage sms campaigns" ON "public"."sms_campaigns" USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can manage template attachments" ON "public"."template_attachments" USING (("template_id" IN ( SELECT "t"."id"
   FROM "public"."templates" "t"
  WHERE ("t"."company_id" IN ( SELECT "p"."company_id"
           FROM "public"."profiles" "p"
          WHERE (("p"."id" = "auth"."uid"()) AND ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")))))))) WITH CHECK (("template_id" IN ( SELECT "t"."id"
   FROM "public"."templates" "t"
  WHERE ("t"."company_id" IN ( SELECT "p"."company_id"
           FROM "public"."profiles" "p"
          WHERE (("p"."id" = "auth"."uid"()) AND ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))))));



CREATE POLICY "Admins can manage user roles" ON "public"."user_roles" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can read OTP policy" ON "public"."company_otp_policy" FOR SELECT TO "authenticated" USING ((("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))));



CREATE POLICY "Admins can update company profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())))));



CREATE POLICY "Admins can view audit logs" ON "public"."audit_logs" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can view auth attempts" ON "public"."auth_attempts" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can view company profiles" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR (("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")))));



CREATE POLICY "Admins can view doc access logs" ON "public"."document_access_logs" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Anyone can view active signature policies" ON "public"."signature_policies" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view countries" ON "public"."countries" FOR SELECT USING (true);



CREATE POLICY "Anyone can view placeholders" ON "public"."template_placeholders" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create signatures" ON "public"."signatures" FOR INSERT TO "authenticated" WITH CHECK (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Authenticated users can insert template responses" ON "public"."template_responses" FOR INSERT TO "authenticated" WITH CHECK (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Authenticated users can log doc access" ON "public"."document_access_logs" FOR INSERT TO "authenticated" WITH CHECK (("document_id" IN ( SELECT "documents"."id"
   FROM "public"."documents")));



CREATE POLICY "Authenticated users can view consent records" ON "public"."signature_consent_records" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Authenticated users can view document types" ON "public"."document_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view evidence bundles" ON "public"."signature_evidence_bundles" FOR SELECT USING (("sale_id" IN ( SELECT "s"."id"
   FROM "public"."sales" "s"
  WHERE ("s"."company_id" IN ( SELECT "p"."company_id"
           FROM "public"."profiles" "p"
          WHERE ("p"."id" = "auth"."uid"()))))));



CREATE POLICY "Authenticated users can view hash anchors" ON "public"."hash_anchors" FOR SELECT USING (("evidence_bundle_id" IN ( SELECT "seb"."id"
   FROM "public"."signature_evidence_bundles" "seb"
  WHERE ("seb"."sale_id" IN ( SELECT "s"."id"
           FROM "public"."sales" "s"
          WHERE ("s"."company_id" IN ( SELECT "p"."company_id"
                   FROM "public"."profiles" "p"
                  WHERE ("p"."id" = "auth"."uid"()))))))));



CREATE POLICY "Authenticated users can view identity verifications" ON "public"."signature_identity_verification" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Authenticated users can view signature events" ON "public"."signature_events" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Company users can manage template attachments" ON "public"."template_attachments" USING (("template_id" IN ( SELECT "t"."id"
   FROM "public"."templates" "t"
  WHERE ("t"."company_id" IN ( SELECT "p"."company_id"
           FROM "public"."profiles" "p"
          WHERE ("p"."id" = "auth"."uid"())))))) WITH CHECK (("template_id" IN ( SELECT "t"."id"
   FROM "public"."templates" "t"
  WHERE ("t"."company_id" IN ( SELECT "p"."company_id"
           FROM "public"."profiles" "p"
          WHERE ("p"."id" = "auth"."uid"()))))));



CREATE POLICY "Gestors can manage templates" ON "public"."templates" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'gestor'::"public"."app_role")));



CREATE POLICY "Public can create signatures via signature token" ON "public"."signatures" FOR INSERT TO "authenticated", "anon" WITH CHECK (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can delete documents by signature token" ON "public"."documents" FOR DELETE USING (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can insert consent record by token" ON "public"."signature_consent_records" FOR INSERT WITH CHECK (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can insert evidence bundle by signature token" ON "public"."signature_evidence_bundles" FOR INSERT WITH CHECK (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can insert hash anchors by signature token" ON "public"."hash_anchors" FOR INSERT WITH CHECK (("evidence_bundle_id" IN ( SELECT "signature_evidence_bundles"."id"
   FROM "public"."signature_evidence_bundles"
  WHERE ("signature_evidence_bundles"."sale_id" = "public"."get_sale_id_from_signature_token"()))));



CREATE POLICY "Public can insert identity verification by token" ON "public"."signature_identity_verification" FOR INSERT WITH CHECK (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can insert process trace by signature token" ON "public"."process_traces" FOR INSERT WITH CHECK (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can insert responses via signature token" ON "public"."template_responses" FOR INSERT TO "authenticated", "anon" WITH CHECK (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can insert signature document by token" ON "public"."documents" FOR INSERT WITH CHECK (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can insert signature event by token" ON "public"."signature_events" FOR INSERT WITH CHECK (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can insert workflow step by signature token" ON "public"."signature_workflow_steps" FOR INSERT WITH CHECK (("signature_link_id" = "public"."get_signature_link_id_from_token"()));



CREATE POLICY "Public can log doc access via signature token" ON "public"."document_access_logs" FOR INSERT WITH CHECK (("document_id" IN ( SELECT "d"."id"
   FROM "public"."documents" "d"
  WHERE ("d"."sale_id" = "public"."get_sale_id_from_signature_token"()))));



CREATE POLICY "Public can update documents by signature token" ON "public"."documents" FOR UPDATE USING (("sale_id" = "public"."get_sale_id_from_signature_token"())) WITH CHECK (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can update signature link by token" ON "public"."signature_links" FOR UPDATE TO "anon" USING ((("token")::"text" = COALESCE((("current_setting"('request.headers'::"text", true))::json ->> 'x-signature-token'::"text"), ''::"text"))) WITH CHECK ((("token")::"text" = COALESCE((("current_setting"('request.headers'::"text", true))::json ->> 'x-signature-token'::"text"), ''::"text")));



CREATE POLICY "Public can view beneficiaries by signature token" ON "public"."beneficiaries" FOR SELECT USING (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can view client by signature token" ON "public"."clients" FOR SELECT USING (("id" IN ( SELECT "sales"."client_id"
   FROM "public"."sales"
  WHERE ("sales"."id" = "public"."get_sale_id_from_signature_token"()))));



CREATE POLICY "Public can view company by signature token" ON "public"."companies" FOR SELECT USING (("id" IN ( SELECT "sales"."company_id"
   FROM "public"."sales"
  WHERE ("sales"."id" = "public"."get_sale_id_from_signature_token"()))));



CREATE POLICY "Public can view consent records by token" ON "public"."signature_consent_records" FOR SELECT USING (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can view documents by signature token" ON "public"."documents" FOR SELECT USING (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can view evidence bundles by signature token" ON "public"."signature_evidence_bundles" FOR SELECT USING (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can view own identity verification by token" ON "public"."signature_identity_verification" FOR SELECT USING (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can view plan by signature token" ON "public"."plans" FOR SELECT USING (("id" IN ( SELECT "sales"."plan_id"
   FROM "public"."sales"
  WHERE ("sales"."id" = "public"."get_sale_id_from_signature_token"()))));



CREATE POLICY "Public can view sale by signature token" ON "public"."sales" FOR SELECT USING (("id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can view signature events by token" ON "public"."signature_events" FOR SELECT USING (("sale_id" = "public"."get_sale_id_from_signature_token"()));



CREATE POLICY "Public can view signature link by token" ON "public"."signature_links" FOR SELECT TO "anon" USING ((("token")::"text" = COALESCE((("current_setting"('request.headers'::"text", true))::json ->> 'x-signature-token'::"text"), ''::"text")));



CREATE POLICY "Public can view workflow steps by signature token" ON "public"."signature_workflow_steps" FOR SELECT USING (("signature_link_id" = "public"."get_signature_link_id_from_token"()));



CREATE POLICY "Super admins can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Users can add sale notes" ON "public"."sale_notes" FOR INSERT WITH CHECK (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can add template comments" ON "public"."template_comments" FOR INSERT WITH CHECK (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can create communication logs" ON "public"."communication_logs" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create information requests" ON "public"."information_requests" FOR INSERT WITH CHECK (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can create process traces" ON "public"."process_traces" FOR INSERT WITH CHECK (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can create sale workflow states" ON "public"."sale_workflow_states" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sales" "s"
  WHERE (("s"."id" = "sale_workflow_states"."sale_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'supervisor'::"public"."app_role"))))));



CREATE POLICY "Users can create signature links for their sales" ON "public"."signature_links" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sales" "s"
  WHERE (("s"."id" = "signature_links"."sale_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Users can create whatsapp messages" ON "public"."whatsapp_messages" FOR INSERT TO "authenticated" WITH CHECK (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create whatsapp notifications" ON "public"."whatsapp_notifications" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert template versions" ON "public"."template_versions" FOR INSERT WITH CHECK (("template_id" IN ( SELECT "t"."id"
   FROM "public"."templates" "t"
  WHERE ("t"."company_id" IN ( SELECT "p"."company_id"
           FROM "public"."profiles" "p"
          WHERE ("p"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage asset pages via template company" ON "public"."template_asset_pages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."template_assets" "ta"
     JOIN "public"."templates" "t" ON (("t"."id" = "ta"."template_id")))
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("ta"."id" = "template_asset_pages"."asset_id") AND ("p"."id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."template_assets" "ta"
     JOIN "public"."templates" "t" ON (("t"."id" = "ta"."template_id")))
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("ta"."id" = "template_asset_pages"."asset_id") AND ("p"."id" = "auth"."uid"())))));



CREATE POLICY "Users can manage beneficiary documents" ON "public"."beneficiary_documents" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."beneficiaries" "b"
     JOIN "public"."sales" "s" ON (("s"."id" = "b"."sale_id")))
  WHERE (("b"."id" = "beneficiary_documents"."beneficiary_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Users can manage company clients" ON "public"."clients" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR ("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can manage own reset tokens" ON "public"."password_reset_tokens" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own sales" ON "public"."sales" USING ((("salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'gestor'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'supervisor'::"public"."app_role")));



CREATE POLICY "Users can manage own widgets" ON "public"."dashboard_widgets" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage sale beneficiaries" ON "public"."beneficiaries" USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE (("sales"."salesperson_id" = "auth"."uid"()) OR ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))))));



CREATE POLICY "Users can manage sale docs" ON "public"."sale_documents" USING (("sale_id" IN ( SELECT "s"."id"
   FROM "public"."sales" "s"
  WHERE (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'gestor'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role") OR ("s"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))))) WITH CHECK (("sale_id" IN ( SELECT "s"."id"
   FROM "public"."sales" "s"
  WHERE (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'gestor'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role") OR ("s"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



CREATE POLICY "Users can manage sale documents" ON "public"."documents" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR ("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."salesperson_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage sale requirements" ON "public"."sale_requirements" USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE (("sales"."salesperson_id" = "auth"."uid"()) OR ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))))));



CREATE POLICY "Users can manage sale templates" ON "public"."sale_templates" TO "authenticated" USING (("sale_id" IN ( SELECT "s"."id"
   FROM "public"."sales" "s"
  WHERE ("s"."company_id" IN ( SELECT "p"."company_id"
           FROM "public"."profiles" "p"
          WHERE ("p"."id" = "auth"."uid"())))))) WITH CHECK (("sale_id" IN ( SELECT "s"."id"
   FROM "public"."sales" "s"
  WHERE ("s"."company_id" IN ( SELECT "p"."company_id"
           FROM "public"."profiles" "p"
          WHERE ("p"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage template assets via template company" ON "public"."template_assets" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."templates" "t"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("t"."id" = "template_assets"."template_id") AND ("p"."id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."templates" "t"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("t"."id" = "template_assets"."template_id") AND ("p"."id" = "auth"."uid"())))));



CREATE POLICY "Users can manage template blocks via template company" ON "public"."template_blocks" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."templates" "t"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("t"."id" = "template_blocks"."template_id") AND ("p"."id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."templates" "t"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("t"."id" = "template_blocks"."template_id") AND ("p"."id" = "auth"."uid"())))));



CREATE POLICY "Users can manage template fields via template company" ON "public"."template_fields" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."templates" "t"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("t"."id" = "template_fields"."template_id") AND ("p"."id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."templates" "t"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("t"."id" = "template_fields"."template_id") AND ("p"."id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their document packages" ON "public"."document_packages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sales" "s"
  WHERE (("s"."id" = "document_packages"."sale_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Users can manage their package items" ON "public"."document_package_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."document_packages" "dp"
     JOIN "public"."sales" "s" ON (("s"."id" = "dp"."sale_id")))
  WHERE (("dp"."id" = "document_package_items"."package_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Users can manage workflow steps" ON "public"."signature_workflow_steps" USING ((EXISTS ( SELECT 1
   FROM ("public"."signature_links" "sl"
     JOIN "public"."sales" "s" ON (("s"."id" = "sl"."sale_id")))
  WHERE (("sl"."id" = "signature_workflow_steps"."signature_link_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Users can update information requests" ON "public"."information_requests" FOR UPDATE USING (("sale_id" IN ( SELECT "s"."id"
   FROM "public"."sales" "s"
  WHERE ("s"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update signature links for their sales" ON "public"."signature_links" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sales" "s"
  WHERE (("s"."id" = "signature_links"."sale_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Users can upload files" ON "public"."file_uploads" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "uploaded_by"));



CREATE POLICY "Users can view audit processes" ON "public"."audit_processes" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view beneficiary documents" ON "public"."beneficiary_documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."beneficiaries" "b"
     JOIN "public"."sales" "s" ON (("s"."id" = "b"."sale_id")))
  WHERE (("b"."id" = "beneficiary_documents"."beneficiary_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Users can view certificates from own company" ON "public"."legal_evidence_certificates" FOR SELECT TO "authenticated" USING (("sale_id" IN ( SELECT "s"."id"
   FROM "public"."sales" "s"
  WHERE ("s"."company_id" IN ( SELECT "p"."company_id"
           FROM "public"."profiles" "p"
          WHERE ("p"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view communication logs" ON "public"."communication_logs" FOR SELECT USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view company clients" ON "public"."clients" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR ("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view company files" ON "public"."file_uploads" FOR SELECT USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view company plans" ON "public"."plans" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR ("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view company sales" ON "public"."sales" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR ("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view company templates" ON "public"."templates" FOR SELECT USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view email campaigns" ON "public"."email_campaigns" FOR SELECT USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view email templates" ON "public"."email_templates" FOR SELECT USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view information requests" ON "public"."information_requests" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own company" ON "public"."companies" FOR SELECT USING (("id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view process traces" ON "public"."process_traces" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view question options" ON "public"."template_question_options" FOR SELECT USING (("question_id" IN ( SELECT "template_questions"."id"
   FROM "public"."template_questions"
  WHERE ("template_questions"."template_id" IN ( SELECT "templates"."id"
           FROM "public"."templates"
          WHERE ("templates"."company_id" IN ( SELECT "profiles"."company_id"
                   FROM "public"."profiles"
                  WHERE ("profiles"."id" = "auth"."uid"()))))))));



CREATE POLICY "Users can view sale beneficiaries" ON "public"."beneficiaries" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view sale docs" ON "public"."sale_documents" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view sale documents" ON "public"."documents" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR ("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



CREATE POLICY "Users can view sale notes" ON "public"."sale_notes" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view sale requirements" ON "public"."sale_requirements" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view sale workflow states" ON "public"."sale_workflow_states" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sales" "s"
  WHERE (("s"."id" = "sale_workflow_states"."sale_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role"))))));



CREATE POLICY "Users can view signature links for their sales" ON "public"."signature_links" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sales" "s"
  WHERE (("s"."id" = "signature_links"."sale_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Users can view signatures" ON "public"."signatures" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view sms campaigns" ON "public"."sms_campaigns" FOR SELECT USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view template analytics" ON "public"."template_analytics" FOR SELECT USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view template attachments" ON "public"."template_attachments" FOR SELECT USING (("template_id" IN ( SELECT "t"."id"
   FROM "public"."templates" "t"
  WHERE ("t"."company_id" IN ( SELECT "p"."company_id"
           FROM "public"."profiles" "p"
          WHERE ("p"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view template comments" ON "public"."template_comments" FOR SELECT USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view template questions" ON "public"."template_questions" FOR SELECT USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view template responses" ON "public"."template_responses" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view template versions" ON "public"."template_versions" FOR SELECT USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their document packages" ON "public"."document_packages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sales" "s"
  WHERE (("s"."id" = "document_packages"."sale_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Users can view their package items" ON "public"."document_package_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."document_packages" "dp"
     JOIN "public"."sales" "s" ON (("s"."id" = "dp"."sale_id")))
  WHERE (("dp"."id" = "document_package_items"."package_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Users can view whatsapp messages" ON "public"."whatsapp_messages" FOR SELECT TO "authenticated" USING ((("sent_by" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")));



CREATE POLICY "Users can view whatsapp notifications" ON "public"."whatsapp_notifications" FOR SELECT USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view workflow states" ON "public"."template_workflow_states" FOR SELECT USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."company_id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view workflow steps" ON "public"."signature_workflow_steps" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."signature_links" "sl"
     JOIN "public"."sales" "s" ON (("s"."id" = "sl"."sale_id")))
  WHERE (("sl"."id" = "signature_workflow_steps"."signature_link_id") AND (("s"."salesperson_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"))))));



CREATE POLICY "Users can view workflow steps via sales" ON "public"."signature_workflow_steps" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."signature_links" "sl"
     JOIN "public"."sales" "s" ON (("s"."id" = "sl"."sale_id")))
  WHERE (("sl"."id" = "signature_workflow_steps"."signature_link_id") AND ("s"."company_id" = "public"."get_user_company_id"("auth"."uid"()))))));



CREATE POLICY "Vendedor can delete own draft sales" ON "public"."sales" FOR DELETE USING ((("salesperson_id" = "auth"."uid"()) AND ("status" = ANY (ARRAY['borrador'::"public"."sale_status", 'rechazado'::"public"."sale_status"]))));



ALTER TABLE "public"."audit_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_comments_insert" ON "public"."audit_comments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['auditor'::"public"."app_role", 'admin'::"public"."app_role", 'super_admin'::"public"."app_role"]))))));



CREATE POLICY "audit_comments_select" ON "public"."audit_comments" FOR SELECT USING ((("sale_id" IN ( SELECT "s"."id"
   FROM ("public"."sales" "s"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "s"."company_id")))
  WHERE ("p"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role"))))));



CREATE POLICY "audit_insert_notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'supervisor'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'gestor'::"public"."app_role")));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_processes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_manage_document_fields" ON "public"."document_fields" TO "authenticated" USING (("document_id" IN ( SELECT "d"."id"
   FROM ("public"."documents" "d"
     JOIN "public"."sales" "s" ON (("s"."id" = "d"."sale_id")))
  WHERE ("s"."company_id" = "public"."get_user_company_id"("auth"."uid"()))))) WITH CHECK (("document_id" IN ( SELECT "d"."id"
   FROM ("public"."documents" "d"
     JOIN "public"."sales" "s" ON (("s"."id" = "d"."sale_id")))
  WHERE ("s"."company_id" = "public"."get_user_company_id"("auth"."uid"())))));



CREATE POLICY "authenticated_manage_field_values" ON "public"."document_field_values" TO "authenticated" USING (("field_id" IN ( SELECT "df"."id"
   FROM (("public"."document_fields" "df"
     JOIN "public"."documents" "d" ON (("d"."id" = "df"."document_id")))
     JOIN "public"."sales" "s" ON (("s"."id" = "d"."sale_id")))
  WHERE ("s"."company_id" = "public"."get_user_company_id"("auth"."uid"()))))) WITH CHECK (("field_id" IN ( SELECT "df"."id"
   FROM (("public"."document_fields" "df"
     JOIN "public"."documents" "d" ON (("d"."id" = "df"."document_id")))
     JOIN "public"."sales" "s" ON (("s"."id" = "d"."sale_id")))
  WHERE ("s"."company_id" = "public"."get_user_company_id"("auth"."uid"())))));



ALTER TABLE "public"."beneficiaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."beneficiary_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "block_financiero_clients" ON "public"."clients" AS RESTRICTIVE FOR SELECT USING ((NOT (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'financiero'::"public"."app_role") AND (NOT (EXISTS ( SELECT 1
           FROM "public"."user_roles" "ur2"
          WHERE (("ur2"."user_id" = "auth"."uid"()) AND ("ur2"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin'::"public"."app_role", 'supervisor'::"public"."app_role", 'auditor'::"public"."app_role", 'gestor'::"public"."app_role", 'vendedor'::"public"."app_role"])))))))))));



CREATE POLICY "block_financiero_sales" ON "public"."sales" AS RESTRICTIVE FOR SELECT USING ((NOT (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'financiero'::"public"."app_role") AND (NOT (EXISTS ( SELECT 1
           FROM "public"."user_roles" "ur2"
          WHERE (("ur2"."user_id" = "auth"."uid"()) AND ("ur2"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin'::"public"."app_role", 'supervisor'::"public"."app_role", 'auditor'::"public"."app_role", 'gestor'::"public"."app_role", 'vendedor'::"public"."app_role"])))))))))));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_block_financiero" ON "public"."clients" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (((NOT "public"."has_role"("auth"."uid"(), 'financiero'::"public"."app_role")) OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



ALTER TABLE "public"."communication_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_currency_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_members_can_manage_whatsapp_templates" ON "public"."whatsapp_templates" USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())
UNION
 SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "profiles"."company_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



ALTER TABLE "public"."company_otp_policy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_settings_select_admin" ON "public"."company_settings" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'super_admin'::"public"."app_role"]))))) AND ("company_id" = ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



ALTER TABLE "public"."company_ui_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_workflow_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_workflow_config_delete" ON "public"."company_workflow_config" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role")))));



CREATE POLICY "company_workflow_config_insert" ON "public"."company_workflow_config" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'super_admin'::"public"."app_role"]))))));



CREATE POLICY "company_workflow_config_select" ON "public"."company_workflow_config" FOR SELECT USING ((("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"public"."app_role"))))));



CREATE POLICY "company_workflow_config_update" ON "public"."company_workflow_config" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'super_admin'::"public"."app_role"]))))));



ALTER TABLE "public"."countries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_widgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_field_values" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_package_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."file_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hash_anchors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incident_attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "incident_attachments_insert" ON "public"."incident_attachments" FOR INSERT TO "authenticated" WITH CHECK (("incident_id" IN ( SELECT "incidents"."id"
   FROM "public"."incidents"
  WHERE ("incidents"."company_id" = "public"."get_user_company_id"("auth"."uid"())))));



CREATE POLICY "incident_attachments_select" ON "public"."incident_attachments" FOR SELECT TO "authenticated" USING (("incident_id" IN ( SELECT "incidents"."id"
   FROM "public"."incidents"
  WHERE ("incidents"."company_id" = "public"."get_user_company_id"("auth"."uid"())))));



ALTER TABLE "public"."incident_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "incident_comments_insert" ON "public"."incident_comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "incident_comments_select" ON "public"."incident_comments" FOR SELECT TO "authenticated" USING (("incident_id" IN ( SELECT "incidents"."id"
   FROM "public"."incidents"
  WHERE ("incidents"."company_id" = "public"."get_user_company_id"("auth"."uid"())))));



ALTER TABLE "public"."incidents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "incidents_delete" ON "public"."incidents" FOR DELETE USING ((("company_id" = ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."app_role", 'super_admin'::"public"."app_role"])))))));



CREATE POLICY "incidents_insert" ON "public"."incidents" FOR INSERT WITH CHECK (("company_id" = ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "incidents_select" ON "public"."incidents" FOR SELECT USING (("company_id" = ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "incidents_update" ON "public"."incidents" FOR UPDATE USING (("company_id" = ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."information_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legal_evidence_certificates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."process_traces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_workflow_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_block_financiero" ON "public"."sales" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (((NOT "public"."has_role"("auth"."uid"(), 'financiero'::"public"."app_role")) OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



ALTER TABLE "public"."signature_consent_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."signature_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."signature_evidence_bundles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."signature_identity_verification" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."signature_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."signature_policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "signature_token_insert_field_values" ON "public"."document_field_values" FOR INSERT WITH CHECK (("signature_link_id" = "public"."get_signature_link_id_from_token"()));



CREATE POLICY "signature_token_read_document_fields" ON "public"."document_fields" FOR SELECT USING (("document_id" IN ( SELECT "d"."id"
   FROM "public"."documents" "d"
  WHERE ("d"."sale_id" = "public"."get_sale_id_from_signature_token"()))));



CREATE POLICY "signature_token_read_field_values" ON "public"."document_field_values" FOR SELECT USING ((("signature_link_id" = "public"."get_signature_link_id_from_token"()) OR ("field_id" IN ( SELECT "df"."id"
   FROM ("public"."document_fields" "df"
     JOIN "public"."documents" "d" ON (("d"."id" = "df"."document_id")))
  WHERE ("d"."sale_id" = "public"."get_sale_id_from_signature_token"())))));



CREATE POLICY "signature_token_update_field_values" ON "public"."document_field_values" FOR UPDATE USING (("signature_link_id" = "public"."get_signature_link_id_from_token"()));



ALTER TABLE "public"."signature_workflow_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."signatures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sms_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_asset_pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "template_asset_pages_all" ON "public"."template_asset_pages" USING ((EXISTS ( SELECT 1
   FROM (("public"."template_assets" "ta"
     JOIN "public"."templates" "t" ON (("t"."id" = "ta"."template_id")))
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("ta"."id" = "template_asset_pages"."asset_id") AND ("p"."id" = "auth"."uid"())))));



ALTER TABLE "public"."template_assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "template_assets_all" ON "public"."template_assets" USING ((EXISTS ( SELECT 1
   FROM ("public"."templates" "t"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("t"."id" = "template_assets"."template_id") AND ("p"."id" = "auth"."uid"())))));



ALTER TABLE "public"."template_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_fields" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "template_fields_delete" ON "public"."template_fields" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."templates" "t"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("t"."id" = "template_fields"."template_id") AND ("p"."id" = "auth"."uid"())))));



CREATE POLICY "template_fields_insert" ON "public"."template_fields" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."templates" "t"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("t"."id" = "template_fields"."template_id") AND ("p"."id" = "auth"."uid"())))));



CREATE POLICY "template_fields_select" ON "public"."template_fields" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."templates" "t"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("t"."id" = "template_fields"."template_id") AND ("p"."id" = "auth"."uid"())))));



CREATE POLICY "template_fields_update" ON "public"."template_fields" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."templates" "t"
     JOIN "public"."profiles" "p" ON (("p"."company_id" = "t"."company_id")))
  WHERE (("t"."id" = "template_fields"."template_id") AND ("p"."id" = "auth"."uid"())))));



ALTER TABLE "public"."template_placeholders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_question_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_workflow_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_templates" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_advance_sale_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_advance_sale_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_advance_sale_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_all_signatures_completed"("p_sale_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_all_signatures_completed"("p_sale_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_all_signatures_completed"("p_sale_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_vendedor_edit_restriction"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_vendedor_edit_restriction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_vendedor_edit_restriction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_template_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_template_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_template_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_contract_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_contract_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_contract_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_otp_policy_for_signature"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_otp_policy_for_signature"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_otp_policy_for_signature"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sale_id_from_signature_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_sale_id_from_signature_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sale_id_from_signature_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_signature_link_id_from_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_signature_link_id_from_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_signature_link_id_from_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_company_id"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_company_id"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_company_id"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_sale_total_amount"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_sale_total_amount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_sale_total_amount"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_titular_amount_on_save"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_titular_amount_on_save"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_titular_amount_on_save"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_incident_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_incident_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_incident_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_workflow_config_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_workflow_config_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_workflow_config_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_comments" TO "anon";
GRANT ALL ON TABLE "public"."audit_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_comments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."audit_processes" TO "anon";
GRANT ALL ON TABLE "public"."audit_processes" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_processes" TO "service_role";



GRANT ALL ON TABLE "public"."auth_attempts" TO "anon";
GRANT ALL ON TABLE "public"."auth_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."beneficiaries" TO "anon";
GRANT ALL ON TABLE "public"."beneficiaries" TO "authenticated";
GRANT ALL ON TABLE "public"."beneficiaries" TO "service_role";



GRANT ALL ON TABLE "public"."beneficiary_documents" TO "anon";
GRANT ALL ON TABLE "public"."beneficiary_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."beneficiary_documents" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."communication_logs" TO "anon";
GRANT ALL ON TABLE "public"."communication_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."communication_logs" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_currency_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_currency_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_currency_settings" TO "service_role";



GRANT ALL ON TABLE "public"."company_otp_policy" TO "anon";
GRANT ALL ON TABLE "public"."company_otp_policy" TO "authenticated";
GRANT ALL ON TABLE "public"."company_otp_policy" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings_public" TO "anon";
GRANT ALL ON TABLE "public"."company_settings_public" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings_public" TO "service_role";



GRANT ALL ON TABLE "public"."company_ui_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_ui_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_ui_settings" TO "service_role";



GRANT ALL ON TABLE "public"."company_workflow_config" TO "anon";
GRANT ALL ON TABLE "public"."company_workflow_config" TO "authenticated";
GRANT ALL ON TABLE "public"."company_workflow_config" TO "service_role";



GRANT ALL ON TABLE "public"."countries" TO "anon";
GRANT ALL ON TABLE "public"."countries" TO "authenticated";
GRANT ALL ON TABLE "public"."countries" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_widgets" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_widgets" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_widgets" TO "service_role";



GRANT ALL ON TABLE "public"."document_access_logs" TO "anon";
GRANT ALL ON TABLE "public"."document_access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."document_access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."document_field_values" TO "anon";
GRANT ALL ON TABLE "public"."document_field_values" TO "authenticated";
GRANT ALL ON TABLE "public"."document_field_values" TO "service_role";



GRANT ALL ON TABLE "public"."document_fields" TO "anon";
GRANT ALL ON TABLE "public"."document_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."document_fields" TO "service_role";



GRANT ALL ON TABLE "public"."document_package_items" TO "anon";
GRANT ALL ON TABLE "public"."document_package_items" TO "authenticated";
GRANT ALL ON TABLE "public"."document_package_items" TO "service_role";



GRANT ALL ON TABLE "public"."document_packages" TO "anon";
GRANT ALL ON TABLE "public"."document_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."document_packages" TO "service_role";



GRANT ALL ON TABLE "public"."document_types" TO "anon";
GRANT ALL ON TABLE "public"."document_types" TO "authenticated";
GRANT ALL ON TABLE "public"."document_types" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."email_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."email_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."email_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."file_uploads" TO "anon";
GRANT ALL ON TABLE "public"."file_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."file_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."hash_anchors" TO "anon";
GRANT ALL ON TABLE "public"."hash_anchors" TO "authenticated";
GRANT ALL ON TABLE "public"."hash_anchors" TO "service_role";



GRANT ALL ON TABLE "public"."incident_attachments" TO "anon";
GRANT ALL ON TABLE "public"."incident_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."incident_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."incident_comments" TO "anon";
GRANT ALL ON TABLE "public"."incident_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."incident_comments" TO "service_role";



GRANT ALL ON TABLE "public"."incidents" TO "anon";
GRANT ALL ON TABLE "public"."incidents" TO "authenticated";
GRANT ALL ON TABLE "public"."incidents" TO "service_role";



GRANT ALL ON TABLE "public"."information_requests" TO "anon";
GRANT ALL ON TABLE "public"."information_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."information_requests" TO "service_role";



GRANT ALL ON TABLE "public"."legal_evidence_certificates" TO "anon";
GRANT ALL ON TABLE "public"."legal_evidence_certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_evidence_certificates" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."process_traces" TO "anon";
GRANT ALL ON TABLE "public"."process_traces" TO "authenticated";
GRANT ALL ON TABLE "public"."process_traces" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."sale_documents" TO "anon";
GRANT ALL ON TABLE "public"."sale_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_documents" TO "service_role";



GRANT ALL ON TABLE "public"."sale_notes" TO "anon";
GRANT ALL ON TABLE "public"."sale_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_notes" TO "service_role";



GRANT ALL ON TABLE "public"."sale_requirements" TO "anon";
GRANT ALL ON TABLE "public"."sale_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."sale_templates" TO "anon";
GRANT ALL ON TABLE "public"."sale_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_templates" TO "service_role";



GRANT ALL ON TABLE "public"."sale_workflow_states" TO "anon";
GRANT ALL ON TABLE "public"."sale_workflow_states" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_workflow_states" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."signature_consent_records" TO "anon";
GRANT ALL ON TABLE "public"."signature_consent_records" TO "authenticated";
GRANT ALL ON TABLE "public"."signature_consent_records" TO "service_role";



GRANT ALL ON TABLE "public"."signature_events" TO "anon";
GRANT ALL ON TABLE "public"."signature_events" TO "authenticated";
GRANT ALL ON TABLE "public"."signature_events" TO "service_role";



GRANT ALL ON TABLE "public"."signature_evidence_bundles" TO "anon";
GRANT ALL ON TABLE "public"."signature_evidence_bundles" TO "authenticated";
GRANT ALL ON TABLE "public"."signature_evidence_bundles" TO "service_role";



GRANT ALL ON TABLE "public"."signature_identity_verification" TO "anon";
GRANT ALL ON TABLE "public"."signature_identity_verification" TO "authenticated";
GRANT ALL ON TABLE "public"."signature_identity_verification" TO "service_role";



GRANT ALL ON TABLE "public"."signature_links" TO "anon";
GRANT ALL ON TABLE "public"."signature_links" TO "authenticated";
GRANT ALL ON TABLE "public"."signature_links" TO "service_role";



GRANT ALL ON TABLE "public"."signature_policies" TO "anon";
GRANT ALL ON TABLE "public"."signature_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."signature_policies" TO "service_role";



GRANT ALL ON TABLE "public"."signature_workflow_steps" TO "anon";
GRANT ALL ON TABLE "public"."signature_workflow_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."signature_workflow_steps" TO "service_role";



GRANT ALL ON TABLE "public"."signatures" TO "anon";
GRANT ALL ON TABLE "public"."signatures" TO "authenticated";
GRANT ALL ON TABLE "public"."signatures" TO "service_role";



GRANT ALL ON TABLE "public"."sms_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."sms_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."template_analytics" TO "anon";
GRANT ALL ON TABLE "public"."template_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."template_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."template_asset_pages" TO "anon";
GRANT ALL ON TABLE "public"."template_asset_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."template_asset_pages" TO "service_role";



GRANT ALL ON TABLE "public"."template_assets" TO "anon";
GRANT ALL ON TABLE "public"."template_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."template_assets" TO "service_role";



GRANT ALL ON TABLE "public"."template_attachments" TO "anon";
GRANT ALL ON TABLE "public"."template_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."template_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."template_blocks" TO "anon";
GRANT ALL ON TABLE "public"."template_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."template_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."template_comments" TO "anon";
GRANT ALL ON TABLE "public"."template_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."template_comments" TO "service_role";



GRANT ALL ON TABLE "public"."template_fields" TO "anon";
GRANT ALL ON TABLE "public"."template_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."template_fields" TO "service_role";



GRANT ALL ON TABLE "public"."template_placeholders" TO "anon";
GRANT ALL ON TABLE "public"."template_placeholders" TO "authenticated";
GRANT ALL ON TABLE "public"."template_placeholders" TO "service_role";



GRANT ALL ON TABLE "public"."template_question_options" TO "anon";
GRANT ALL ON TABLE "public"."template_question_options" TO "authenticated";
GRANT ALL ON TABLE "public"."template_question_options" TO "service_role";



GRANT ALL ON TABLE "public"."template_questions" TO "anon";
GRANT ALL ON TABLE "public"."template_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."template_questions" TO "service_role";



GRANT ALL ON TABLE "public"."template_responses" TO "anon";
GRANT ALL ON TABLE "public"."template_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."template_responses" TO "service_role";



GRANT ALL ON TABLE "public"."template_versions" TO "anon";
GRANT ALL ON TABLE "public"."template_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."template_versions" TO "service_role";



GRANT ALL ON TABLE "public"."template_workflow_states" TO "anon";
GRANT ALL ON TABLE "public"."template_workflow_states" TO "authenticated";
GRANT ALL ON TABLE "public"."template_workflow_states" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_messages" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_notifications" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_templates" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_templates" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







