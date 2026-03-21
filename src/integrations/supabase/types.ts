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
      activ_reset_clients: {
        Row: {
          created_at: string
          current_phase: number | null
          cycle: number | null
          id: string
          name: string
          notes: string | null
          objectif_atteint: boolean | null
          offre: string | null
          phases: Json
          phone: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_phase?: number | null
          cycle?: number | null
          id: string
          name: string
          notes?: string | null
          objectif_atteint?: boolean | null
          offre?: string | null
          phases?: Json
          phone?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_phase?: number | null
          cycle?: number | null
          id?: string
          name?: string
          notes?: string | null
          objectif_atteint?: boolean | null
          offre?: string | null
          phases?: Json
          phone?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          portage_enabled: boolean | null
          portage_months: Json | null
          updated_at: string
          user_id: string
          versements_perso: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          portage_enabled?: boolean | null
          portage_months?: Json | null
          updated_at?: string
          user_id: string
          versements_perso?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          portage_enabled?: boolean | null
          portage_months?: Json | null
          updated_at?: string
          user_id?: string
          versements_perso?: Json | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          label: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          date: string
          id: string
          label: string
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          label?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount: number
          cash_declaration: string | null
          client_name: string | null
          created_at: string
          id: string
          installment_group: string | null
          installment_index: number | null
          installment_total: number | null
          label: string
          month: string
          offre: string | null
          payment_mode: string | null
          sap_hours: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          cash_declaration?: string | null
          client_name?: string | null
          created_at?: string
          id: string
          installment_group?: string | null
          installment_index?: number | null
          installment_total?: number | null
          label: string
          month: string
          offre?: string | null
          payment_mode?: string | null
          sap_hours?: number | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cash_declaration?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          installment_group?: string | null
          installment_index?: number | null
          installment_total?: number | null
          label?: string
          month?: string
          offre?: string | null
          payment_mode?: string | null
          sap_hours?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      offres: {
        Row: {
          active: boolean
          created_at: string
          duration: Json | null
          id: string
          is_ala_carte: boolean | null
          min_quantity: number | null
          name: string
          price: number
          price_history: Json
          theme: string | null
          tva_enabled: boolean | null
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration?: Json | null
          id: string
          is_ala_carte?: boolean | null
          min_quantity?: number | null
          name: string
          price?: number
          price_history?: Json
          theme?: string | null
          tva_enabled?: boolean | null
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          duration?: Json | null
          id?: string
          is_ala_carte?: boolean | null
          min_quantity?: number | null
          name?: string
          price?: number
          price_history?: Json
          theme?: string | null
          tva_enabled?: boolean | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          age: number | null
          bilan_validated: boolean | null
          closing: string | null
          contact: string | null
          created_at: string
          date: string | null
          heure: string | null
          id: string
          name: string
          note_bilan: number | null
          note_profil: number | null
          notes: string | null
          objectif: string | null
          objection: string | null
          offre: string | null
          presence: string | null
          prix_reel: number | null
          profile: string | null
          sap_enabled: boolean | null
          sex: string
          source: string | null
          statut: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          bilan_validated?: boolean | null
          closing?: string | null
          contact?: string | null
          created_at?: string
          date?: string | null
          heure?: string | null
          id: string
          name: string
          note_bilan?: number | null
          note_profil?: number | null
          notes?: string | null
          objectif?: string | null
          objection?: string | null
          offre?: string | null
          presence?: string | null
          prix_reel?: number | null
          profile?: string | null
          sap_enabled?: boolean | null
          sex?: string
          source?: string | null
          statut?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          bilan_validated?: boolean | null
          closing?: string | null
          contact?: string | null
          created_at?: string
          date?: string | null
          heure?: string | null
          id?: string
          name?: string
          note_bilan?: number | null
          note_profil?: number | null
          notes?: string | null
          objectif?: string | null
          objection?: string | null
          offre?: string | null
          presence?: string | null
          prix_reel?: number | null
          profile?: string | null
          sap_enabled?: boolean | null
          sex?: string
          source?: string | null
          statut?: string | null
          type?: string | null
          updated_at?: string
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
