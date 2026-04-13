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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      analysis_errors: {
        Row: {
          created_at: string | null
          document_id: string | null
          error_message: string | null
          id: string
          page_number: number | null
          raw_response: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          page_number?: number | null
          raw_response?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          error_message?: string | null
          id?: string
          page_number?: number | null
          raw_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_errors_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      cached_analysis: {
        Row: {
          analysis_status: string | null
          analyzed_at: string | null
          claude_model: string | null
          document_id: string
          error_message: string | null
          fields_json: Json
          id: string
          page_number: number
          raw_page_text: string | null
          tokens_used: number | null
        }
        Insert: {
          analysis_status?: string | null
          analyzed_at?: string | null
          claude_model?: string | null
          document_id: string
          error_message?: string | null
          fields_json: Json
          id?: string
          page_number: number
          raw_page_text?: string | null
          tokens_used?: number | null
        }
        Update: {
          analysis_status?: string | null
          analyzed_at?: string | null
          claude_model?: string | null
          document_id?: string
          error_message?: string | null
          fields_json?: Json
          id?: string
          page_number?: number
          raw_page_text?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cached_analysis_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_fields: {
        Row: {
          category: string | null
          created_at: string | null
          detect_hint: string | null
          document_id: string
          field_id: string
          field_type: string
          global_key: string
          id: string
          is_required: boolean | null
          label: string
          order_index: number | null
          page_number: number
          select_options: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          detect_hint?: string | null
          document_id: string
          field_id: string
          field_type: string
          global_key: string
          id?: string
          is_required?: boolean | null
          label: string
          order_index?: number | null
          page_number: number
          select_options?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          detect_hint?: string | null
          document_id?: string
          field_id?: string
          field_type?: string
          global_key?: string
          id?: string
          is_required?: boolean | null
          label?: string
          order_index?: number | null
          page_number?: number
          select_options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_fields_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          department_scope: string | null
          download_count: number | null
          id: string
          is_published: boolean | null
          is_template: boolean | null
          original_filename: string
          pages_completed: number | null
          published_at: string | null
          semester_scope: string | null
          shared_link_id: string | null
          status: string | null
          storage_path: string
          template_description: string | null
          template_label: string | null
          template_name: string | null
          total_pages: number | null
          updated_at: string | null
          uploaded_by_role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_scope?: string | null
          download_count?: number | null
          id?: string
          is_published?: boolean | null
          is_template?: boolean | null
          original_filename: string
          pages_completed?: number | null
          published_at?: string | null
          semester_scope?: string | null
          shared_link_id?: string | null
          status?: string | null
          storage_path?: string
          template_description?: string | null
          template_label?: string | null
          template_name?: string | null
          total_pages?: number | null
          updated_at?: string | null
          uploaded_by_role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_scope?: string | null
          download_count?: number | null
          id?: string
          is_published?: boolean | null
          is_template?: boolean | null
          original_filename?: string
          pages_completed?: number | null
          published_at?: string | null
          semester_scope?: string | null
          shared_link_id?: string | null
          status?: string | null
          storage_path?: string
          template_description?: string | null
          template_label?: string | null
          template_name?: string | null
          total_pages?: number | null
          updated_at?: string | null
          uploaded_by_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      field_responses: {
        Row: {
          document_id: string
          field_id: string
          global_key: string
          id: string
          student_document_id: string | null
          updated_at: string | null
          user_id: string
          value: string | null
        }
        Insert: {
          document_id: string
          field_id: string
          global_key: string
          id?: string
          student_document_id?: string | null
          updated_at?: string | null
          user_id: string
          value?: string | null
        }
        Update: {
          document_id?: string
          field_id?: string
          global_key?: string
          id?: string
          student_document_id?: string | null
          updated_at?: string | null
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_responses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_responses_student_document_id_fkey"
            columns: ["student_document_id"]
            isOneToOne: false
            referencedRelation: "student_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_id: string | null
          expires_at: string | null
          id: string
          label: string | null
          max_uses: number | null
          uses: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          uses?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "share_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          completed_at: string | null
          downloaded_at: string | null
          generated_file_path: string | null
          id: string
          pages_completed: number | null
          source_document_id: string
          started_at: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          downloaded_at?: string | null
          generated_file_path?: string | null
          id?: string
          pages_completed?: number | null
          source_document_id: string
          started_at?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          completed_at?: string | null
          downloaded_at?: string | null
          generated_file_path?: string | null
          id?: string
          pages_completed?: number | null
          source_document_id?: string
          started_at?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      template_overrides: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          original_template_text: string
          override_text: string
          page_number: number
          student_document_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          original_template_text: string
          override_text: string
          page_number: number
          student_document_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          original_template_text?: string
          override_text?: string
          page_number?: number
          student_document_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_overrides_student_document_id_fkey"
            columns: ["student_document_id"]
            isOneToOne: false
            referencedRelation: "student_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          academic_year: string | null
          class: string | null
          college_name: string | null
          created_at: string | null
          department: string | null
          division: string | null
          enrollment_number: string | null
          full_name: string | null
          id: string
          role: string
          roll_number: string | null
          sap_id: string | null
          semester: string | null
          university_name: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          class?: string | null
          college_name?: string | null
          created_at?: string | null
          department?: string | null
          division?: string | null
          enrollment_number?: string | null
          full_name?: string | null
          id: string
          role?: string
          roll_number?: string | null
          sap_id?: string | null
          semester?: string | null
          university_name?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          class?: string | null
          college_name?: string | null
          created_at?: string | null
          department?: string | null
          division?: string | null
          enrollment_number?: string | null
          full_name?: string | null
          id?: string
          role?: string
          roll_number?: string | null
          sap_id?: string | null
          semester?: string | null
          university_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          current_period_end: string | null
          docs_used_this_month: number | null
          plan: string | null
          razorpay_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_period_end?: string | null
          docs_used_this_month?: number | null
          plan?: string | null
          razorpay_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_period_end?: string | null
          docs_used_this_month?: number | null
          plan?: string | null
          razorpay_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
