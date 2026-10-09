export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type TenantPlan = "start" | "pro" | "business";
export type TenantLicenseStatus = "active" | "past_due" | "suspended";
export type TenantModuleKey =
  | "crm" | "quotes" | "orders" | "catalog" | "stock" | "printers" | "production"
  | "maintenance" | "quality" | "qr_codes" | "actual_costs" | "planner" | "advanced_reports"
  | "customer_portal" | "api" | "integrations" | "ai" | "multiunit" | "remove_branding";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; tenant_id: string; full_name: string; email: string; role: string; active: boolean; created_at: string; updated_at: string };
        Insert: { id: string; tenant_id: string; full_name: string; email: string; role: string; active?: boolean };
        Update: Partial<Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "role" | "active">>;
        Relationships: [];
      };
      tenant_domains: {
        Row: { tenant_id: string; host: string; kind: string; status: string };
        Insert: { tenant_id: string; host: string; kind?: string; status?: string };
        Update: never;
        Relationships: [];
      };
      tenant_settings: {
        Row: { tenant_id: string; timezone: string; locale: string; currency: string; updated_at: string };
        Insert: never;
        Update: Partial<Pick<Database["public"]["Tables"]["tenant_settings"]["Row"], "timezone" | "locale" | "currency">>;
        Relationships: [];
      };
      tenant_modules: {
        Row: { tenant_id: string; module_key: TenantModuleKey; enabled: boolean; created_at: string; updated_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          company_name: string | null;
          email: string | null;
          phone: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          company_name?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: Partial<Pick<Database["public"]["Tables"]["customers"]["Row"], "name" | "company_name" | "email" | "phone" | "notes" | "archived_at">>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          category: string | null;
          description: string | null;
          image_path: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          category?: string | null;
          description?: string | null;
          image_path?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Pick<Database["public"]["Tables"]["products"]["Row"], "name" | "category" | "description" | "active" | "image_path">>;
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          name: string;
          sku: string;
          attributes: Record<string, string>;
          price_cents: number;
          cost_cents: number | null;
          is_default: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          name: string;
          sku: string;
          attributes?: Record<string, string>;
          price_cents: number;
          cost_cents?: number | null;
          is_default?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Pick<Database["public"]["Tables"]["product_variants"]["Row"], "name" | "sku" | "attributes" | "price_cents" | "cost_cents" | "active">>;
        Relationships: [];
      };
      finished_goods_stock: {
        Row: { tenant_id: string; product_variant_id: string; quantity: number; updated_at: string };
        Insert: { tenant_id: string; product_variant_id: string; quantity?: number; updated_at?: string };
        Update: never;
        Relationships: [];
      };
      finished_goods_movements: {
        Row: { id: string; tenant_id: string; product_variant_id: string; kind: string; delta_quantity: number; quantity_after: number; reason: string; actor_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      designs: {
        Row: { id: string; tenant_id: string; name: string; description: string | null; category: string | null; active: boolean; created_by: string; created_at: string; updated_at: string };
        Insert: { id?: string; tenant_id: string; name: string; description?: string | null; category?: string | null; active?: boolean; created_by?: string; created_at?: string; updated_at?: string };
        Update: Partial<Pick<Database["public"]["Tables"]["designs"]["Row"], "name" | "description" | "category" | "active">>;
        Relationships: [];
      };
      design_revisions: {
        Row: { id: string; tenant_id: string; design_id: string; version: string; notes: string | null; created_by: string; created_at: string };
        Insert: { id?: string; tenant_id: string; design_id: string; version: string; notes?: string | null; created_by?: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      design_files: {
        Row: { id: string; tenant_id: string; design_id: string; revision_id: string; storage_path: string; filename: string; format: string; mime_type: string; size_bytes: number; created_by: string; created_at: string };
        Insert: { id?: string; tenant_id: string; design_id: string; revision_id: string; storage_path: string; filename: string; format: string; mime_type: string; size_bytes: number; created_by?: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      opportunities: {
        Row: { id: string; tenant_id: string; customer_id: string; title: string; stage: string; estimated_value_cents: number | null; notes: string | null; lost_reason: string | null; created_by: string; created_at: string; updated_at: string };
        Insert: { id?: string; tenant_id: string; customer_id: string; title: string; stage?: string; estimated_value_cents?: number | null; notes?: string | null; lost_reason?: string | null; created_by?: string; created_at?: string; updated_at?: string };
        Update: Partial<Pick<Database["public"]["Tables"]["opportunities"]["Row"], "title" | "stage" | "estimated_value_cents" | "notes" | "lost_reason">>;
        Relationships: [];
      };
      quotes: {
        Row: { id: string; tenant_id: string; number: number; customer_id: string; opportunity_id: string | null; status: string; pricing_version: number; cost_components: Json; risk_bps: number; fees_bps: number; margin_bps: number; total_cost_cents: number; total_price_cents: number; created_by: string; created_at: string; updated_at: string; sent_at: string | null; approved_at: string | null };
        Insert: never; Update: never; Relationships: [];
      };
      quote_items: {
        Row: { id: string; tenant_id: string; quote_id: string; product_variant_id: string | null; design_revision_id: string | null; material_id: string | null; description: string; quantity: number; unit_cost_cents: number; unit_price_cents: number; total_price_cents: number };
        Insert: never; Update: never; Relationships: [];
      };
      sales_orders: {
        Row: { id: string; tenant_id: string; number: number; customer_id: string; quote_id: string | null; status: string; total_price_cents: number; total_cost_cents: number; created_by: string; created_at: string; updated_at: string };
        Insert: never; Update: never; Relationships: [];
      };
      sales_order_items: {
        Row: { id: string; tenant_id: string; order_id: string; quote_item_id: string | null; product_variant_id: string | null; design_revision_id: string | null; recipe_version: number | null; material_id: string | null; estimated_g: number | null; estimated_minutes: number | null; units_per_plate: number | null; description: string; quantity: number; unit_price_cents: number; total_price_cents: number };
        Insert: never; Update: never; Relationships: [];
      };
      audit_events: {
        Row: { id: number; tenant_id: string; actor_id: string; action: string; entity: string; entity_id: string; before_state: Json | null; after_state: Json | null; created_at: string };
        Insert: { tenant_id: string; actor_id: string; action: string; entity: string; entity_id: string; before_state?: Json | null; after_state?: Json | null };
        Update: never; Relationships: [];
      };
      materials: {
        Row: { id: string; tenant_id: string; name: string; kind: string; color: string | null; cost_per_kg_cents: number; active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; tenant_id: string; name: string; kind: string; color?: string | null; cost_per_kg_cents?: number; active?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Pick<Database["public"]["Tables"]["materials"]["Row"], "name" | "kind" | "color" | "cost_per_kg_cents" | "active">>;
        Relationships: [];
      };
      printers: {
        Row: { id: string; tenant_id: string; name: string; model: string | null; status: string; active: boolean; runtime_min: number; created_at: string; updated_at: string };
        Insert: { id?: string; tenant_id: string; name: string; model?: string | null; status?: string; active?: boolean; runtime_min?: number; created_at?: string; updated_at?: string };
        Update: Partial<Pick<Database["public"]["Tables"]["printers"]["Row"], "name" | "model" | "active">>;
        Relationships: [];
      };
      material_spools: {
        Row: { id: string; tenant_id: string; material_id: string; code: string; tare_g: number; initial_gross_g: number; current_gross_g: number; status: string; created_at: string; updated_at: string };
        Insert: never; Update: never; Relationships: [];
      };
      spool_movements: {
        Row: { id: number; tenant_id: string; spool_id: string; kind: string; delta_g: number; gross_after_g: number; reason: string; actor_id: string; created_at: string };
        Insert: never; Update: never; Relationships: [];
      };
      production_orders: {
        Row: { id: string; tenant_id: string; sales_order_id: string; sales_order_item_id: string; design_revision_id: string | null; material_id: string | null; target_qty: number; status: string; created_by: string; created_at: string; updated_at: string };
        Insert: never; Update: never; Relationships: [];
      };
      production_jobs: {
        Row: { id: string; tenant_id: string; production_order_id: string; design_revision_id: string | null; printer_id: string | null; spool_id: string; quantity: number; estimated_minutes: number; estimated_g: number; material_cost_per_kg_cents: number | null; status: string; actual_minutes: number | null; consumed_g: number | null; good_qty: number | null; bad_qty: number | null; created_by: string; operator_id: string | null; created_at: string; started_at: string | null; completed_at: string | null };
        Insert: never; Update: never; Relationships: [];
      };
      material_reservations: {
        Row: { id: string; tenant_id: string; spool_id: string; job_id: string; reserved_g: number; status: string; created_at: string; resolved_at: string | null };
        Insert: never; Update: never; Relationships: [];
      };
      job_failures: {
        Row: { id: string; tenant_id: string; job_id: string; reason: string; reported_by: string; created_at: string };
        Insert: never; Update: never; Relationships: [];
      };
      maintenance_plans: {
        Row: { id: string; tenant_id: string; printer_id: string; interval_min: number; alert_before_min: number; last_service_runtime_min: number; active: boolean; created_at: string; updated_at: string };
        Insert: { tenant_id: string; printer_id: string; interval_min: number; alert_before_min?: number; active?: boolean };
        Update: Partial<Pick<Database["public"]["Tables"]["maintenance_plans"]["Row"], "interval_min" | "alert_before_min" | "active">>;
        Relationships: [];
      };
      tenant_branding: {
        Row: { tenant_id: string; display_name: string; primary_color: string; accent_color: string; logo_path: string | null; created_at: string; updated_at: string };
        Insert: never;
        Update: Partial<Pick<Database["public"]["Tables"]["tenant_branding"]["Row"], "display_name" | "primary_color" | "accent_color" | "logo_path">>;
        Relationships: [];
      };
      platform_admins: {
        Row: { id: string; full_name: string; active: boolean; created_at: string };
        Insert: { id: string; full_name: string; active?: boolean };
        Update: Partial<Pick<Database["public"]["Tables"]["platform_admins"]["Row"], "full_name" | "active">>;
        Relationships: [];
      };
      platform_audit_events: {
        Row: { id: number; actor_id: string; tenant_id: string | null; action: string; before_state: Json | null; after_state: Json | null; created_at: string };
        Insert: { actor_id: string; tenant_id?: string | null; action: string; before_state?: Json | null; after_state?: Json | null };
        Update: never; Relationships: [];
      };
      maintenance_logs: {
        Row: { id: string; tenant_id: string; printer_id: string; plan_id: string; runtime_at_service_min: number; cost_cents: number; notes: string; performed_by: string; performed_at: string };
        Insert: never; Update: never; Relationships: [];
      };
      order_shipments: {
        Row: { id: string; tenant_id: string; order_id: string; carrier: string | null; tracking_code: string | null; shipped_by: string; shipped_at: string; delivered_at: string | null };
        Insert: never; Update: never; Relationships: [];
      };
      order_payments: {
        Row: { id: string; tenant_id: string; order_id: string; amount_cents: number; method: string; idempotency_key: string; received_by: string; received_at: string };
        Insert: never; Update: never; Relationships: [];
      };
      operational_expenses: {
        Row: { id: string; tenant_id: string; category: string; amount_cents: number; description: string; incurred_on: string; idempotency_key: string; created_by: string; created_at: string };
        Insert: never; Update: never; Relationships: [];
      };
    };
    Views: {
      tenant_runtime: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: TenantPlan;
          license_status: TenantLicenseStatus;
          maintenance_status: string;
        };
        Relationships: [];
      };
      production_recipes: {
        Row: { id: string; tenant_id: string; product_variant_id: string; design_revision_id: string; material_id: string; version: number; estimated_g: number; estimated_minutes: number; units_per_plate: number; active: boolean; created_by: string; created_at: string };
        Insert: never; Update: never; Relationships: [];
      };
    };
    Functions: {
      list_sales_orders_page: { Args: { p_tenant_id: string; p_page?: number; p_page_size?: number; p_search?: string; p_status?: string; p_selected_order_id?: string | null }; Returns: Json };
    create_product_with_default_variant: { Args: { p_product_id: string; p_name: string; p_price_cents: number; p_cost_cents: number; p_image_path: string }; Returns: string };
      provision_tenant_with_owner: {
        Args: {
          p_name: string;
          p_slug: string;
          p_host: string;
          p_owner_id: string;
          p_owner_name: string;
          p_owner_email: string;
        };
        Returns: string;
      };
      create_quote: {
        Args: { p_customer_id: string; p_opportunity_id: string | null; p_product_variant_id: string | null; p_design_revision_id: string | null; p_description: string; p_quantity: number; p_material_cents: number; p_machine_cents: number; p_energy_cents: number; p_labor_cents: number; p_consumables_cents: number; p_depreciation_cents: number; p_risk_bps: number; p_fees_bps: number; p_margin_bps: number };
        Returns: string;
      };
      set_quote_status: { Args: { p_quote_id: string; p_next_status: string }; Returns: void };
      approve_quote: { Args: { p_quote_id: string }; Returns: string };
      create_sales_order: { Args: { p_customer_id: string; p_product_variant_id: string; p_quantity: number }; Returns: string };
      update_sales_order: { Args: { p_order_id: string; p_customer_id: string; p_product_variant_id: string; p_quantity: number }; Returns: void };
      delete_sales_order: { Args: { p_order_id: string }; Returns: void };
      receive_spool: { Args: { p_material_id: string; p_code: string; p_gross_g: number; p_tare_g: number }; Returns: string };
      adjust_spool_weight: { Args: { p_spool_id: string; p_new_gross_g: number; p_reason: string }; Returns: void };
      set_spool_available_quantity: { Args: { p_spool_id: string; p_available_g: number }; Returns: void };
      set_finished_goods_quantity: { Args: { p_product_variant_id: string; p_quantity: number; p_reason: string }; Returns: void };
      release_order_to_production: { Args: { p_order_id: string }; Returns: void };
      create_production_job: { Args: { p_production_order_id: string; p_printer_id: string | null; p_spool_id: string; p_quantity: number; p_estimated_minutes: number; p_estimated_g: number }; Returns: string };
      create_production_job_once: { Args: { p_request_key: string; p_production_order_id: string; p_printer_id: string | null; p_spool_id: string; p_quantity: number; p_estimated_minutes: number; p_estimated_g: number }; Returns: string };
      start_next_production_job: { Args: { p_production_order_id: string }; Returns: string };
      cancel_queued_production_job: { Args: { p_job_id: string; p_reason: string }; Returns: void };
      start_production_job: { Args: { p_job_id: string }; Returns: void };
      complete_production_job: { Args: { p_job_id: string; p_actual_minutes: number; p_consumed_g: number; p_good_qty: number; p_bad_qty: number }; Returns: void };
      fail_production_job: { Args: { p_job_id: string; p_reason: string; p_actual_minutes: number; p_consumed_g: number }; Returns: void };
      record_printer_maintenance: { Args: { p_plan_id: string; p_cost_cents: number; p_notes: string }; Returns: string };
      ship_order: { Args: { p_order_id: string; p_carrier: string | null; p_tracking_code: string | null }; Returns: string };
      deliver_order: { Args: { p_order_id: string }; Returns: void };
      record_order_payment: { Args: { p_order_id: string; p_amount_cents: number; p_method: string; p_idempotency_key: string }; Returns: string };
      record_operational_expense: { Args: { p_category: string; p_amount_cents: number; p_description: string; p_incurred_on: string; p_idempotency_key: string }; Returns: string };
      get_operational_report: { Args: { p_start: string; p_end: string }; Returns: Json };
      platform_update_tenant: { Args: { p_tenant_id: string; p_plan: string; p_license_status: string; p_actor_id: string }; Returns: void };
      platform_set_module: { Args: { p_tenant_id: string; p_module_key: string; p_enabled: boolean; p_actor_id: string }; Returns: void };
      platform_assign_tenant_user: { Args: { p_tenant_id: string; p_user_id: string; p_full_name: string; p_email: string; p_role: string; p_actor_id: string }; Returns: void };
      platform_update_tenant_user: { Args: { p_tenant_id: string; p_user_id: string; p_role: string; p_active: boolean; p_actor_id: string }; Returns: void };
      create_production_recipe: { Args: { p_variant_id: string; p_design_revision_id: string; p_material_id: string; p_estimated_g: number; p_estimated_minutes: number; p_units_per_plate: number }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
