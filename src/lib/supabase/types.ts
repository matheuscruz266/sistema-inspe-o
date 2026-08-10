// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
  public: {
    Tables: {
      access_levels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          permissions: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          permissions?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          permissions?: Json
        }
        Relationships: []
      }
      app_users: {
        Row: {
          access_level_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          access_level_id?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          name: string
        }
        Update: {
          access_level_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'app_users_access_level_id_fkey'
            columns: ['access_level_id']
            isOneToOne: false
            referencedRelation: 'access_levels'
            referencedColumns: ['id']
          },
        ]
      }
      drivers: {
        Row: {
          birth_date: string | null
          cpf: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          whatsapp: string | null
        }
        Insert: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          whatsapp?: string | null
        }
        Update: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      inspection_plans: {
        Row: {
          checklist: Json | null
          created_at: string
          id: string
          last_inspection: string | null
          next_inspection: string | null
          periodicity: string
          plate: string
          responsible: string
          status: string
          vehicle_type: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          id?: string
          last_inspection?: string | null
          next_inspection?: string | null
          periodicity?: string
          plate: string
          responsible?: string
          status?: string
          vehicle_type: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          id?: string
          last_inspection?: string | null
          next_inspection?: string | null
          periodicity?: string
          plate?: string
          responsible?: string
          status?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      inspections: {
        Row: {
          created_at: string
          date: string
          driver_name: string | null
          failed_items: Json | null
          id: string
          notes: string | null
          plate: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          date?: string
          driver_name?: string | null
          failed_items?: Json | null
          id?: string
          notes?: string | null
          plate: string
          status?: string
          type?: string
        }
        Update: {
          created_at?: string
          date?: string
          driver_name?: string | null
          failed_items?: Json | null
          id?: string
          notes?: string | null
          plate?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      maintenance_plans: {
        Row: {
          checklist: Json | null
          created_at: string
          id: string
          name: string
          next_execution: string | null
          periodicity: string | null
          responsible: string | null
          status: string
          target_plate: string | null
          target_vehicle_type: string | null
          type: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          id?: string
          name: string
          next_execution?: string | null
          periodicity?: string | null
          responsible?: string | null
          status?: string
          target_plate?: string | null
          target_vehicle_type?: string | null
          type?: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          id?: string
          name?: string
          next_execution?: string | null
          periodicity?: string | null
          responsible?: string | null
          status?: string
          target_plate?: string | null
          target_vehicle_type?: string | null
          type?: string
        }
        Relationships: []
      }
      mechanics: {
        Row: {
          cpf: string | null
          created_at: string
          hourly_rate: number | null
          id: string
          name: string
          phone: string | null
          specialty: string | null
          status: string
          whatsapp: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          name: string
          phone?: string | null
          specialty?: string | null
          status?: string
          whatsapp?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          name?: string
          phone?: string | null
          specialty?: string | null
          status?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          code: string
          created_at: string
          id: string
          min_quantity: number | null
          name: string
          supplier: string | null
          unit: string
          unit_value: number | null
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          id?: string
          min_quantity?: number | null
          name: string
          supplier?: string | null
          unit?: string
          unit_value?: number | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          id?: string
          min_quantity?: number | null
          name?: string
          supplier?: string | null
          unit?: string
          unit_value?: number | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: string
          product_id: string | null
          quantity: number
          reason: string | null
          reference: string | null
          unit_value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type?: string
          product_id?: string | null
          quantity?: number
          reason?: string | null
          reference?: string | null
          unit_value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: string
          product_id?: string | null
          quantity?: number
          reason?: string | null
          reference?: string | null
          unit_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'stock_movements_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'current_stock'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      vehicles: {
        Row: {
          axles_count: number | null
          brand: string | null
          cost_center: string | null
          created_at: string
          id: string
          model: string | null
          plate: string
          purchase_cost: number | null
          vehicle_type: string
          year: number | null
        }
        Insert: {
          axles_count?: number | null
          brand?: string | null
          cost_center?: string | null
          created_at?: string
          id?: string
          model?: string | null
          plate: string
          purchase_cost?: number | null
          vehicle_type: string
          year?: number | null
        }
        Update: {
          axles_count?: number | null
          brand?: string | null
          cost_center?: string | null
          created_at?: string
          id?: string
          model?: string | null
          plate?: string
          purchase_cost?: number | null
          vehicle_type?: string
          year?: number | null
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          created_at: string
          date: string
          diagnosis: string | null
          external_cost: number | null
          hours: number | null
          id: string
          mechanic: string | null
          parts: Json | null
          parts_cost: number | null
          plate: string
          scheduled_date: string | null
          status: string
          total_cost: number | null
          type: string
        }
        Insert: {
          created_at?: string
          date?: string
          diagnosis?: string | null
          external_cost?: number | null
          hours?: number | null
          id?: string
          mechanic?: string | null
          parts?: Json | null
          parts_cost?: number | null
          plate: string
          scheduled_date?: string | null
          status?: string
          total_cost?: number | null
          type?: string
        }
        Update: {
          created_at?: string
          date?: string
          diagnosis?: string | null
          external_cost?: number | null
          hours?: number | null
          id?: string
          mechanic?: string | null
          parts?: Json | null
          parts_cost?: number | null
          plate?: string
          scheduled_date?: string | null
          status?: string
          total_cost?: number | null
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      current_stock: {
        Row: {
          category: string | null
          code: string | null
          current_balance: number | null
          id: string | null
          min_quantity: number | null
          name: string | null
          supplier: string | null
          unit: string | null
          unit_value: number | null
        }
        Relationships: []
      }
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
