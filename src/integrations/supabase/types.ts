export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          request_method: string | null
          request_path: string | null
          session_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          request_method?: string | null
          request_path?: string | null
          session_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          request_method?: string | null
          request_path?: string | null
          session_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_attempts: {
        Row: {
          attempted_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: unknown | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          amount: number | null
          birth_date: string | null
          created_at: string
          dni: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          relationship: string
          sale_id: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          birth_date?: string | null
          created_at?: string
          dni?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          relationship: string
          sale_id: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          birth_date?: string | null
          created_at?: string
          dni?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          relationship?: string
          sale_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string | null
          dni: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          marital_status: string | null
          neighborhood: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string | null
          dni?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          marital_status?: string | null
          neighborhood?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string | null
          dni?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          marital_status?: string | null
          neighborhood?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      communication_logs: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          company_id: string | null
          content: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          recipient_email: string | null
          recipient_id: string | null
          recipient_phone: string | null
          sent_at: string | null
          status: string
          subject: string | null
          type: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          company_id?: string | null
          content: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          company_id?: string | null
          content?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          accent_color: string | null
          active: boolean | null
          address: string | null
          border_radius: string | null
          created_at: string | null
          custom_css: string | null
          dark_mode: boolean | null
          email: string | null
          favicon: string | null
          font_family: string | null
          id: string
          login_background_url: string | null
          login_logo_url: string | null
          login_subtitle: string | null
          login_title: string | null
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          shadows: boolean | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          active?: boolean | null
          address?: string | null
          border_radius?: string | null
          created_at?: string | null
          custom_css?: string | null
          dark_mode?: boolean | null
          email?: string | null
          favicon?: string | null
          font_family?: string | null
          id?: string
          login_background_url?: string | null
          login_logo_url?: string | null
          login_subtitle?: string | null
          login_title?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          shadows?: boolean | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          active?: boolean | null
          address?: string | null
          border_radius?: string | null
          created_at?: string | null
          custom_css?: string | null
          dark_mode?: boolean | null
          email?: string | null
          favicon?: string | null
          font_family?: string | null
          id?: string
          login_background_url?: string | null
          login_logo_url?: string | null
          login_subtitle?: string | null
          login_title?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          shadows?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_id: string
          created_at: string | null
          email_api_key: string | null
          id: string
          resend_api_key: string | null
          settings: Json | null
          sms_api_key: string | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          updated_at: string | null
          whatsapp_api_key: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email_api_key?: string | null
          id?: string
          resend_api_key?: string | null
          settings?: Json | null
          sms_api_key?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email_api_key?: string | null
          id?: string
          resend_api_key?: string | null
          settings?: Json | null
          sms_api_key?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          created_at: string
          id: string
          position: number
          settings: Json | null
          size: string
          updated_at: string
          user_id: string | null
          visible: boolean
          widget_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          settings?: Json | null
          size?: string
          updated_at?: string
          user_id?: string | null
          visible?: boolean
          widget_type: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          settings?: Json | null
          size?: string
          updated_at?: string
          user_id?: string | null
          visible?: boolean
          widget_type?: string
        }
        Relationships: []
      }
      document_access_logs: {
        Row: {
          access_time: string
          action: string
          device_type: string | null
          document_id: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_time?: string
          action: string
          device_type?: string | null
          document_id: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_time?: string
          action?: string
          device_type?: string | null
          document_id?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          created_at: string | null
          document_type: string | null
          file_url: string | null
          id: string
          is_required: boolean | null
          name: string
          order_index: number | null
          plan_id: string | null
          sale_id: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          document_type?: string | null
          file_url?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          order_index?: number | null
          plan_id?: string | null
          sale_id?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          document_type?: string | null
          file_url?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          order_index?: number | null
          plan_id?: string | null
          sale_id?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          click_count: number | null
          company_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          open_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          template_id: string | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          click_count?: number | null
          company_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          open_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          click_count?: number | null
          company_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          open_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          company_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean | null
          name: string
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          name: string
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      file_uploads: {
        Row: {
          bucket_name: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          updated_at: string | null
          upload_status: string | null
          user_id: string
        }
        Insert: {
          bucket_name: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          updated_at?: string | null
          upload_status?: string | null
          user_id: string
        }
        Update: {
          bucket_name?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          updated_at?: string | null
          upload_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean | null
          company_id: string | null
          coverage_details: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          company_id?: string | null
          coverage_details?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          company_id?: string | null
          coverage_details?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          observations: string | null
          sale_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          observations?: string | null
          sale_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          observations?: string | null
          sale_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_documents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          sale_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          sale_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          sale_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_notes_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_requirements: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_completed: boolean
          notes: string | null
          requirement_name: string
          sale_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          requirement_name: string
          sale_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          requirement_name?: string
          sale_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_requirements_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_requirements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_templates: {
        Row: {
          created_at: string | null
          document_type: string | null
          id: string
          order_index: number | null
          sale_id: string
          signed_document_url: string | null
          status: string | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_type?: string | null
          id?: string
          order_index?: number | null
          sale_id: string
          signed_document_url?: string | null
          status?: string | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string | null
          id?: string
          order_index?: number | null
          sale_id?: string
          signed_document_url?: string | null
          status?: string | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_templates_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          birth_place: string | null
          client_id: string | null
          company_id: string | null
          contract_number: string | null
          created_at: string | null
          id: string
          immediate_validity: boolean | null
          last_process: string | null
          leads_id: string | null
          maternity_bonus: boolean | null
          notes: string | null
          pediatrician: string | null
          plan_id: string | null
          profession: string | null
          request_number: string | null
          sale_date: string | null
          salesperson_id: string | null
          signature_expires_at: string | null
          signature_modality: string | null
          signature_token: string | null
          signed_document_url: string | null
          status: Database["public"]["Enums"]["sale_status"] | null
          template_id: string | null
          total_amount: number | null
          updated_at: string | null
          work_address: string | null
          work_phone: string | null
          workplace: string | null
        }
        Insert: {
          birth_place?: string | null
          client_id?: string | null
          company_id?: string | null
          contract_number?: string | null
          created_at?: string | null
          id?: string
          immediate_validity?: boolean | null
          last_process?: string | null
          leads_id?: string | null
          maternity_bonus?: boolean | null
          notes?: string | null
          pediatrician?: string | null
          plan_id?: string | null
          profession?: string | null
          request_number?: string | null
          sale_date?: string | null
          salesperson_id?: string | null
          signature_expires_at?: string | null
          signature_modality?: string | null
          signature_token?: string | null
          signed_document_url?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          template_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          work_address?: string | null
          work_phone?: string | null
          workplace?: string | null
        }
        Update: {
          birth_place?: string | null
          client_id?: string | null
          company_id?: string | null
          contract_number?: string | null
          created_at?: string | null
          id?: string
          immediate_validity?: boolean | null
          last_process?: string | null
          leads_id?: string | null
          maternity_bonus?: boolean | null
          notes?: string | null
          pediatrician?: string | null
          plan_id?: string | null
          profession?: string | null
          request_number?: string | null
          sale_date?: string | null
          salesperson_id?: string | null
          signature_expires_at?: string | null
          signature_modality?: string | null
          signature_token?: string | null
          signed_document_url?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          template_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          work_address?: string | null
          work_phone?: string | null
          workplace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          completion_progress: number | null
          device_info: Json | null
          document_id: string | null
          id: string
          ip_address: unknown | null
          sale_id: string | null
          signature_data: string | null
          signed_at: string | null
          signed_pdf_url: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          user_agent: string | null
        }
        Insert: {
          completion_progress?: number | null
          device_info?: Json | null
          document_id?: string | null
          id?: string
          ip_address?: unknown | null
          sale_id?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signed_pdf_url?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          user_agent?: string | null
        }
        Update: {
          completion_progress?: number | null
          device_info?: Json | null
          document_id?: string | null
          id?: string
          ip_address?: unknown | null
          sale_id?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signed_pdf_url?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_campaigns: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          delivered_count: number | null
          id: string
          message: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number | null
          id?: string
          message: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number | null
          id?: string
          message?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      template_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          template_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          template_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          template_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "template_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_comments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_placeholders: {
        Row: {
          created_at: string | null
          default_value: string | null
          id: string
          placeholder_label: string
          placeholder_name: string
          placeholder_type: string | null
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          id?: string
          placeholder_label: string
          placeholder_name: string
          placeholder_type?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          id?: string
          placeholder_label?: string
          placeholder_name?: string
          placeholder_type?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: []
      }
      template_question_options: {
        Row: {
          created_at: string
          id: string
          option_text: string
          option_value: string
          order_index: number
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_text: string
          option_value: string
          order_index?: number
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_text?: string
          option_value?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "template_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_questions: {
        Row: {
          conditional_logic: Json | null
          created_at: string
          id: string
          is_active: boolean
          is_required: boolean
          order_index: number
          question_text: string
          question_type: string
          template_id: string
          updated_at: string
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          order_index?: number
          question_text: string
          question_type: string
          template_id: string
          updated_at?: string
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          order_index?: number
          question_text?: string
          question_type?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_responses: {
        Row: {
          client_id: string
          created_at: string
          id: string
          question_id: string
          response_value: string
          sale_id: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          question_id: string
          response_value: string
          sale_id?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          question_id?: string
          response_value?: string
          sale_id?: string | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "template_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_responses_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          change_notes: string | null
          content: Json
          created_at: string
          created_by: string
          dynamic_fields: Json | null
          id: string
          is_major_version: boolean
          static_content: string | null
          template_id: string
          version_number: number
        }
        Insert: {
          change_notes?: string | null
          content?: Json
          created_at?: string
          created_by: string
          dynamic_fields?: Json | null
          id?: string
          is_major_version?: boolean
          static_content?: string | null
          template_id: string
          version_number: number
        }
        Update: {
          change_notes?: string | null
          content?: Json
          created_at?: string
          created_by?: string
          dynamic_fields?: Json | null
          id?: string
          is_major_version?: boolean
          static_content?: string | null
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_workflow_states: {
        Row: {
          changed_at: string
          changed_by: string | null
          created_at: string
          id: string
          metadata: Json | null
          notes: string | null
          state: string
          template_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          state?: string
          template_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          state?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_workflow_states_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_workflow_states_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          active: boolean | null
          company_id: string | null
          content: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          dynamic_fields: Json | null
          id: string
          is_global: boolean | null
          name: string
          parent_template_id: string | null
          static_content: string | null
          template_type: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          active?: boolean | null
          company_id?: string | null
          content?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dynamic_fields?: Json | null
          id?: string
          is_global?: boolean | null
          name: string
          parent_template_id?: string | null
          static_content?: string | null
          template_type?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          active?: boolean | null
          company_id?: string | null
          content?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dynamic_fields?: Json | null
          id?: string
          is_global?: boolean | null
          name?: string
          parent_template_id?: string | null
          static_content?: string | null
          template_type?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_password_reset_token: {
        Args: { user_email: string }
        Returns: string
      }
      create_user_profile: {
        Args: {
          user_id: string
          user_email: string
          first_name: string
          last_name: string
          user_role?: Database["public"]["Enums"]["user_role"]
          company_id?: string
        }
        Returns: string
      }
      get_user_company: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      log_audit: {
        Args: {
          p_table_name: string
          p_action: string
          p_record_id?: string
          p_old_values?: Json
          p_new_values?: Json
          p_ip_address?: unknown
          p_user_agent?: string
          p_session_id?: string
          p_request_path?: string
          p_request_method?: string
        }
        Returns: string
      }
      update_template_workflow_state: {
        Args: { p_template_id: string; p_new_state: string; p_notes?: string }
        Returns: string
      }
      validate_reset_token: {
        Args: { token_param: string }
        Returns: string
      }
    }
    Enums: {
      document_status: "pendiente" | "firmado" | "vencido"
      sale_status:
        | "borrador"
        | "enviado"
        | "firmado"
        | "completado"
        | "cancelado"
      user_role: "super_admin" | "admin" | "gestor" | "vendedor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      document_status: ["pendiente", "firmado", "vencido"],
      sale_status: [
        "borrador",
        "enviado",
        "firmado",
        "completado",
        "cancelado",
      ],
      user_role: ["super_admin", "admin", "gestor", "vendedor"],
    },
  },
} as const
