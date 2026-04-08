export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      store_locations: {
        Row: {
          id: string
          store_id: string
          name: string
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          phone: string | null
          email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      store_members: {
        Row: {
          id: string
          store_id: string
          user_id: string
          role: 'owner' | 'admin' | 'manager' | 'staff'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id: string
          role: 'owner' | 'admin' | 'manager' | 'staff'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'manager' | 'staff'
          created_at?: string
          updated_at?: string
        }
      }
      product_categories: {
        Row: {
          id: string
          store_id: string
          name: string
          description: string | null
          color_code: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          description?: string | null
          color_code?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          description?: string | null
          color_code?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          store_id: string
          category_id: string | null
          sku: string
          name: string
          description: string | null
          barcode: string | null
          unit_of_measure: string
          cost_price: number | null
          selling_price: number
          tax_rate: number
          min_stock_level: number
          max_stock_level: number | null
          reorder_point: number
          reorder_quantity: number | null
          supplier_name: string | null
          supplier_contact: string | null
          is_active: boolean
          is_featured: boolean
          image_url: string | null
          weight_kg: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          category_id?: string | null
          sku: string
          name: string
          description?: string | null
          barcode?: string | null
          unit_of_measure?: string
          cost_price?: number | null
          selling_price: number
          tax_rate?: number
          min_stock_level?: number
          max_stock_level?: number | null
          reorder_point?: number
          reorder_quantity?: number | null
          supplier_name?: string | null
          supplier_contact?: string | null
          is_active?: boolean
          is_featured?: boolean
          image_url?: string | null
          weight_kg?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          category_id?: string | null
          sku?: string
          name?: string
          description?: string | null
          barcode?: string | null
          unit_of_measure?: string
          cost_price?: number | null
          selling_price?: number
          tax_rate?: number
          min_stock_level?: number
          max_stock_level?: number | null
          reorder_point?: number
          reorder_quantity?: number | null
          supplier_name?: string | null
          supplier_contact?: string | null
          is_active?: boolean
          is_featured?: boolean
          image_url?: string | null
          weight_kg?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          store_id: string
          location_id: string | null
          product_id: string
          quantity: number
          reserved_quantity: number
          available_quantity: number
          unit_cost: number | null
          location_name: string | null
          last_counted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          location_id?: string | null
          product_id: string
          quantity?: number
          reserved_quantity?: number
          unit_cost?: number | null
          location_name?: string | null
          last_counted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          location_id?: string | null
          product_id?: string
          quantity?: number
          reserved_quantity?: number
          unit_cost?: number | null
          location_name?: string | null
          last_counted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory_snapshots: {
        Row: {
          id: string
          store_id: string
          location_id: string | null
          product_id: string
          quantity: number
          reserved_quantity: number
          available_quantity: number
          unit_cost: number | null
          total_value: number | null
          snapshot_date: string
          created_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          location_id?: string | null
          product_id: string
          quantity?: number
          reserved_quantity?: number
          unit_cost?: number | null
          total_value?: number | null
          snapshot_date?: string
          created_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          location_id?: string | null
          product_id?: string
          quantity?: number
          reserved_quantity?: number
          unit_cost?: number | null
          total_value?: number | null
          snapshot_date?: string
          created_by?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      inventory_movements: {
        Row: {
          id: string
          store_id: string
          inventory_id: string
          product_id: string
          movement_type: 'sale' | 'purchase' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return' | 'count'
          quantity_change: number
          previous_quantity: number
          new_quantity: number
          reference_id: string | null
          reference_type: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          inventory_id: string
          product_id: string
          movement_type: 'sale' | 'purchase' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return' | 'count'
          quantity_change: number
          previous_quantity: number
          new_quantity: number
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          inventory_id?: string
          product_id?: string
          movement_type?: 'sale' | 'purchase' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return' | 'count'
          quantity_change?: number
          previous_quantity?: number
          new_quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          store_id: string
          location_id: string | null
          transaction_number: string
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          subtotal: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          payment_method: 'cash' | 'card' | 'debit' | 'mobile' | 'other'
          payment_status: 'pending' | 'completed' | 'refunded' | 'voided'
          status: 'completed' | 'voided' | 'refunded'
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          location_id?: string | null
          transaction_number: string
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          subtotal: number
          tax_amount: number
          discount_amount?: number
          total_amount: number
          payment_method: 'cash' | 'card' | 'debit' | 'mobile' | 'other'
          payment_status?: 'pending' | 'completed' | 'refunded' | 'voided'
          status?: 'completed' | 'voided' | 'refunded'
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          location_id?: string | null
          transaction_number?: string
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          payment_method?: 'cash' | 'card' | 'debit' | 'mobile' | 'other'
          payment_status?: 'pending' | 'completed' | 'refunded' | 'voided'
          status?: 'completed' | 'voided' | 'refunded'
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          cost_price: number | null
          discount_amount: number
          tax_amount: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          cost_price?: number | null
          discount_amount?: number
          tax_amount: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          cost_price?: number | null
          discount_amount?: number
          tax_amount?: number
          total_price?: number
          created_at?: string
        }
      }
      data_imports: {
        Row: {
          id: string
          store_id: string
          import_type: 'products' | 'inventory' | 'sales' | 'customers'
          file_name: string
          file_size: number | null
          row_count: number | null
          processed_count: number
          error_count: number
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_log: string | null
          mapping_config: Json | null
          created_by: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          import_type: 'products' | 'inventory' | 'sales' | 'customers'
          file_name: string
          file_size?: number | null
          row_count?: number | null
          processed_count?: number
          error_count?: number
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_log?: string | null
          mapping_config?: Json | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          import_type?: 'products' | 'inventory' | 'sales' | 'customers'
          file_name?: string
          file_size?: number | null
          row_count?: number | null
          processed_count?: number
          error_count?: number
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_log?: string | null
          mapping_config?: Json | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      store_settings: {
        Row: {
          id: string
          store_id: string
          setting_key: string
          setting_value: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          setting_key: string
          setting_value?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          setting_key?: string
          setting_value?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      sales_receipts: {
        Row: {
          id: string
          store_id: string
          location_id: string | null
          receipt_number: string
          transaction_date: string
          subtotal: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          payment_method: 'cash' | 'card' | 'digital_wallet' | 'other' | null
          payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          cashier_id: string | null
          register_id: string | null
          shift_id: string | null
          is_voided: boolean
          void_reason: string | null
          notes: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          location_id?: string | null
          receipt_number: string
          transaction_date?: string
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          payment_method?: 'cash' | 'card' | 'digital_wallet' | 'other' | null
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          cashier_id?: string | null
          register_id?: string | null
          shift_id?: string | null
          is_voided?: boolean
          void_reason?: string | null
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          location_id?: string | null
          receipt_number?: string
          transaction_date?: string
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          payment_method?: 'cash' | 'card' | 'digital_wallet' | 'other' | null
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          cashier_id?: string | null
          register_id?: string | null
          shift_id?: string | null
          is_voided?: boolean
          void_reason?: string | null
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      sale_line_items: {
        Row: {
          id: string
          receipt_id: string
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          unit_price: number
          discount_amount: number
          tax_amount: number
          total_amount: number
          cost_price: number | null
          profit_amount: number | null
          is_returned: boolean
          returned_quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          receipt_id: string
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity: number
          unit_price: number
          discount_amount?: number
          tax_amount?: number
          total_amount: number
          cost_price?: number | null
          is_returned?: boolean
          returned_quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          receipt_id?: string
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          unit_price?: number
          discount_amount?: number
          tax_amount?: number
          total_amount?: number
          cost_price?: number | null
          is_returned?: boolean
          returned_quantity?: number
          created_at?: string
        }
      }
      refund_events: {
        Row: {
          id: string
          store_id: string
          receipt_id: string
          line_item_id: string | null
          refund_number: string
          original_amount: number
          refund_amount: number
          refund_quantity: number
          reason: string | null
          processed_by: string | null
          approval_status: 'pending' | 'approved' | 'rejected'
          approved_by: string | null
          refund_method: 'cash' | 'card' | 'store_credit' | 'original_payment' | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          receipt_id: string
          line_item_id?: string | null
          refund_number: string
          original_amount: number
          refund_amount: number
          refund_quantity: number
          reason?: string | null
          processed_by?: string | null
          approval_status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          refund_method?: 'cash' | 'card' | 'store_credit' | 'original_payment' | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          receipt_id?: string
          line_item_id?: string | null
          refund_number?: string
          original_amount?: number
          refund_amount?: number
          refund_quantity?: number
          reason?: string | null
          processed_by?: string | null
          approval_status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          refund_method?: 'cash' | 'card' | 'store_credit' | 'original_payment' | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      void_events: {
        Row: {
          id: string
          store_id: string
          receipt_id: string
          void_type: 'full' | 'partial' | 'line_item'
          voided_amount: number | null
          reason: string
          voided_by: string
          approved_by: string | null
          original_receipt_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          receipt_id: string
          void_type: 'full' | 'partial' | 'line_item'
          voided_amount?: number | null
          reason: string
          voided_by: string
          approved_by?: string | null
          original_receipt_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          receipt_id?: string
          void_type?: 'full' | 'partial' | 'line_item'
          voided_amount?: number | null
          reason?: string
          voided_by?: string
          approved_by?: string | null
          original_receipt_data?: Json | null
          created_at?: string
        }
      }
      daily_metrics: {
        Row: {
          id: string
          store_id: string
          location_id: string | null
          metric_date: string
          total_sales: number
          total_transactions: number
          total_items_sold: number
          average_transaction_value: number | null
          total_tax_collected: number
          total_discounts: number
          total_refunds: number
          gross_profit: number
          unique_customers: number
          new_customers: number
          returning_customers: number
          peak_hour_start: number | null
          peak_hour_end: number | null
          peak_hour_sales: number | null
          inventory_value: number
          low_stock_items: number
          out_of_stock_items: number
          staff_hours: number | null
          labor_cost: number | null
          weather_condition: string | null
          foot_traffic: number | null
          conversion_rate: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          location_id?: string | null
          metric_date: string
          total_sales?: number
          total_transactions?: number
          total_items_sold?: number
          total_tax_collected?: number
          total_discounts?: number
          total_refunds?: number
          gross_profit?: number
          unique_customers?: number
          new_customers?: number
          returning_customers?: number
          peak_hour_start?: number | null
          peak_hour_end?: number | null
          peak_hour_sales?: number | null
          inventory_value?: number
          low_stock_items?: number
          out_of_stock_items?: number
          staff_hours?: number | null
          labor_cost?: number | null
          weather_condition?: string | null
          foot_traffic?: number | null
          conversion_rate?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          location_id?: string | null
          metric_date?: string
          total_sales?: number
          total_transactions?: number
          total_items_sold?: number
          total_tax_collected?: number
          total_discounts?: number
          total_refunds?: number
          gross_profit?: number
          unique_customers?: number
          new_customers?: number
          returning_customers?: number
          peak_hour_start?: number | null
          peak_hour_end?: number | null
          peak_hour_sales?: number | null
          inventory_value?: number
          low_stock_items?: number
          out_of_stock_items?: number
          staff_hours?: number | null
          labor_cost?: number | null
          weather_condition?: string | null
          foot_traffic?: number | null
          conversion_rate?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      hourly_metrics: {
        Row: {
          id: string
          store_id: string
          location_id: string | null
          metric_hour: string
          sales_amount: number
          transaction_count: number
          items_sold: number
          customer_count: number
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          location_id?: string | null
          metric_hour: string
          sales_amount?: number
          transaction_count?: number
          items_sold?: number
          customer_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          location_id?: string | null
          metric_hour?: string
          sales_amount?: number
          transaction_count?: number
          items_sold?: number
          customer_count?: number
          created_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          store_id: string
          location_id: string | null
          alert_type: 'low_stock' | 'out_of_stock' | 'high_demand' | 'slow_moving' | 'expiry' | 'sales_target' | 'inventory_discrepancy' | 'system' | 'custom'
          severity: 'info' | 'warning' | 'critical'
          title: string
          description: string | null
          related_entity_type: string | null
          related_entity_id: string | null
          is_read: boolean
          read_at: string | null
          read_by: string | null
          action_taken: string | null
          action_taken_by: string | null
          action_taken_at: string | null
          dismissed_at: string | null
          dismissed_by: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          location_id?: string | null
          alert_type: 'low_stock' | 'out_of_stock' | 'high_demand' | 'slow_moving' | 'expiry' | 'sales_target' | 'inventory_discrepancy' | 'system' | 'custom'
          severity: 'info' | 'warning' | 'critical'
          title: string
          description?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          is_read?: boolean
          read_at?: string | null
          read_by?: string | null
          action_taken?: string | null
          action_taken_by?: string | null
          action_taken_at?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          location_id?: string | null
          alert_type?: 'low_stock' | 'out_of_stock' | 'high_demand' | 'slow_moving' | 'expiry' | 'sales_target' | 'inventory_discrepancy' | 'system' | 'custom'
          severity?: 'info' | 'warning' | 'critical'
          title?: string
          description?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          is_read?: boolean
          read_at?: string | null
          read_by?: string | null
          action_taken?: string | null
          action_taken_by?: string | null
          action_taken_at?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      recommendations: {
        Row: {
          id: string
          store_id: string
          location_id: string | null
          recommendation_type: 'pricing' | 'inventory' | 'marketing' | 'staffing' | 'product_mix' | 'promotion' | 'operational'
          title: string
          description: string
          rationale: string | null
          expected_impact: string | null
          confidence_score: number | null
          priority: number
          status: 'pending' | 'accepted' | 'rejected' | 'implemented' | 'snoozed'
          target_metrics: Json | null
          implemented_by: string | null
          implemented_at: string | null
          implementation_notes: string | null
          actual_results: Json | null
          dismissed_at: string | null
          dismissed_by: string | null
          dismiss_reason: string | null
          ai_model_version: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          location_id?: string | null
          recommendation_type: 'pricing' | 'inventory' | 'marketing' | 'staffing' | 'product_mix' | 'promotion' | 'operational'
          title: string
          description: string
          rationale?: string | null
          expected_impact?: string | null
          confidence_score?: number | null
          priority?: number
          status?: 'pending' | 'accepted' | 'rejected' | 'implemented' | 'snoozed'
          target_metrics?: Json | null
          implemented_by?: string | null
          implemented_at?: string | null
          implementation_notes?: string | null
          actual_results?: Json | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          dismiss_reason?: string | null
          ai_model_version?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          location_id?: string | null
          recommendation_type?: 'pricing' | 'inventory' | 'marketing' | 'staffing' | 'product_mix' | 'promotion' | 'operational'
          title?: string
          description?: string
          rationale?: string | null
          expected_impact?: string | null
          confidence_score?: number | null
          priority?: number
          status?: 'pending' | 'accepted' | 'rejected' | 'implemented' | 'snoozed'
          target_metrics?: Json | null
          implemented_by?: string | null
          implemented_at?: string | null
          implementation_notes?: string | null
          actual_results?: Json | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          dismiss_reason?: string | null
          ai_model_version?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      ai_briefs: {
        Row: {
          id: string
          store_id: string
          location_id: string | null
          brief_type: 'daily' | 'weekly' | 'monthly' | 'custom'
          period_start: string
          period_end: string
          summary: string
          key_highlights: Json
          concerns: Json
          opportunities: Json
          action_items: Json
          performance_metrics: Json
          comparison_period_metrics: Json
          sentiment_analysis: Json | null
          ai_model_version: string | null
          generated_at: string
          viewed_by: string[]
          feedback_rating: number | null
          feedback_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          location_id?: string | null
          brief_type: 'daily' | 'weekly' | 'monthly' | 'custom'
          period_start: string
          period_end: string
          summary: string
          key_highlights?: Json
          concerns?: Json
          opportunities?: Json
          action_items?: Json
          performance_metrics?: Json
          comparison_period_metrics?: Json
          sentiment_analysis?: Json | null
          ai_model_version?: string | null
          generated_at?: string
          viewed_by?: string[]
          feedback_rating?: number | null
          feedback_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          location_id?: string | null
          brief_type?: 'daily' | 'weekly' | 'monthly' | 'custom'
          period_start?: string
          period_end?: string
          summary?: string
          key_highlights?: Json
          concerns?: Json
          opportunities?: Json
          action_items?: Json
          performance_metrics?: Json
          comparison_period_metrics?: Json
          sentiment_analysis?: Json | null
          ai_model_version?: string | null
          generated_at?: string
          viewed_by?: string[]
          feedback_rating?: number | null
          feedback_notes?: string | null
          created_at?: string
        }
      }
      chat_queries: {
        Row: {
          id: string
          store_id: string
          user_id: string
          session_id: string | null
          query_text: string
          response_text: string | null
          context_data: Json | null
          intent_classification: string | null
          entities_extracted: Json | null
          query_type: 'sales' | 'inventory' | 'analytics' | 'general' | 'troubleshooting' | null
          response_time_ms: number | null
          was_helpful: boolean | null
          follow_up_questions: Json | null
          ai_model_version: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id: string
          session_id?: string | null
          query_text: string
          response_text?: string | null
          context_data?: Json | null
          intent_classification?: string | null
          entities_extracted?: Json | null
          query_type?: 'sales' | 'inventory' | 'analytics' | 'general' | 'troubleshooting' | null
          response_time_ms?: number | null
          was_helpful?: boolean | null
          follow_up_questions?: Json | null
          ai_model_version?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string
          session_id?: string | null
          query_text?: string
          response_text?: string | null
          context_data?: Json | null
          intent_classification?: string | null
          entities_extracted?: Json | null
          query_type?: 'sales' | 'inventory' | 'analytics' | 'general' | 'troubleshooting' | null
          response_time_ms?: number | null
          was_helpful?: boolean | null
          follow_up_questions?: Json | null
          ai_model_version?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      imports: {
        Row: {
          id: string
          store_id: string
          import_type: 'products' | 'inventory' | 'sales' | 'customers' | 'suppliers' | 'categories' | 'unified'
          file_name: string
          file_size_bytes: number | null
          file_format: 'csv' | 'excel' | 'json' | 'xml' | null
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
          total_rows: number | null
          processed_rows: number
          successful_rows: number
          failed_rows: number
          error_log: Json
          mapping_config: Json | null
          mapping_accuracy: number | null
          column_mapping_details: Json | null
          validation_rules: Json | null
          initiated_by: string
          started_at: string | null
          completed_at: string | null
          processing_time_ms: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          import_type: 'products' | 'inventory' | 'sales' | 'customers' | 'suppliers' | 'categories' | 'unified'
          file_name: string
          file_size_bytes?: number | null
          file_format?: 'csv' | 'excel' | 'json' | 'xml' | null
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
          total_rows?: number | null
          processed_rows?: number
          successful_rows?: number
          failed_rows?: number
          error_log?: Json
          mapping_config?: Json | null
          mapping_accuracy?: number | null
          column_mapping_details?: Json | null
          validation_rules?: Json | null
          initiated_by: string
          started_at?: string | null
          completed_at?: string | null
          processing_time_ms?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          import_type?: 'products' | 'inventory' | 'sales' | 'customers' | 'suppliers' | 'categories' | 'unified'
          file_name?: string
          file_size_bytes?: number | null
          file_format?: 'csv' | 'excel' | 'json' | 'xml' | null
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
          total_rows?: number | null
          processed_rows?: number
          successful_rows?: number
          failed_rows?: number
          error_log?: Json
          mapping_config?: Json | null
          mapping_accuracy?: number | null
          column_mapping_details?: Json | null
          validation_rules?: Json | null
          initiated_by?: string
          started_at?: string | null
          completed_at?: string | null
          processing_time_ms?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      import_row_details: {
        Row: {
          id: string
          import_id: string
          row_number: number
          row_data: Json
          status: 'pending' | 'success' | 'error' | 'warning'
          error_message: string | null
          error_details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          import_id: string
          row_number: number
          row_data?: Json
          status?: 'pending' | 'success' | 'error' | 'warning'
          error_message?: string | null
          error_details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          import_id?: string
          row_number?: number
          row_data?: Json
          status?: 'pending' | 'success' | 'error' | 'warning'
          error_message?: string | null
          error_details?: Json | null
          created_at?: string
        }
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
  }
}
