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
          is_deleted: boolean | null
          name: string
          permissions: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean | null
          name: string
          permissions?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean | null
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
          is_deleted: boolean | null
          name: string
        }
        Insert: {
          access_level_id?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          is_deleted?: boolean | null
          name: string
        }
        Update: {
          access_level_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean | null
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
      asset_owners: {
        Row: {
          cnpj_cpf: string | null
          created_at: string
          id: string
          is_deleted: boolean | null
          name: string
          notes: string | null
          owner_type: Database['public']['Enums']['logistics_owner_type'] | null
        }
        Insert: {
          cnpj_cpf?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          name: string
          notes?: string | null
          owner_type?: Database['public']['Enums']['logistics_owner_type'] | null
        }
        Update: {
          cnpj_cpf?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          name?: string
          notes?: string | null
          owner_type?: Database['public']['Enums']['logistics_owner_type'] | null
        }
        Relationships: []
      }
      carrier_contracts: {
        Row: {
          agreed_value: number | null
          carrier_supplier_id: string | null
          created_at: string
          id: string
          is_deleted: boolean | null
          route_id: string | null
          valid_from: string
          valid_to: string | null
          value_per_km: number | null
        }
        Insert: {
          agreed_value?: number | null
          carrier_supplier_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          route_id?: string | null
          valid_from: string
          valid_to?: string | null
          value_per_km?: number | null
        }
        Update: {
          agreed_value?: number | null
          carrier_supplier_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          route_id?: string | null
          valid_from?: string
          valid_to?: string | null
          value_per_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'carrier_contracts_carrier_supplier_id_fkey'
            columns: ['carrier_supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'carrier_contracts_route_id_fkey'
            columns: ['route_id']
            isOneToOne: false
            referencedRelation: 'routes'
            referencedColumns: ['id']
          },
        ]
      }
      clients: {
        Row: {
          active: boolean | null
          city: string | null
          cnpj: string | null
          conversion_factor: number | null
          created_at: string
          default_unit: Database['public']['Enums']['logistics_default_unit'] | null
          group_name: string | null
          id: string
          is_deleted: boolean | null
          state: string | null
          trade_name: string
        }
        Insert: {
          active?: boolean | null
          city?: string | null
          cnpj?: string | null
          conversion_factor?: number | null
          created_at?: string
          default_unit?: Database['public']['Enums']['logistics_default_unit'] | null
          group_name?: string | null
          id?: string
          is_deleted?: boolean | null
          state?: string | null
          trade_name: string
        }
        Update: {
          active?: boolean | null
          city?: string | null
          cnpj?: string | null
          conversion_factor?: number | null
          created_at?: string
          default_unit?: Database['public']['Enums']['logistics_default_unit'] | null
          group_name?: string | null
          id?: string
          is_deleted?: boolean | null
          state?: string | null
          trade_name?: string
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          company: Database['public']['Enums']['logistics_driver_company'] | null
          created_at: string
          home_city: string | null
          is_deleted: boolean | null
          participation_percentage: number | null
          person_id: string
          status: Database['public']['Enums']['logistics_driver_status'] | null
        }
        Insert: {
          company?: Database['public']['Enums']['logistics_driver_company'] | null
          created_at?: string
          home_city?: string | null
          is_deleted?: boolean | null
          participation_percentage?: number | null
          person_id: string
          status?: Database['public']['Enums']['logistics_driver_status'] | null
        }
        Update: {
          company?: Database['public']['Enums']['logistics_driver_company'] | null
          created_at?: string
          home_city?: string | null
          is_deleted?: boolean | null
          participation_percentage?: number | null
          person_id?: string
          status?: Database['public']['Enums']['logistics_driver_status'] | null
        }
        Relationships: [
          {
            foreignKeyName: 'driver_profiles_person_id_fkey'
            columns: ['person_id']
            isOneToOne: true
            referencedRelation: 'people'
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
          is_deleted: boolean | null
          name: string
          phone: string | null
          whatsapp: string | null
        }
        Insert: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          name: string
          phone?: string | null
          whatsapp?: string | null
        }
        Update: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          name?: string
          phone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      inspection_plan_consequences: {
        Row: {
          action: string
          blocks_vehicle: boolean | null
          created_at: string
          generates_os: boolean | null
          id: string
          is_deleted: boolean | null
          plan_id: string
          priority: string | null
          result_classification: string
        }
        Insert: {
          action: string
          blocks_vehicle?: boolean | null
          created_at?: string
          generates_os?: boolean | null
          id?: string
          is_deleted?: boolean | null
          plan_id: string
          priority?: string | null
          result_classification: string
        }
        Update: {
          action?: string
          blocks_vehicle?: boolean | null
          created_at?: string
          generates_os?: boolean | null
          id?: string
          is_deleted?: boolean | null
          plan_id?: string
          priority?: string | null
          result_classification?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inspection_plan_consequences_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'inspection_plans'
            referencedColumns: ['id']
          },
        ]
      }
      inspection_plan_items: {
        Row: {
          created_at: string
          expected_value: string | null
          id: string
          is_deleted: boolean | null
          item: string
          plan_id: string
          response_type: string | null
          sequence: number | null
          verification: string | null
        }
        Insert: {
          created_at?: string
          expected_value?: string | null
          id?: string
          is_deleted?: boolean | null
          item: string
          plan_id: string
          response_type?: string | null
          sequence?: number | null
          verification?: string | null
        }
        Update: {
          created_at?: string
          expected_value?: string | null
          id?: string
          is_deleted?: boolean | null
          item?: string
          plan_id?: string
          response_type?: string | null
          sequence?: number | null
          verification?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'inspection_plan_items_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'inspection_plans'
            referencedColumns: ['id']
          },
        ]
      }
      inspection_plans: {
        Row: {
          checklist: Json | null
          code: string | null
          created_at: string
          criticidade: string | null
          id: string
          is_deleted: boolean | null
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
          code?: string | null
          created_at?: string
          criticidade?: string | null
          id?: string
          is_deleted?: boolean | null
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
          code?: string | null
          created_at?: string
          criticidade?: string | null
          id?: string
          is_deleted?: boolean | null
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
      inspection_results: {
        Row: {
          created_at: string
          id: string
          inspection_id: string
          is_deleted: boolean | null
          item_id: string | null
          result_value: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inspection_id: string
          is_deleted?: boolean | null
          item_id?: string | null
          result_value?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inspection_id?: string
          is_deleted?: boolean | null
          item_id?: string | null
          result_value?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'inspection_results_inspection_id_fkey'
            columns: ['inspection_id']
            isOneToOne: false
            referencedRelation: 'inspections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inspection_results_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'inspection_plan_items'
            referencedColumns: ['id']
          },
        ]
      }
      inspections: {
        Row: {
          created_at: string
          date: string
          driver_name: string | null
          failed_items: Json | null
          id: string
          is_deleted: boolean | null
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
          is_deleted?: boolean | null
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
          is_deleted?: boolean | null
          notes?: string | null
          plate?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          city: string | null
          client_id: string | null
          created_at: string
          id: string
          is_deleted: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          state: string | null
          stock_location_id: string | null
          type: Database['public']['Enums']['logistics_location_type'] | null
        }
        Insert: {
          city?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          state?: string | null
          stock_location_id?: string | null
          type?: Database['public']['Enums']['logistics_location_type'] | null
        }
        Update: {
          city?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          state?: string | null
          stock_location_id?: string | null
          type?: Database['public']['Enums']['logistics_location_type'] | null
        }
        Relationships: [
          {
            foreignKeyName: 'locations_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'locations_stock_location_id_fkey'
            columns: ['stock_location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_plan_labor: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean | null
          plan_id: string
          planned_hours: number | null
          quantity: number | null
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          plan_id: string
          planned_hours?: number | null
          quantity?: number | null
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          plan_id?: string
          planned_hours?: number | null
          quantity?: number | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_plan_labor_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'maintenance_plans'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_plan_materials: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean | null
          plan_id: string
          planned_quantity: number | null
          product_id: string | null
          product_name: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          plan_id: string
          planned_quantity?: number | null
          product_id?: string | null
          product_name?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          plan_id?: string
          planned_quantity?: number | null
          product_id?: string | null
          product_name?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_plan_materials_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'maintenance_plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_plan_materials_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'current_stock'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_plan_materials_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_plan_tasks: {
        Row: {
          created_at: string
          description: string
          id: string
          is_deleted: boolean | null
          plan_id: string
          sequence: number | null
          task_type: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_deleted?: boolean | null
          plan_id: string
          sequence?: number | null
          task_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_deleted?: boolean | null
          plan_id?: string
          sequence?: number | null
          task_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_plan_tasks_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'maintenance_plans'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_plan_triggers: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean | null
          last_event_date: string | null
          last_event_value: number | null
          next_event_date: string | null
          next_event_value: number | null
          plan_id: string
          trigger_type: string
          unit: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          last_event_date?: string | null
          last_event_value?: number | null
          next_event_date?: string | null
          next_event_value?: number | null
          plan_id: string
          trigger_type: string
          unit?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          last_event_date?: string | null
          last_event_value?: number | null
          next_event_date?: string | null
          next_event_value?: number | null
          plan_id?: string
          trigger_type?: string
          unit?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_plan_triggers_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'maintenance_plans'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_plans: {
        Row: {
          application_target: string | null
          application_type: string | null
          checklist: Json | null
          code: string | null
          created_at: string
          criticidade: string | null
          description: string | null
          id: string
          is_deleted: boolean | null
          name: string
          next_execution: string | null
          periodicity: string | null
          priority: string | null
          responsible: string | null
          status: string
          target_plate: string | null
          target_vehicle_type: string | null
          type: string
        }
        Insert: {
          application_target?: string | null
          application_type?: string | null
          checklist?: Json | null
          code?: string | null
          created_at?: string
          criticidade?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          name: string
          next_execution?: string | null
          periodicity?: string | null
          priority?: string | null
          responsible?: string | null
          status?: string
          target_plate?: string | null
          target_vehicle_type?: string | null
          type?: string
        }
        Update: {
          application_target?: string | null
          application_type?: string | null
          checklist?: Json | null
          code?: string | null
          created_at?: string
          criticidade?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          name?: string
          next_execution?: string | null
          periodicity?: string | null
          priority?: string | null
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
          is_deleted: boolean | null
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
          is_deleted?: boolean | null
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
          is_deleted?: boolean | null
          name?: string
          phone?: string | null
          specialty?: string | null
          status?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      non_conformities: {
        Row: {
          classification: string
          created_at: string
          criticality: string | null
          generates_os: boolean | null
          id: string
          inspection_id: string
          is_deleted: boolean | null
          item_id: string | null
          result_value: string | null
          status: string | null
          work_order_id: string | null
        }
        Insert: {
          classification: string
          created_at?: string
          criticality?: string | null
          generates_os?: boolean | null
          id?: string
          inspection_id: string
          is_deleted?: boolean | null
          item_id?: string | null
          result_value?: string | null
          status?: string | null
          work_order_id?: string | null
        }
        Update: {
          classification?: string
          created_at?: string
          criticality?: string | null
          generates_os?: boolean | null
          id?: string
          inspection_id?: string
          is_deleted?: boolean | null
          item_id?: string | null
          result_value?: string | null
          status?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'non_conformities_inspection_id_fkey'
            columns: ['inspection_id']
            isOneToOne: false
            referencedRelation: 'inspections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'non_conformities_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'inspection_plan_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'non_conformities_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
        ]
      }
      os_diagnosis: {
        Row: {
          action: string | null
          cause: string | null
          component: string | null
          created_at: string
          failure: string | null
          id: string
          is_deleted: boolean | null
          symptom: string | null
          system: string | null
          work_order_id: string
        }
        Insert: {
          action?: string | null
          cause?: string | null
          component?: string | null
          created_at?: string
          failure?: string | null
          id?: string
          is_deleted?: boolean | null
          symptom?: string | null
          system?: string | null
          work_order_id: string
        }
        Update: {
          action?: string | null
          cause?: string | null
          component?: string | null
          created_at?: string
          failure?: string | null
          id?: string
          is_deleted?: boolean | null
          symptom?: string | null
          system?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'os_diagnosis_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
        ]
      }
      os_external: {
        Row: {
          created_at: string
          freight_cost: number | null
          id: string
          invoice_number: string | null
          is_deleted: boolean | null
          labor_cost: number | null
          other_cost: number | null
          parts_cost: number | null
          service_cost: number | null
          supplier_id: string | null
          supplier_name: string | null
          total_cost: number | null
          work_description: string | null
          work_order_id: string
        }
        Insert: {
          created_at?: string
          freight_cost?: number | null
          id?: string
          invoice_number?: string | null
          is_deleted?: boolean | null
          labor_cost?: number | null
          other_cost?: number | null
          parts_cost?: number | null
          service_cost?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_cost?: number | null
          work_description?: string | null
          work_order_id: string
        }
        Update: {
          created_at?: string
          freight_cost?: number | null
          id?: string
          invoice_number?: string | null
          is_deleted?: boolean | null
          labor_cost?: number | null
          other_cost?: number | null
          parts_cost?: number | null
          service_cost?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_cost?: number | null
          work_description?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'os_external_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'os_external_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
        ]
      }
      os_labor: {
        Row: {
          cost: number | null
          created_at: string
          end_time: string | null
          hourly_rate: number | null
          hours: number | null
          id: string
          is_deleted: boolean | null
          mechanic_name: string
          role: string | null
          start_time: string | null
          work_order_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          end_time?: string | null
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          is_deleted?: boolean | null
          mechanic_name: string
          role?: string | null
          start_time?: string | null
          work_order_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          end_time?: string | null
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          is_deleted?: boolean | null
          mechanic_name?: string
          role?: string | null
          start_time?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'os_labor_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
        ]
      }
      os_materials: {
        Row: {
          batch: string | null
          created_at: string
          id: string
          is_deleted: boolean | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
          work_order_id: string
        }
        Insert: {
          batch?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          work_order_id: string
        }
        Update: {
          batch?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'os_materials_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'current_stock'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'os_materials_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'os_materials_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
        ]
      }
      os_services: {
        Row: {
          cost: number | null
          created_at: string
          duration: number | null
          equipment_used: string | null
          id: string
          is_deleted: boolean | null
          service_name: string
          work_order_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          duration?: number | null
          equipment_used?: string | null
          id?: string
          is_deleted?: boolean | null
          service_name: string
          work_order_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          duration?: number | null
          equipment_used?: string | null
          id?: string
          is_deleted?: boolean | null
          service_name?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'os_services_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
        ]
      }
      people: {
        Row: {
          city: string | null
          cnh_attachment: string | null
          cnh_type: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          hourly_cost: number | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          name: string
          participation: string | null
          phone: string | null
          role: string | null
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          cnh_attachment?: string | null
          cnh_type?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          hourly_cost?: number | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          name: string
          participation?: string | null
          phone?: string | null
          role?: string | null
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          cnh_attachment?: string | null
          cnh_type?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          hourly_cost?: number | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          name?: string
          participation?: string | null
          phone?: string | null
          role?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      product_applications: {
        Row: {
          component: string | null
          created_at: string
          id: string
          is_deleted: boolean | null
          product_id: string
          system: string | null
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          product_id: string
          system?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          product_id?: string
          system?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'product_applications_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'current_stock'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_applications_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      product_classifications: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          family: string | null
          group_name: string | null
          id: string
          is_deleted: boolean | null
          manufacturer: string | null
          product_id: string
          subcategory: string | null
          subgroup: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          family?: string | null
          group_name?: string | null
          id?: string
          is_deleted?: boolean | null
          manufacturer?: string | null
          product_id: string
          subcategory?: string | null
          subgroup?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          family?: string | null
          group_name?: string | null
          id?: string
          is_deleted?: boolean | null
          manufacturer?: string | null
          product_id?: string
          subcategory?: string | null
          subgroup?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'product_classifications_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'current_stock'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_classifications_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      product_equivalents: {
        Row: {
          created_at: string
          equivalent_brand: string | null
          equivalent_code: string | null
          equivalent_product_id: string | null
          id: string
          is_deleted: boolean | null
          product_id: string
        }
        Insert: {
          created_at?: string
          equivalent_brand?: string | null
          equivalent_code?: string | null
          equivalent_product_id?: string | null
          id?: string
          is_deleted?: boolean | null
          product_id: string
        }
        Update: {
          created_at?: string
          equivalent_brand?: string | null
          equivalent_code?: string | null
          equivalent_product_id?: string | null
          id?: string
          is_deleted?: boolean | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_equivalents_equivalent_product_id_fkey'
            columns: ['equivalent_product_id']
            isOneToOne: false
            referencedRelation: 'current_stock'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_equivalents_equivalent_product_id_fkey'
            columns: ['equivalent_product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_equivalents_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'current_stock'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_equivalents_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      product_suppliers: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean | null
          product_id: string
          supplier_code: string | null
          supplier_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          product_id: string
          supplier_code?: string | null
          supplier_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          product_id?: string
          supplier_code?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'product_suppliers_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'current_stock'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_suppliers_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_suppliers_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      product_units: {
        Row: {
          conversion_factor: number | null
          created_at: string
          id: string
          is_deleted: boolean | null
          product_id: string
          purchase_unit: string
          stock_unit: string
        }
        Insert: {
          conversion_factor?: number | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          product_id: string
          purchase_unit: string
          stock_unit: string
        }
        Update: {
          conversion_factor?: number | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          product_id?: string
          purchase_unit?: string
          stock_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_units_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'current_stock'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_units_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          batch: string | null
          brand: string | null
          category: string
          code: string
          created_at: string
          ean: string | null
          family: string | null
          group_name: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          location: string | null
          main_supplier_id: string | null
          manufacturer: string | null
          manufacturer_code: string | null
          max_quantity: number | null
          min_quantity: number | null
          name: string
          oem_code: string | null
          photo_url: string | null
          physical_address: string | null
          safety_quantity: number | null
          subcategory: string | null
          subgroup: string | null
          supplier: string | null
          supplier_code: string | null
          unit: string
          unit_value: number | null
          validity: string | null
          warehouse: string | null
        }
        Insert: {
          batch?: string | null
          brand?: string | null
          category?: string
          code: string
          created_at?: string
          ean?: string | null
          family?: string | null
          group_name?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          location?: string | null
          main_supplier_id?: string | null
          manufacturer?: string | null
          manufacturer_code?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          name: string
          oem_code?: string | null
          photo_url?: string | null
          physical_address?: string | null
          safety_quantity?: number | null
          subcategory?: string | null
          subgroup?: string | null
          supplier?: string | null
          supplier_code?: string | null
          unit?: string
          unit_value?: number | null
          validity?: string | null
          warehouse?: string | null
        }
        Update: {
          batch?: string | null
          brand?: string | null
          category?: string
          code?: string
          created_at?: string
          ean?: string | null
          family?: string | null
          group_name?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          location?: string | null
          main_supplier_id?: string | null
          manufacturer?: string | null
          manufacturer_code?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          name?: string
          oem_code?: string | null
          photo_url?: string | null
          physical_address?: string | null
          safety_quantity?: number | null
          subcategory?: string | null
          subgroup?: string | null
          supplier?: string | null
          supplier_code?: string | null
          unit?: string
          unit_value?: number | null
          validity?: string | null
          warehouse?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'products_main_supplier_id_fkey'
            columns: ['main_supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          destination_client_id: string | null
          id: string
          is_deleted: boolean | null
          km_one_way: number | null
          km_range: string | null
          km_round_trip: number | null
          origin_location_id: string | null
          price_unit: Database['public']['Enums']['logistics_default_unit'] | null
          toll_heavy: number | null
          toll_light: number | null
          transport_type: Database['public']['Enums']['logistics_transport_type'] | null
          unit_price: number | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          destination_client_id?: string | null
          id?: string
          is_deleted?: boolean | null
          km_one_way?: number | null
          km_range?: string | null
          km_round_trip?: number | null
          origin_location_id?: string | null
          price_unit?: Database['public']['Enums']['logistics_default_unit'] | null
          toll_heavy?: number | null
          toll_light?: number | null
          transport_type?: Database['public']['Enums']['logistics_transport_type'] | null
          unit_price?: number | null
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          destination_client_id?: string | null
          id?: string
          is_deleted?: boolean | null
          km_one_way?: number | null
          km_range?: string | null
          km_round_trip?: number | null
          origin_location_id?: string | null
          price_unit?: Database['public']['Enums']['logistics_default_unit'] | null
          toll_heavy?: number | null
          toll_light?: number | null
          transport_type?: Database['public']['Enums']['logistics_transport_type'] | null
          unit_price?: number | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'routes_destination_client_id_fkey'
            columns: ['destination_client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'routes_origin_location_id_fkey'
            columns: ['origin_location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_records: {
        Row: {
          created_at: string
          executed_date: string | null
          id: string
          is_deleted: boolean | null
          plan_id: string | null
          scheduled_date: string
          status: string
          vehicle_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          executed_date?: string | null
          id?: string
          is_deleted?: boolean | null
          plan_id?: string | null
          scheduled_date: string
          status?: string
          vehicle_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          executed_date?: string | null
          id?: string
          is_deleted?: boolean | null
          plan_id?: string | null
          scheduled_date?: string
          status?: string
          vehicle_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_records_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'maintenance_plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_records_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_records_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
        ]
      }
      service_catalog: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_deleted: boolean | null
          name: string
          standard_rate: number | null
          unit: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          name: string
          standard_rate?: number | null
          unit?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          name?: string
          standard_rate?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      stock_batches: {
        Row: {
          batch_number: string | null
          created_at: string
          id: string
          is_deleted: boolean | null
          location_id: string | null
          product_id: string
          quantity: number | null
          validity: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          location_id?: string | null
          product_id: string
          quantity?: number | null
          validity?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          location_id?: string | null
          product_id?: string
          quantity?: number | null
          validity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'stock_batches_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'current_stock'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      stock_inventory: {
        Row: {
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          created_at: string
          divergence: number | null
          id: string
          is_deleted: boolean | null
          location_id: string | null
          notes: string | null
          product_id: string
          status: string | null
          system_quantity: number | null
        }
        Insert: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string
          divergence?: number | null
          id?: string
          is_deleted?: boolean | null
          location_id?: string | null
          notes?: string | null
          product_id: string
          status?: string | null
          system_quantity?: number | null
        }
        Update: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string
          divergence?: number | null
          id?: string
          is_deleted?: boolean | null
          location_id?: string | null
          notes?: string | null
          product_id?: string
          status?: string | null
          system_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'stock_inventory_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_inventory_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'current_stock'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_inventory_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      stock_locations: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean | null
          name: string
          physical_address: string | null
          warehouse: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          name: string
          physical_address?: string | null
          warehouse?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          name?: string
          physical_address?: string | null
          warehouse?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          is_deleted: boolean | null
          location_id: string | null
          movement_type: string
          product_id: string | null
          quantity: number
          reason: string | null
          reference: string | null
          unit_value: number | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          location_id?: string | null
          movement_type?: string
          product_id?: string | null
          quantity?: number
          reason?: string | null
          reference?: string | null
          unit_value?: number | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          location_id?: string | null
          movement_type?: string
          product_id?: string | null
          quantity?: number
          reason?: string | null
          reference?: string | null
          unit_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'stock_movements_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'stock_batches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
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
      supplier_payment_info: {
        Row: {
          account: string | null
          agency: string | null
          bank: string | null
          created_at: string
          default_price_per_ton: number | null
          estimated_monthly_volume_tons: number | null
          is_deleted: boolean | null
          linked_yard_location_id: string | null
          pix_key: string | null
          supplier_id: string
        }
        Insert: {
          account?: string | null
          agency?: string | null
          bank?: string | null
          created_at?: string
          default_price_per_ton?: number | null
          estimated_monthly_volume_tons?: number | null
          is_deleted?: boolean | null
          linked_yard_location_id?: string | null
          pix_key?: string | null
          supplier_id: string
        }
        Update: {
          account?: string | null
          agency?: string | null
          bank?: string | null
          created_at?: string
          default_price_per_ton?: number | null
          estimated_monthly_volume_tons?: number | null
          is_deleted?: boolean | null
          linked_yard_location_id?: string | null
          pix_key?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supplier_payment_info_linked_yard_location_id_fkey'
            columns: ['linked_yard_location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplier_payment_info_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: true
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: string
          is_deleted: boolean | null
          name: string
          phone: string | null
          supplier_type: Database['public']['Enums']['logistics_supplier_type'] | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_deleted?: boolean | null
          name: string
          phone?: string | null
          supplier_type?: Database['public']['Enums']['logistics_supplier_type'] | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_deleted?: boolean | null
          name?: string
          phone?: string | null
          supplier_type?: Database['public']['Enums']['logistics_supplier_type'] | null
        }
        Relationships: []
      }
      trailer_cargo_profiles: {
        Row: {
          cargo_type: Database['public']['Enums']['logistics_cargo_type'] | null
          created_at: string
          id: string
          is_deleted: boolean | null
          max_payload_kg: number | null
          real_volume_m3: number | null
          sale_volume_m3: number | null
          trailer_vehicle_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          cargo_type?: Database['public']['Enums']['logistics_cargo_type'] | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          max_payload_kg?: number | null
          real_volume_m3?: number | null
          sale_volume_m3?: number | null
          trailer_vehicle_id: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          cargo_type?: Database['public']['Enums']['logistics_cargo_type'] | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          max_payload_kg?: number | null
          real_volume_m3?: number | null
          sale_volume_m3?: number | null
          trailer_vehicle_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'trailer_cargo_profiles_trailer_vehicle_id_fkey'
            columns: ['trailer_vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
        ]
      }
      vehicle_set_assignments: {
        Row: {
          change_reason: string | null
          created_at: string
          driver_id: string | null
          id: string
          is_deleted: boolean | null
          tractor_vehicle_id: string | null
          trailer_vehicle_id: string | null
          valid_from: string
          valid_to: string | null
          vehicle_set_id: string
        }
        Insert: {
          change_reason?: string | null
          created_at?: string
          driver_id?: string | null
          id?: string
          is_deleted?: boolean | null
          tractor_vehicle_id?: string | null
          trailer_vehicle_id?: string | null
          valid_from: string
          valid_to?: string | null
          vehicle_set_id: string
        }
        Update: {
          change_reason?: string | null
          created_at?: string
          driver_id?: string | null
          id?: string
          is_deleted?: boolean | null
          tractor_vehicle_id?: string | null
          trailer_vehicle_id?: string | null
          valid_from?: string
          valid_to?: string | null
          vehicle_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vehicle_set_assignments_driver_id_fkey'
            columns: ['driver_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehicle_set_assignments_tractor_vehicle_id_fkey'
            columns: ['tractor_vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehicle_set_assignments_trailer_vehicle_id_fkey'
            columns: ['trailer_vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehicle_set_assignments_vehicle_set_id_fkey'
            columns: ['vehicle_set_id']
            isOneToOne: false
            referencedRelation: 'vehicle_sets'
            referencedColumns: ['id']
          },
        ]
      }
      vehicle_sets: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean | null
          set_code: string | null
          status: Database['public']['Enums']['logistics_set_status'] | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          set_code?: string | null
          status?: Database['public']['Enums']['logistics_set_status'] | null
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          set_code?: string | null
          status?: Database['public']['Enums']['logistics_set_status'] | null
        }
        Relationships: []
      }
      vehicle_systems: {
        Row: {
          component_name: string | null
          created_at: string
          id: string
          is_deleted: boolean | null
          parent_id: string | null
          system_name: string
          vehicle_id: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          parent_id?: string | null
          system_name: string
          vehicle_id?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          parent_id?: string | null
          system_name?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'vehicle_systems_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'vehicle_systems'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehicle_systems_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
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
          crlv_url: string | null
          id: string
          is_deleted: boolean | null
          model: string | null
          owner_id: string | null
          plate: string
          purchase_cost: number | null
          status: string | null
          vehicle_type: string
          year: number | null
        }
        Insert: {
          axles_count?: number | null
          brand?: string | null
          cost_center?: string | null
          created_at?: string
          crlv_url?: string | null
          id?: string
          is_deleted?: boolean | null
          model?: string | null
          owner_id?: string | null
          plate: string
          purchase_cost?: number | null
          status?: string | null
          vehicle_type: string
          year?: number | null
        }
        Update: {
          axles_count?: number | null
          brand?: string | null
          cost_center?: string | null
          created_at?: string
          crlv_url?: string | null
          id?: string
          is_deleted?: boolean | null
          model?: string | null
          owner_id?: string | null
          plate?: string
          purchase_cost?: number | null
          status?: string | null
          vehicle_type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'vehicles_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'asset_owners'
            referencedColumns: ['id']
          },
        ]
      }
      work_orders: {
        Row: {
          code: string | null
          cost_center: string | null
          created_at: string
          date: string
          diagnosis: string | null
          external_cost: number | null
          freight_cost: number | null
          horimeter: number | null
          hours: number | null
          id: string
          implement_plate: string | null
          is_deleted: boolean | null
          labor_cost: number | null
          maintenance_plan_id: string | null
          mechanic: string | null
          odometer: number | null
          origin: string | null
          other_cost: number | null
          parts: Json | null
          parts_cost: number | null
          plate: string
          scheduled_date: string | null
          status: string
          total_cost: number | null
          type: string
          unit: string | null
          user_name: string | null
          vehicle_id: string | null
        }
        Insert: {
          code?: string | null
          cost_center?: string | null
          created_at?: string
          date?: string
          diagnosis?: string | null
          external_cost?: number | null
          freight_cost?: number | null
          horimeter?: number | null
          hours?: number | null
          id?: string
          implement_plate?: string | null
          is_deleted?: boolean | null
          labor_cost?: number | null
          maintenance_plan_id?: string | null
          mechanic?: string | null
          odometer?: number | null
          origin?: string | null
          other_cost?: number | null
          parts?: Json | null
          parts_cost?: number | null
          plate: string
          scheduled_date?: string | null
          status?: string
          total_cost?: number | null
          type?: string
          unit?: string | null
          user_name?: string | null
          vehicle_id?: string | null
        }
        Update: {
          code?: string | null
          cost_center?: string | null
          created_at?: string
          date?: string
          diagnosis?: string | null
          external_cost?: number | null
          freight_cost?: number | null
          horimeter?: number | null
          hours?: number | null
          id?: string
          implement_plate?: string | null
          is_deleted?: boolean | null
          labor_cost?: number | null
          maintenance_plan_id?: string | null
          mechanic?: string | null
          odometer?: number | null
          origin?: string | null
          other_cost?: number | null
          parts?: Json | null
          parts_cost?: number | null
          plate?: string
          scheduled_date?: string | null
          status?: string
          total_cost?: number | null
          type?: string
          unit?: string | null
          user_name?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'work_orders_maintenance_plan_id_fkey'
            columns: ['maintenance_plan_id']
            isOneToOne: false
            referencedRelation: 'maintenance_plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'work_orders_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
        ]
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
      has_screen_access: { Args: { p_screen: string }; Returns: boolean }
      has_screen_operation: {
        Args: { p_operation: string; p_screen: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      table_screen: { Args: { p_table: string }; Returns: string }
    }
    Enums: {
      logistics_cargo_type: 'cavaco' | 'toras' | 'prancha'
      logistics_default_unit: 'TON' | 'M3'
      logistics_driver_company: 'own_fleet' | 'third_party'
      logistics_driver_status: 'active' | 'inactive'
      logistics_location_type: 'farm' | 'yard' | 'client_unit' | 'other'
      logistics_owner_type: 'julitago' | 'affiliated_company' | 'third_party'
      logistics_set_status: 'active' | 'inactive'
      logistics_supplier_type: 'parts' | 'raw_material' | 'third_party_freight' | 'services'
      logistics_transport_type: 'own_fleet' | 'third_party'
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
    Enums: {
      logistics_cargo_type: ['cavaco', 'toras', 'prancha'],
      logistics_default_unit: ['TON', 'M3'],
      logistics_driver_company: ['own_fleet', 'third_party'],
      logistics_driver_status: ['active', 'inactive'],
      logistics_location_type: ['farm', 'yard', 'client_unit', 'other'],
      logistics_owner_type: ['julitago', 'affiliated_company', 'third_party'],
      logistics_set_status: ['active', 'inactive'],
      logistics_supplier_type: ['parts', 'raw_material', 'third_party_freight', 'services'],
      logistics_transport_type: ['own_fleet', 'third_party'],
    },
  },
} as const
