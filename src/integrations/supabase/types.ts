export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_comments: {
        Row: {
          audit_action: string | null
          comment: string
          created_at: string
          id: string
          sale_id: string
          sale_status_at_comment: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audit_action?: string | null
          comment: string
          created_at?: string
          id?: string
          sale_id: string
          sale_status_at_comment?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audit_action?: string | null
          comment?: string
          created_at?: string
          id?: string
          sale_id?: string
          sale_status_at_comment?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_comments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_processes: {
        Row: {
          auditor_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          sale_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          auditor_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          sale_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          auditor_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          sale_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_processes_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_attempts: {
        Row: {
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          address: string | null
          amount: number | null
          birth_date: string | null
          city: string | null
          created_at: string | null
          dni: string | null
          document_number: string | null
          document_type: string | null
          email: string | null
          first_name: string
          gender: string | null
          has_preexisting_conditions: boolean | null
          id: string
          is_primary: boolean | null
          last_name: string
          marital_status: string | null
          occupation: string | null
          phone: string | null
          postal_code: string | null
          preexisting_conditions_detail: string | null
          province: string | null
          relationship: string | null
          sale_id: string
          signature_link_id: string | null
          signature_required: boolean | null
        }
        Insert: {
          address?: string | null
          amount?: number | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          dni?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          has_preexisting_conditions?: boolean | null
          id?: string
          is_primary?: boolean | null
          last_name: string
          marital_status?: string | null
          occupation?: string | null
          phone?: string | null
          postal_code?: string | null
          preexisting_conditions_detail?: string | null
          province?: string | null
          relationship?: string | null
          sale_id: string
          signature_link_id?: string | null
          signature_required?: boolean | null
        }
        Update: {
          address?: string | null
          amount?: number | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          dni?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          has_preexisting_conditions?: boolean | null
          id?: string
          is_primary?: boolean | null
          last_name?: string
          marital_status?: string | null
          occupation?: string | null
          phone?: string | null
          postal_code?: string | null
          preexisting_conditions_detail?: string | null
          province?: string | null
          relationship?: string | null
          sale_id?: string
          signature_link_id?: string | null
          signature_required?: boolean | null
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
      beneficiary_documents: {
        Row: {
          beneficiary_id: string
          created_at: string | null
          document_type_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_verified: boolean | null
          upload_source: string | null
          uploaded_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          beneficiary_id: string
          created_at?: string | null
          document_type_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_verified?: boolean | null
          upload_source?: string | null
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          beneficiary_id?: string
          created_at?: string | null
          document_type_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_verified?: boolean | null
          upload_source?: string | null
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiary_documents_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiary_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          company_id: string
          country_id: string | null
          created_at: string | null
          dni: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          company_id: string
          country_id?: string | null
          created_at?: string | null
          dni?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          company_id?: string
          country_id?: string | null
          created_at?: string | null
          dni?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          channel: string
          client_id: string | null
          company_id: string
          content: string | null
          created_at: string | null
          direction: string | null
          id: string
          sale_id: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          channel: string
          client_id?: string | null
          company_id: string
          content?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          sale_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          channel?: string
          client_id?: string | null
          company_id?: string
          content?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          sale_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          accent_color: string | null
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          login_background_url: string | null
          login_logo_url: string | null
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          tax_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          login_background_url?: string | null
          login_logo_url?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          login_background_url?: string | null
          login_logo_url?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_currency_settings: {
        Row: {
          company_id: string
          created_at: string | null
          currency_code: string | null
          currency_symbol: string | null
          decimal_places: number | null
          decimal_separator: string | null
          id: string
          thousand_separator: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          decimal_places?: number | null
          decimal_separator?: string | null
          id?: string
          thousand_separator?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          decimal_places?: number | null
          decimal_separator?: string | null
          id?: string
          thousand_separator?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_currency_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_id: string
          created_at: string | null
          email_api_key: string | null
          email_from_address: string | null
          email_from_name: string | null
          id: string
          sms_api_key: string | null
          sms_sender_id: string | null
          updated_at: string | null
          whatsapp_api_key: string | null
          whatsapp_phone_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email_api_key?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          id?: string
          sms_api_key?: string | null
          sms_sender_id?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
          whatsapp_phone_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email_api_key?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          id?: string
          sms_api_key?: string | null
          sms_sender_id?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
          whatsapp_phone_id?: string | null
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
      company_ui_settings: {
        Row: {
          company_id: string
          created_at: string | null
          dashboard_layout: Json | null
          id: string
          sidebar_collapsed: boolean | null
          theme: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dashboard_layout?: Json | null
          id?: string
          sidebar_collapsed?: boolean | null
          theme?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dashboard_layout?: Json | null
          id?: string
          sidebar_collapsed?: boolean | null
          theme?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_ui_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_workflow_config: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean
          updated_at: string | null
          updated_by: string | null
          workflow_config: Json
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
          updated_by?: string | null
          workflow_config?: Json
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
          updated_by?: string | null
          workflow_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "company_workflow_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          phone_code: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          phone_code?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          phone_code?: string | null
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_visible: boolean | null
          position: number | null
          updated_at: string | null
          user_id: string
          widget_type: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          position?: number | null
          updated_at?: string | null
          user_id: string
          widget_type: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          position?: number | null
          updated_at?: string | null
          user_id?: string
          widget_type?: string
        }
        Relationships: []
      }
      document_access_logs: {
        Row: {
          access_type: string | null
          created_at: string | null
          document_id: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          access_type?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_package_items: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          is_required: boolean | null
          package_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          is_required?: boolean | null
          package_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          is_required?: boolean | null
          package_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_package_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "document_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      document_packages: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          package_type: string | null
          sale_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          package_type?: string | null
          sale_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          package_type?: string | null
          sale_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_packages_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          applies_to: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
          requires_signature: boolean | null
          sort_order: number | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          applies_to?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
          requires_signature?: boolean | null
          sort_order?: number | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          applies_to?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
          requires_signature?: boolean | null
          sort_order?: number | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_types_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          beneficiary_id: string | null
          content: string | null
          created_at: string | null
          document_type: string | null
          document_type_id: string | null
          file_url: string | null
          generated_from_template: boolean | null
          id: string
          is_final: boolean | null
          name: string
          requires_signature: boolean | null
          sale_id: string
          signature_data: string | null
          signed_at: string | null
          signed_by: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          beneficiary_id?: string | null
          content?: string | null
          created_at?: string | null
          document_type?: string | null
          document_type_id?: string | null
          file_url?: string | null
          generated_from_template?: boolean | null
          id?: string
          is_final?: boolean | null
          name: string
          requires_signature?: boolean | null
          sale_id: string
          signature_data?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          beneficiary_id?: string | null
          content?: string | null
          created_at?: string | null
          document_type?: string | null
          document_type_id?: string | null
          file_url?: string | null
          generated_from_template?: boolean | null
          id?: string
          is_final?: boolean | null
          name?: string
          requires_signature?: boolean | null
          sale_id?: string
          signature_data?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          clicked_count: number | null
          company_id: string
          created_at: string | null
          id: string
          name: string
          opened_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          subject: string | null
          template_id: string | null
        }
        Insert: {
          clicked_count?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
        }
        Update: {
          clicked_count?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      file_uploads: {
        Row: {
          company_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      information_requests: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          request_type: string
          requested_by: string | null
          responded_at: string | null
          response: string | null
          sale_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          request_type: string
          requested_by?: string | null
          responded_at?: string | null
          response?: string | null
          sale_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          request_type?: string
          requested_by?: string | null
          responded_at?: string | null
          response?: string | null
          sale_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "information_requests_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
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
          company_id: string
          coverage_details: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          coverage_details?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          coverage_details?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
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
        ]
      }
      process_traces: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          sale_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          sale_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          sale_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_traces_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
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
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          sale_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          sale_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          sale_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_documents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_notes: {
        Row: {
          created_at: string | null
          id: string
          is_internal: boolean | null
          note_text: string
          sale_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          note_text: string
          sale_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          note_text?: string
          sale_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_notes_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_requirements: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          requirement_text: string
          sale_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          requirement_text: string
          sale_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          requirement_text?: string
          sale_id?: string
        }
        Relationships: [
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
          id: string
          sale_id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          sale_id: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          sale_id?: string
          template_id?: string
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
      sale_workflow_states: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: string
          previous_status: string | null
          sale_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status: string
          previous_status?: string | null
          sale_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string
          previous_status?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_workflow_states_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          adherents_count: number | null
          all_signatures_completed: boolean | null
          audit_notes: string | null
          audit_status: string | null
          audited_at: string | null
          auditor_id: string | null
          billing_email: string | null
          billing_phone: string | null
          billing_razon_social: string | null
          billing_ruc: string | null
          client_id: string | null
          company_id: string
          contract_number: string | null
          contract_pdf_url: string | null
          contract_start_date: string | null
          created_at: string | null
          id: string
          notes: string | null
          plan_id: string | null
          request_number: string | null
          requires_adherents: boolean | null
          sale_date: string | null
          salesperson_id: string | null
          signature_completed_at: string | null
          signature_expires_at: string | null
          signature_token: string | null
          signed_at: string | null
          signed_ip: string | null
          signer_dni: string | null
          signer_name: string | null
          signer_relationship: string | null
          signer_type: string | null
          status: Database["public"]["Enums"]["sale_status"] | null
          template_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          adherents_count?: number | null
          all_signatures_completed?: boolean | null
          audit_notes?: string | null
          audit_status?: string | null
          audited_at?: string | null
          auditor_id?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          billing_razon_social?: string | null
          billing_ruc?: string | null
          client_id?: string | null
          company_id: string
          contract_number?: string | null
          contract_pdf_url?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          request_number?: string | null
          requires_adherents?: boolean | null
          sale_date?: string | null
          salesperson_id?: string | null
          signature_completed_at?: string | null
          signature_expires_at?: string | null
          signature_token?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          signer_dni?: string | null
          signer_name?: string | null
          signer_relationship?: string | null
          signer_type?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          template_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          adherents_count?: number | null
          all_signatures_completed?: boolean | null
          audit_notes?: string | null
          audit_status?: string | null
          audited_at?: string | null
          auditor_id?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          billing_razon_social?: string | null
          billing_ruc?: string | null
          client_id?: string | null
          company_id?: string
          contract_number?: string | null
          contract_pdf_url?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          request_number?: string | null
          requires_adherents?: boolean | null
          sale_date?: string | null
          salesperson_id?: string | null
          signature_completed_at?: string | null
          signature_expires_at?: string | null
          signature_token?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          signer_dni?: string | null
          signer_name?: string | null
          signer_relationship?: string | null
          signer_type?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          template_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
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
            foreignKeyName: "sales_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_links: {
        Row: {
          access_count: number | null
          accessed_at: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          ip_addresses: Json | null
          package_id: string | null
          recipient_email: string | null
          recipient_id: string | null
          recipient_phone: string | null
          recipient_type: string
          sale_id: string
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          accessed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          ip_addresses?: Json | null
          package_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          recipient_type: string
          sale_id: string
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          accessed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          ip_addresses?: Json | null
          package_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          recipient_type?: string
          sale_id?: string
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_links_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "document_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_links_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_workflow_steps: {
        Row: {
          completed_at: string | null
          created_at: string | null
          data: Json | null
          document_id: string | null
          id: string
          signature_link_id: string
          started_at: string | null
          status: string | null
          step_order: number
          step_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          document_id?: string | null
          id?: string
          signature_link_id: string
          started_at?: string | null
          status?: string | null
          step_order: number
          step_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          document_id?: string | null
          id?: string
          signature_link_id?: string
          started_at?: string | null
          status?: string | null
          step_order?: number
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_workflow_steps_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_workflow_steps_signature_link_id_fkey"
            columns: ["signature_link_id"]
            isOneToOne: false
            referencedRelation: "signature_links"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string
          sale_id: string
          signature_data: string
          signed_at: string | null
          signer_email: string | null
          signer_ip: string | null
          signer_name: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          sale_id: string
          signature_data: string
          signed_at?: string | null
          signer_email?: string | null
          signer_ip?: string | null
          signer_name?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          sale_id?: string
          signature_data?: string
          signed_at?: string | null
          signer_email?: string | null
          signer_ip?: string | null
          signer_name?: string | null
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
          company_id: string
          created_at: string | null
          id: string
          message: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          message: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          message?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      template_analytics: {
        Row: {
          avg_completion_time: number | null
          completions_count: number | null
          created_at: string | null
          id: string
          last_used_at: string | null
          template_id: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          avg_completion_time?: number | null
          completions_count?: number | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          template_id: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          avg_completion_time?: number | null
          completions_count?: number | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          template_id?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          id: string
          template_id: string
          user_id: string | null
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          id?: string
          template_id: string
          user_id?: string | null
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          id?: string
          template_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_comments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_placeholders: {
        Row: {
          created_at: string | null
          default_value: string | null
          description: string | null
          id: string
          is_system: boolean | null
          placeholder_label: string
          placeholder_name: string
          placeholder_type: string | null
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          placeholder_label: string
          placeholder_name: string
          placeholder_type?: string | null
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          placeholder_label?: string
          placeholder_name?: string
          placeholder_type?: string | null
        }
        Relationships: []
      }
      template_question_options: {
        Row: {
          created_at: string | null
          id: string
          option_text: string
          option_value: string | null
          question_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_text: string
          option_value?: string | null
          question_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_text?: string
          option_value?: string | null
          question_id?: string
          sort_order?: number | null
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
          created_at: string | null
          id: string
          is_required: boolean | null
          placeholder_name: string | null
          question_text: string
          question_type: string | null
          sort_order: number | null
          template_id: string
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          placeholder_name?: string | null
          question_text: string
          question_type?: string | null
          sort_order?: number | null
          template_id: string
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          placeholder_name?: string | null
          question_text?: string
          question_type?: string | null
          sort_order?: number | null
          template_id?: string
          validation_rules?: Json | null
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
          created_at: string | null
          id: string
          question_id: string
          response_value: string | null
          sale_id: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          response_value?: string | null
          sale_id: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          response_value?: string | null
          sale_id?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
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
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          template_id: string
          version_number: number
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          template_id: string
          version_number: number
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          template_id?: string
          version_number?: number
        }
        Relationships: [
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
          created_at: string | null
          id: string
          is_final: boolean | null
          state_name: string
          state_order: number | null
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_final?: boolean | null
          state_name: string
          state_order?: number | null
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_final?: boolean | null
          state_name?: string
          state_order?: number | null
          template_id?: string
        }
        Relationships: [
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
          company_id: string
          content: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          pdf_layout: Json | null
          requires_signature: boolean | null
          template_type: string | null
          updated_at: string | null
          uses_dynamic_fields: boolean | null
          version: number | null
        }
        Insert: {
          company_id: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pdf_layout?: Json | null
          requires_signature?: boolean | null
          template_type?: string | null
          updated_at?: string | null
          uses_dynamic_fields?: boolean | null
          version?: number | null
        }
        Update: {
          company_id?: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pdf_layout?: Json | null
          requires_signature?: boolean | null
          template_type?: string | null
          updated_at?: string | null
          uses_dynamic_fields?: boolean | null
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
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          company_id: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          message_body: string
          message_type: string | null
          phone_number: string
          read_at: string | null
          sale_id: string | null
          sent_at: string | null
          sent_by: string | null
          signature_link_id: string | null
          status: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_body: string
          message_type?: string | null
          phone_number: string
          read_at?: string | null
          sale_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          signature_link_id?: string | null
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_body?: string
          message_type?: string | null
          phone_number?: string
          read_at?: string | null
          sale_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          signature_link_id?: string | null
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_signature_link_id_fkey"
            columns: ["signature_link_id"]
            isOneToOne: false
            referencedRelation: "signature_links"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notifications: {
        Row: {
          company_id: string
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          phone_number: string
          sale_id: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          phone_number: string
          sale_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          phone_number?: string
          sale_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notifications_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_all_signatures_completed: {
        Args: { p_sale_id: string }
        Returns: boolean
      }
      get_sale_id_from_signature_token: { Args: never; Returns: string }
      get_signature_link_id_from_token: { Args: never; Returns: string }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "gestor"
        | "vendedor"
        | "supervisor"
        | "auditor"
        | "financiero"
      document_status: "pendiente" | "firmado" | "vencido"
      sale_status:
        | "borrador"
        | "enviado"
        | "firmado"
        | "completado"
        | "cancelado"
        | "pendiente"
        | "en_auditoria"
        | "rechazado"
        | "aprobado_para_templates"
        | "preparando_documentos"
        | "esperando_ddjj"
        | "en_revision"
        | "listo_para_enviar"
        | "firmado_parcial"
        | "expirado"
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
      app_role: [
        "super_admin",
        "admin",
        "gestor",
        "vendedor",
        "supervisor",
        "auditor",
        "financiero",
      ],
      document_status: ["pendiente", "firmado", "vencido"],
      sale_status: [
        "borrador",
        "enviado",
        "firmado",
        "completado",
        "cancelado",
        "pendiente",
        "en_auditoria",
        "rechazado",
        "aprobado_para_templates",
        "preparando_documentos",
        "esperando_ddjj",
        "en_revision",
        "listo_para_enviar",
        "firmado_parcial",
        "expirado",
      ],
    },
  },
} as const
