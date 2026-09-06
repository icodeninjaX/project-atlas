export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      account_balance_adjustments: {
        Row: {
          account_id: string;
          adjustment_centavos: number;
          adjustment_date: string;
          created_at: string;
          id: string;
          note: string | null;
          previous_balance_centavos: number;
          target_balance_centavos: number;
          user_id: string;
        };
        Insert: {
          account_id: string;
          adjustment_centavos: number;
          adjustment_date: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          previous_balance_centavos: number;
          target_balance_centavos: number;
          user_id: string;
        };
        Update: {
          account_id?: string;
          adjustment_centavos?: number;
          adjustment_date?: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          previous_balance_centavos?: number;
          target_balance_centavos?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_balance_adjustments_account_id_user_id_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "financial_account_balances";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "account_balance_adjustments_account_id_user_id_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "financial_accounts";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      account_transfers: {
        Row: {
          amount_centavos: number;
          created_at: string;
          description: string | null;
          destination_account_id: string;
          id: string;
          source_account_id: string;
          transfer_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_centavos: number;
          created_at?: string;
          description?: string | null;
          destination_account_id: string;
          id?: string;
          source_account_id: string;
          transfer_date: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_centavos?: number;
          created_at?: string;
          description?: string | null;
          destination_account_id?: string;
          id?: string;
          source_account_id?: string;
          transfer_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_transfers_destination_account_id_user_id_fkey";
            columns: ["destination_account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "financial_account_balances";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "account_transfers_destination_account_id_user_id_fkey";
            columns: ["destination_account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "financial_accounts";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "account_transfers_source_account_id_user_id_fkey";
            columns: ["source_account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "financial_account_balances";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "account_transfers_source_account_id_user_id_fkey";
            columns: ["source_account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "financial_accounts";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      activity_log: {
        Row: {
          action: string;
          amount_centavos: number | null;
          amount_direction: string | null;
          created_at: string;
          description: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          metadata: Json;
          metric_label: string | null;
          metric_value: string | null;
          module: string;
          occurred_at: string;
          occurred_on: string;
          occurred_precision: string;
          source_href: string | null;
          source_key: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          action: string;
          amount_centavos?: number | null;
          amount_direction?: string | null;
          created_at?: string;
          description?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          metadata?: Json;
          metric_label?: string | null;
          metric_value?: string | null;
          module: string;
          occurred_at: string;
          occurred_on: string;
          occurred_precision: string;
          source_href?: string | null;
          source_key?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action?: string;
          amount_centavos?: number | null;
          amount_direction?: string | null;
          created_at?: string;
          description?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          metadata?: Json;
          metric_label?: string | null;
          metric_value?: string | null;
          module?: string;
          occurred_at?: string;
          occurred_on?: string;
          occurred_precision?: string;
          source_href?: string | null;
          source_key?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      budget_items: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          monthly_budget_id: string;
          planned_centavos: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          monthly_budget_id: string;
          planned_centavos: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          monthly_budget_id?: string;
          planned_centavos?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budget_items_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "transaction_categories";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "budget_items_monthly_budget_id_user_id_fkey";
            columns: ["monthly_budget_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "monthly_budgets";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      daily_priority_pins: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          priority_date: string;
          sort_order: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          priority_date: string;
          sort_order: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          priority_date?: string;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      debt_payments: {
        Row: {
          amount_centavos: number;
          created_at: string;
          debt_id: string;
          id: string;
          notes: string | null;
          payment_date: string;
          transaction_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_centavos: number;
          created_at?: string;
          debt_id: string;
          id?: string;
          notes?: string | null;
          payment_date: string;
          transaction_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_centavos?: number;
          created_at?: string;
          debt_id?: string;
          id?: string;
          notes?: string | null;
          payment_date?: string;
          transaction_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_user_id_fkey";
            columns: ["debt_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "debts";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "debt_payments_transaction_id_user_id_fkey";
            columns: ["transaction_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      debts: {
        Row: {
          created_at: string;
          creditor_name: string;
          current_balance_centavos: number;
          debt_type: string;
          due_day: number | null;
          id: string;
          interest_rate_percent: number;
          minimum_payment_centavos: number;
          next_due_date: string | null;
          notes: string | null;
          original_balance_centavos: number;
          priority: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          creditor_name: string;
          current_balance_centavos: number;
          debt_type: string;
          due_day?: number | null;
          id?: string;
          interest_rate_percent?: number;
          minimum_payment_centavos?: number;
          next_due_date?: string | null;
          notes?: string | null;
          original_balance_centavos: number;
          priority?: number;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          creditor_name?: string;
          current_balance_centavos?: number;
          debt_type?: string;
          due_day?: number | null;
          id?: string;
          interest_rate_percent?: number;
          minimum_payment_centavos?: number;
          next_due_date?: string | null;
          notes?: string | null;
          original_balance_centavos?: number;
          priority?: number;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      financial_accounts: {
        Row: {
          account_type: string;
          created_at: string;
          id: string;
          include_in_runway: boolean;
          institution: string | null;
          is_archived: boolean;
          name: string;
          opening_balance_centavos: number;
          provider_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_type: string;
          created_at?: string;
          id?: string;
          include_in_runway: boolean;
          institution?: string | null;
          is_archived?: boolean;
          name: string;
          opening_balance_centavos?: number;
          provider_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_type?: string;
          created_at?: string;
          id?: string;
          include_in_runway?: boolean;
          institution?: string | null;
          is_archived?: boolean;
          name?: string;
          opening_balance_centavos?: number;
          provider_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      goal_milestones: {
        Row: {
          completed_at: string | null;
          created_at: string;
          description: Json | null;
          goal_id: string;
          id: string;
          sort_order: number;
          target_date: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          description?: Json | null;
          goal_id: string;
          id?: string;
          sort_order?: number;
          target_date?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          description?: Json | null;
          goal_id?: string;
          id?: string;
          sort_order?: number;
          target_date?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_user_id_fkey";
            columns: ["goal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      goals: {
        Row: {
          area: string;
          created_at: string;
          description: string | null;
          id: string;
          progress_percent: number;
          status: string;
          success_definition: string | null;
          target_date: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          area: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          progress_percent?: number;
          status?: string;
          success_definition?: string | null;
          target_date?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          area?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          progress_percent?: number;
          status?: string;
          success_definition?: string | null;
          target_date?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      job_application_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          job_application_id: string;
          notes: string | null;
          occurred_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          job_application_id: string;
          notes?: string | null;
          occurred_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          job_application_id?: string;
          notes?: string | null;
          occurred_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_application_events_job_application_id_user_id_fkey";
            columns: ["job_application_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "career_application_overview";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "job_application_events_job_application_id_user_id_fkey";
            columns: ["job_application_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "job_applications";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      job_applications: {
        Row: {
          applied_at: string | null;
          company_name: string;
          contact_email: string | null;
          contact_name: string | null;
          created_at: string;
          employment_type: string;
          id: string;
          job_url: string | null;
          location: string | null;
          next_action: string | null;
          next_action_at: string | null;
          notes: string | null;
          resume_version: string | null;
          role_title: string;
          salary_max_centavos: number | null;
          salary_min_centavos: number | null;
          stage: string;
          updated_at: string;
          user_id: string;
          work_setup: string;
        };
        Insert: {
          applied_at?: string | null;
          company_name: string;
          contact_email?: string | null;
          contact_name?: string | null;
          created_at?: string;
          employment_type?: string;
          id?: string;
          job_url?: string | null;
          location?: string | null;
          next_action?: string | null;
          next_action_at?: string | null;
          notes?: string | null;
          resume_version?: string | null;
          role_title: string;
          salary_max_centavos?: number | null;
          salary_min_centavos?: number | null;
          stage?: string;
          updated_at?: string;
          user_id: string;
          work_setup?: string;
        };
        Update: {
          applied_at?: string | null;
          company_name?: string;
          contact_email?: string | null;
          contact_name?: string | null;
          created_at?: string;
          employment_type?: string;
          id?: string;
          job_url?: string | null;
          location?: string | null;
          next_action?: string | null;
          next_action_at?: string | null;
          notes?: string | null;
          resume_version?: string | null;
          role_title?: string;
          salary_max_centavos?: number | null;
          salary_min_centavos?: number | null;
          stage?: string;
          updated_at?: string;
          user_id?: string;
          work_setup?: string;
        };
        Relationships: [];
      };
      monthly_budgets: {
        Row: {
          created_at: string;
          expected_income_centavos: number;
          id: string;
          month_start: string;
          notes: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expected_income_centavos?: number;
          id?: string;
          month_start: string;
          notes?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expected_income_centavos?: number;
          id?: string;
          month_start?: string;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          delivered_at: string;
          delivery_key: string;
          id: string;
          notification_type: string;
          user_id: string;
        };
        Insert: {
          delivered_at?: string;
          delivery_key: string;
          id?: string;
          notification_type: string;
          user_id: string;
        };
        Update: {
          delivered_at?: string;
          delivery_key?: string;
          id?: string;
          notification_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      offline_mutation_receipts: {
        Row: {
          created_at: string;
          mutation_id: string;
          mutation_type: string;
          result_message: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          mutation_id: string;
          mutation_type: string;
          result_message?: string | null;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          mutation_id?: string;
          mutation_type?: string;
          result_message?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          default_currency: string;
          display_name: string | null;
          id: string;
          monthly_net_income_centavos: number;
          next_payday: string | null;
          onboarding_completed: boolean;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          default_currency?: string;
          display_name?: string | null;
          id: string;
          monthly_net_income_centavos?: number;
          next_payday?: string | null;
          onboarding_completed?: boolean;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          default_currency?: string;
          display_name?: string | null;
          id?: string;
          monthly_net_income_centavos?: number;
          next_payday?: string | null;
          onboarding_completed?: boolean;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          created_at: string;
          description: string | null;
          due_at: string | null;
          energy_required: string;
          estimated_minutes: number | null;
          id: string;
          priority: string;
          related_goal_id: string | null;
          scheduled_for: string | null;
          scheduled_time: string | null;
          source_module: string | null;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          energy_required?: string;
          estimated_minutes?: number | null;
          id?: string;
          priority?: string;
          related_goal_id?: string | null;
          scheduled_for?: string | null;
          scheduled_time?: string | null;
          source_module?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          energy_required?: string;
          estimated_minutes?: number | null;
          id?: string;
          priority?: string;
          related_goal_id?: string | null;
          scheduled_for?: string | null;
          scheduled_time?: string | null;
          source_module?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_related_goal_id_user_id_fkey";
            columns: ["related_goal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      transaction_categories: {
        Row: {
          category_type: string;
          created_at: string;
          icon: string | null;
          id: string;
          is_essential: boolean;
          is_system: boolean;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_type: string;
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_essential?: boolean;
          is_system?: boolean;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category_type?: string;
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_essential?: boolean;
          is_system?: boolean;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          account_id: string;
          amount_centavos: number;
          category_id: string;
          created_at: string;
          description: string | null;
          id: string;
          merchant_or_source: string | null;
          transaction_date: string;
          transaction_type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id: string;
          amount_centavos: number;
          category_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          merchant_or_source?: string | null;
          transaction_date: string;
          transaction_type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_id?: string;
          amount_centavos?: number;
          category_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          merchant_or_source?: string | null;
          transaction_date?: string;
          transaction_type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_user_id_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "financial_account_balances";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "transactions_account_id_user_id_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "financial_accounts";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "transactions_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "transaction_categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          created_at: string;
          dayline_capacity_minutes: number;
          dayline_energy_level: string;
          debt_reminders: boolean;
          debt_strategy: string;
          default_account_id: string | null;
          default_task_estimated_minutes: number | null;
          default_task_priority: string;
          home_route: string;
          id: string;
          payday_reminders: boolean;
          quiet_hours_end: string;
          quiet_hours_start: string;
          reminders_enabled: boolean;
          review_reminders: boolean;
          runway_target_months: number;
          task_reminders: boolean;
          theme: string;
          updated_at: string;
          user_id: string;
          week_starts_on: number;
        };
        Insert: {
          created_at?: string;
          dayline_capacity_minutes?: number;
          dayline_energy_level?: string;
          debt_reminders?: boolean;
          debt_strategy?: string;
          default_account_id?: string | null;
          default_task_estimated_minutes?: number | null;
          default_task_priority?: string;
          home_route?: string;
          id?: string;
          payday_reminders?: boolean;
          quiet_hours_end?: string;
          quiet_hours_start?: string;
          reminders_enabled?: boolean;
          review_reminders?: boolean;
          runway_target_months?: number;
          task_reminders?: boolean;
          theme?: string;
          updated_at?: string;
          user_id: string;
          week_starts_on?: number;
        };
        Update: {
          created_at?: string;
          dayline_capacity_minutes?: number;
          dayline_energy_level?: string;
          debt_reminders?: boolean;
          debt_strategy?: string;
          default_account_id?: string | null;
          default_task_estimated_minutes?: number | null;
          default_task_priority?: string;
          home_route?: string;
          id?: string;
          payday_reminders?: boolean;
          quiet_hours_end?: string;
          quiet_hours_start?: string;
          reminders_enabled?: boolean;
          review_reminders?: boolean;
          runway_target_months?: number;
          task_reminders?: boolean;
          theme?: string;
          updated_at?: string;
          user_id?: string;
          week_starts_on?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_default_account_owner_fk";
            columns: ["default_account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "financial_account_balances";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "user_preferences_default_account_owner_fk";
            columns: ["default_account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "financial_accounts";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      weekly_reviews: {
        Row: {
          career_reflection: string | null;
          challenges: string | null;
          completed_at: string | null;
          created_at: string;
          energy_score: number | null;
          id: string;
          lessons: string | null;
          money_reflection: string | null;
          next_week_focus: string | null;
          overall_score: number | null;
          stress_score: number | null;
          time_wasters: string | null;
          updated_at: string;
          user_id: string;
          week_start: string;
          wins: string | null;
        };
        Insert: {
          career_reflection?: string | null;
          challenges?: string | null;
          completed_at?: string | null;
          created_at?: string;
          energy_score?: number | null;
          id?: string;
          lessons?: string | null;
          money_reflection?: string | null;
          next_week_focus?: string | null;
          overall_score?: number | null;
          stress_score?: number | null;
          time_wasters?: string | null;
          updated_at?: string;
          user_id: string;
          week_start: string;
          wins?: string | null;
        };
        Update: {
          career_reflection?: string | null;
          challenges?: string | null;
          completed_at?: string | null;
          created_at?: string;
          energy_score?: number | null;
          id?: string;
          lessons?: string | null;
          money_reflection?: string | null;
          next_week_focus?: string | null;
          overall_score?: number | null;
          stress_score?: number | null;
          time_wasters?: string | null;
          updated_at?: string;
          user_id?: string;
          week_start?: string;
          wins?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      career_application_overview: {
        Row: {
          applied_at: string | null;
          company_name: string | null;
          contact_email: string | null;
          contact_name: string | null;
          created_at: string | null;
          employment_type: string | null;
          id: string | null;
          is_follow_up_overdue: boolean | null;
          job_url: string | null;
          location: string | null;
          next_action: string | null;
          next_action_at: string | null;
          notes: string | null;
          resume_version: string | null;
          role_title: string | null;
          salary_max_centavos: number | null;
          salary_min_centavos: number | null;
          stage: string | null;
          updated_at: string | null;
          user_id: string | null;
          work_setup: string | null;
        };
        Insert: {
          applied_at?: string | null;
          company_name?: string | null;
          contact_email?: string | null;
          contact_name?: string | null;
          created_at?: string | null;
          employment_type?: string | null;
          id?: string | null;
          is_follow_up_overdue?: never;
          job_url?: string | null;
          location?: string | null;
          next_action?: string | null;
          next_action_at?: string | null;
          notes?: string | null;
          resume_version?: string | null;
          role_title?: string | null;
          salary_max_centavos?: number | null;
          salary_min_centavos?: number | null;
          stage?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          work_setup?: string | null;
        };
        Update: {
          applied_at?: string | null;
          company_name?: string | null;
          contact_email?: string | null;
          contact_name?: string | null;
          created_at?: string | null;
          employment_type?: string | null;
          id?: string | null;
          is_follow_up_overdue?: never;
          job_url?: string | null;
          location?: string | null;
          next_action?: string | null;
          next_action_at?: string | null;
          notes?: string | null;
          resume_version?: string | null;
          role_title?: string | null;
          salary_max_centavos?: number | null;
          salary_min_centavos?: number | null;
          stage?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          work_setup?: string | null;
        };
        Relationships: [];
      };
      financial_account_balances: {
        Row: {
          account_type: string | null;
          created_at: string | null;
          current_balance_centavos: number | null;
          id: string | null;
          include_in_runway: boolean | null;
          institution: string | null;
          is_archived: boolean | null;
          name: string | null;
          provider_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      adjust_account_balance: {
        Args: {
          p_account_id: string;
          p_adjustment_date: string;
          p_note?: string;
          p_target_balance_centavos: number;
        };
        Returns: string;
      };
      complete_onboarding: {
        Args: {
          p_current_cash_centavos: number;
          p_display_name: string;
          p_goals: string[];
          p_monthly_net_income_centavos: number;
          p_next_payday: string;
        };
        Returns: undefined;
      };
      dashboard_snapshot: {
        Args: { p_month_start: string; p_today: string; p_week_start: string };
        Returns: Json;
      };
      delete_archived_financial_account: {
        Args: { p_account_id: string; p_confirmation_name: string };
        Returns: string;
      };
      life_timeline: {
        Args: {
          p_before_at?: string;
          p_before_id?: string;
          p_before_on?: string;
          p_from_date?: string;
          p_limit?: number;
          p_module?: string;
          p_query?: string;
          p_to_date?: string;
        };
        Returns: {
          amount_centavos: number;
          amount_direction: string;
          description: string;
          event_id: string;
          event_type: string;
          metric_label: string;
          metric_value: string;
          module: string;
          occurred_at: string;
          occurred_on: string;
          occurred_precision: string;
          source_available: boolean;
          source_href: string;
          title: string;
        }[];
      };
      runway_monthly_totals: {
        Args: { p_end_date: string; p_start_date: string };
        Returns: {
          amount_centavos: number;
          category_id: string;
          month_start: string;
          transaction_type: string;
        }[];
      };
      save_monthly_budget: {
        Args: {
          p_expected_income_centavos: number;
          p_items: Json;
          p_month_start: string;
          p_notes: string;
        };
        Returns: string;
      };
      save_runway_preferences: {
        Args: {
          p_account_ids: string[];
          p_category_ids: string[];
          p_target_months: number;
        };
        Returns: undefined;
      };
      search_atlas: {
        Args: {
          p_entity_type?: string;
          p_from_date?: string;
          p_limit?: number;
          p_query: string;
          p_status?: string;
          p_to_date?: string;
        };
        Returns: {
          entity_id: string;
          entity_path: string;
          entity_status: string;
          entity_type: string;
          occurred_at: string;
          subtitle: string;
          title: string;
        }[];
      };
      validate_task_reminder_scheduler_secret: {
        Args: { p_secret: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
