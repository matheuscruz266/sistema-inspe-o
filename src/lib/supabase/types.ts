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
      inspection_plan_consequences: {
        Row: {
          action: string
          blocks_vehicle: boolean | null
          created_at: string
          generates_os: boolean | null
          id: string
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
          item_id: string | null
          result_value: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inspection_id: string
          item_id?: string | null
          result_value?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inspection_id?: string
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
      maintenance_plan_labor: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          planned_hours: number | null
          quantity: number | null
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          planned_hours?: number | null
          quantity?: number | null
          role: string
        }
        Update: {
          created_at?: string
          id?: string
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
          plan_id: string
          planned_quantity: number | null
          product_id: string | null
          product_name: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          planned_quantity?: number | null
          product_id?: string | null
          product_name?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
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
          plan_id: string
          sequence: number | null
          task_type: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          plan_id: string
          sequence?: number | null
          task_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
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
      non_conformities: {
        Row: {
          classification: string
          created_at: string
          criticality: string | null
          generates_os: boolean | null
          id: string
          inspection_id: string
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
          service_name: string
          work_order_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          duration?: number | null
          equipment_used?: string | null
          id?: string
          service_name: string
          work_order_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          duration?: number | null
          equipment_used?: string | null
          id?: string
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
      product_applications: {
        Row: {
          component: string | null
          created_at: string
          id: string
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
          product_id: string
        }
        Insert: {
          created_at?: string
          equivalent_brand?: string | null
          equivalent_code?: string | null
          equivalent_product_id?: string | null
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          equivalent_brand?: string | null
          equivalent_code?: string | null
          equivalent_product_id?: string | null
          id?: string
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
      product_units: {
        Row: {
          conversion_factor: number | null
          created_at: string
          id: string
          product_id: string
          purchase_unit: string
          stock_unit: string
        }
        Insert: {
          conversion_factor?: number | null
          created_at?: string
          id?: string
          product_id: string
          purchase_unit: string
          stock_unit: string
        }
        Update: {
          conversion_factor?: number | null
          created_at?: string
          id?: string
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
          location: string | null
          main_supplier_id: string | null
          manufacturer: string | null
          manufacturer_code: string | null
          max_quantity: number | null
          min_quantity: number | null
          name: string
          oem_code: string | null
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
          location?: string | null
          main_supplier_id?: string | null
          manufacturer?: string | null
          manufacturer_code?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          name: string
          oem_code?: string | null
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
          location?: string | null
          main_supplier_id?: string | null
          manufacturer?: string | null
          manufacturer_code?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          name?: string
          oem_code?: string | null
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
      schedule_records: {
        Row: {
          created_at: string
          executed_date: string | null
          id: string
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
          name: string
          standard_rate: number | null
          unit: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          standard_rate?: number | null
          unit?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
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
          location_id: string | null
          product_id: string
          quantity: number | null
          validity: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          product_id: string
          quantity?: number | null
          validity?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          id?: string
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
      stock_locations: {
        Row: {
          created_at: string
          id: string
          name: string
          physical_address: string | null
          warehouse: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          physical_address?: string | null
          warehouse?: string | null
        }
        Update: {
          created_at?: string
          id?: string
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
      suppliers: {
        Row: {
          cnpj: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          cnpj?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          cnpj?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      vehicle_systems: {
        Row: {
          component_name: string | null
          created_at: string
          id: string
          parent_id: string | null
          system_name: string
          vehicle_id: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          id?: string
          parent_id?: string | null
          system_name: string
          vehicle_id?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: string
          id?: string
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
