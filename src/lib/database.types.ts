export interface Database {
  public: {
    Tables: {
      reports: {
        Row: {
          id: string
          user_id: string
          domain: string
          report_data: Record<string, unknown>
          template: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domain: string
          report_data: Record<string, unknown>
          template?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          domain?: string
          report_data?: Record<string, unknown>
          template?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      workspace_reports: {
        Row: {
          workspace_id: string
          report_id: string
          added_at: string
        }
        Insert: {
          workspace_id: string
          report_id: string
          added_at?: string
        }
        Update: {
          workspace_id?: string
          report_id?: string
          added_at?: string
        }
        Relationships: []
      }
      comparisons: {
        Row: {
          id: string
          user_id: string
          domains: string[]
          comparison_data: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domains: string[]
          comparison_data: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          domains?: string[]
          comparison_data?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
      icp_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          icp_data: Record<string, unknown>
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icp_data: Record<string, unknown>
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icp_data?: Record<string, unknown>
          is_default?: boolean
          created_at?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          domain: string | null
          tokens_used: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          domain?: string | null
          tokens_used?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          domain?: string | null
          tokens_used?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
