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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_opinions: {
        Row: {
          ai_name: string
          company: string | null
          created_at: string
          id: string
          position: number
          quote: string
          updated_at: string
        }
        Insert: {
          ai_name: string
          company?: string | null
          created_at?: string
          id?: string
          position?: number
          quote: string
          updated_at?: string
        }
        Update: {
          ai_name?: string
          company?: string | null
          created_at?: string
          id?: string
          position?: number
          quote?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_page_overrides: {
        Row: {
          case_id: string
          created_at: string
          featured: boolean
          hidden: boolean
          id: string
          page_id: string
          position: number
        }
        Insert: {
          case_id: string
          created_at?: string
          featured?: boolean
          hidden?: boolean
          id?: string
          page_id: string
          position?: number
        }
        Update: {
          case_id?: string
          created_at?: string
          featured?: boolean
          hidden?: boolean
          id?: string
          page_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_page_overrides_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_page_overrides_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          after_url: string | null
          age: string | null
          area: string
          before_url: string | null
          cover_url: string | null
          created_at: string
          dosage: string | null
          duration: string | null
          gallery: Json
          highlight: boolean
          id: string
          notes: string | null
          position: number
          slug: string
          toxin: string | null
          updated_at: string
        }
        Insert: {
          after_url?: string | null
          age?: string | null
          area: string
          before_url?: string | null
          cover_url?: string | null
          created_at?: string
          dosage?: string | null
          duration?: string | null
          gallery?: Json
          highlight?: boolean
          id?: string
          notes?: string | null
          position?: number
          slug: string
          toxin?: string | null
          updated_at?: string
        }
        Update: {
          after_url?: string | null
          age?: string | null
          area?: string
          before_url?: string | null
          cover_url?: string | null
          created_at?: string
          dosage?: string | null
          duration?: string | null
          gallery?: Json
          highlight?: boolean
          id?: string
          notes?: string | null
          position?: number
          slug?: string
          toxin?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          audience: string | null
          created_at: string
          description: string | null
          duration: string | null
          id: string
          long_description: string | null
          position: number
          price_label: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          long_description?: string | null
          position?: number
          price_label?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          long_description?: string | null
          position?: number
          price_label?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          featured: boolean
          id: string
          position: number
          question: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          featured?: boolean
          id?: string
          position?: number
          question: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          featured?: boolean
          id?: string
          position?: number
          question?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      image_bank: {
        Row: {
          category: string | null
          created_at: string
          id: string
          tags: string[] | null
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      page_blocks: {
        Row: {
          created_at: string
          data: Json
          enabled: boolean
          html_content: string | null
          id: string
          mode: Database["public"]["Enums"]["block_mode"]
          page_id: string
          position: number
          type: Database["public"]["Enums"]["block_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          enabled?: boolean
          html_content?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["block_mode"]
          page_id: string
          position?: number
          type: Database["public"]["Enums"]["block_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          enabled?: boolean
          html_content?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["block_mode"]
          page_id?: string
          position?: number
          type?: Database["public"]["Enums"]["block_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          categoria: string
          cidade: string
          compliance_score: number | null
          created_at: string
          fidelity_score: string | null
          id: string
          is_reviewed: boolean | null
          last_scanned_at: string | null
          meta_description: string | null
          meta_title: string | null
          metadata: Json
          modificador: string | null
          modificador_tipo:
            | Database["public"]["Enums"]["modificador_tipo"]
            | null
          procedimento: string
          published_at: string | null
          published_snapshot: Json | null
          seo_score: number | null
          slug: string
          slug_override: boolean
          source_metadata: Json | null
          source_snapshot: string | null
          status: Database["public"]["Enums"]["page_status"]
          title: string
          updated_at: string
          url_path: string
        }
        Insert: {
          categoria?: string
          cidade?: string
          compliance_score?: number | null
          created_at?: string
          fidelity_score?: string | null
          id?: string
          is_reviewed?: boolean | null
          last_scanned_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          metadata?: Json
          modificador?: string | null
          modificador_tipo?:
            | Database["public"]["Enums"]["modificador_tipo"]
            | null
          procedimento: string
          published_at?: string | null
          published_snapshot?: Json | null
          seo_score?: number | null
          slug: string
          slug_override?: boolean
          source_metadata?: Json | null
          source_snapshot?: string | null
          status?: Database["public"]["Enums"]["page_status"]
          title: string
          updated_at?: string
          url_path: string
        }
        Update: {
          categoria?: string
          cidade?: string
          compliance_score?: number | null
          created_at?: string
          fidelity_score?: string | null
          id?: string
          is_reviewed?: boolean | null
          last_scanned_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          metadata?: Json
          modificador?: string | null
          modificador_tipo?:
            | Database["public"]["Enums"]["modificador_tipo"]
            | null
          procedimento?: string
          published_at?: string | null
          published_snapshot?: Json | null
          seo_score?: number | null
          slug?: string
          slug_override?: boolean
          source_metadata?: Json | null
          source_snapshot?: string | null
          status?: Database["public"]["Enums"]["page_status"]
          title?: string
          updated_at?: string
          url_path?: string
        }
        Relationships: []
      }
      procedure_documents: {
        Row: {
          approved_at: string | null
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          html_content: string | null
          id: string
          page_id: string
          published_at: string | null
          reviewed_at: string | null
          slug: string
          source_context: Json | null
          status: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          html_content?: string | null
          id?: string
          page_id: string
          published_at?: string | null
          reviewed_at?: string | null
          slug: string
          source_context?: Json | null
          status?: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          html_content?: string | null
          id?: string
          page_id?: string
          published_at?: string | null
          reviewed_at?: string | null
          slug?: string
          source_context?: Json | null
          status?: Database["public"]["Enums"]["document_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_documents_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          date_label: string | null
          id: string
          name: string
          position: number
          rating: number
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_label?: string | null
          id?: string
          name: string
          position?: number
          rating?: number
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_label?: string | null
          id?: string
          name?: string
          position?: number
          rating?: number
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      scraping_logs: {
        Row: {
          content_snapshot: string | null
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          id: string
          metadata: Json | null
          source_origin: string | null
          status: string | null
          task_type: string
          url: string | null
        }
        Insert: {
          content_snapshot?: string | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          metadata?: Json | null
          source_origin?: string | null
          status?: string | null
          task_type: string
          url?: string | null
        }
        Update: {
          content_snapshot?: string | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          metadata?: Json | null
          source_origin?: string | null
          status?: string | null
          task_type?: string
          url?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string | null
          alvara: string | null
          cep: string | null
          cnpj: string | null
          data: Json
          google_maps_url: string | null
          id: number
          phone: string | null
          rt_image: string | null
          rt_name: string | null
          rt_register: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          alvara?: string | null
          cep?: string | null
          cnpj?: string | null
          data?: Json
          google_maps_url?: string | null
          id?: number
          phone?: string | null
          rt_image?: string | null
          rt_name?: string | null
          rt_register?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          alvara?: string | null
          cep?: string | null
          cnpj?: string | null
          data?: Json
          google_maps_url?: string | null
          id?: number
          phone?: string | null
          rt_image?: string | null
          rt_name?: string | null
          rt_register?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      slug_redirects: {
        Row: {
          created_at: string
          id: string
          old_path: string
          page_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          old_path: string
          page_id: string
        }
        Update: {
          created_at?: string
          id?: string
          old_path?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slug_redirects_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      site_settings_public: {
        Row: {
          address: string | null
          cep: string | null
          google_maps_url: string | null
          id: number | null
          phone: string | null
          rt_image: string | null
          rt_name: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          cep?: string | null
          google_maps_url?: string | null
          id?: number | null
          phone?: string | null
          rt_image?: string | null
          rt_name?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          cep?: string | null
          google_maps_url?: string | null
          id?: number | null
          phone?: string | null
          rt_image?: string | null
          rt_name?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_page: { Args: { _page_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin"
      block_mode: "structured" | "html"
      block_type:
        | "hero"
        | "authority_strip"
        | "manifesto_curto"
        | "metodo"
        | "casos"
        | "preco_ancora"
        | "depoimentos"
        | "ai_opinions"
        | "equipe_rt"
        | "cursos"
        | "faq"
        | "cta_final"
        | "procedimento_detalhado"
        | "beneficios_grid"
        | "procedimento_detalhado_v2"
      document_status: "draft" | "reviewed" | "approved" | "published"
      document_type: "tcle" | "technical_differential"
      modificador_tipo: "publico" | "indicacao" | "objetivo" | "area_corporal"
      page_status: "draft" | "published"
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
      app_role: ["admin"],
      block_mode: ["structured", "html"],
      block_type: [
        "hero",
        "authority_strip",
        "manifesto_curto",
        "metodo",
        "casos",
        "preco_ancora",
        "depoimentos",
        "ai_opinions",
        "equipe_rt",
        "cursos",
        "faq",
        "cta_final",
        "procedimento_detalhado",
        "beneficios_grid",
        "procedimento_detalhado_v2",
      ],
      document_status: ["draft", "reviewed", "approved", "published"],
      document_type: ["tcle", "technical_differential"],
      modificador_tipo: ["publico", "indicacao", "objetivo", "area_corporal"],
      page_status: ["draft", "published"],
    },
  },
} as const
