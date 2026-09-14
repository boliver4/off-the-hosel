// Hand-written types mirroring supabase/schema.sql.
// If you regenerate this from the Supabase CLI (`supabase gen types typescript`),
// this file's shape should stay compatible with how lib/supabase/*.ts use it.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          is_admin?: boolean;
          created_at?: string;
        };
      };
      golfers: {
        Row: {
          id: string;
          name: string;
          world_rank: number | null;
          active: boolean;
          headshot_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          world_rank?: number | null;
          active?: boolean;
          headshot_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["golfers"]["Insert"]>;
      };
      tournaments: {
        Row: {
          id: string;
          name: string;
          course: string | null;
          location: string | null;
          start_date: string;
          end_date: string;
          is_major: boolean;
          field_size: number | null;
          purse: number | null;
          winnings_scoring_pct: number;
          pick_lock_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          course?: string | null;
          location?: string | null;
          start_date: string;
          end_date: string;
          is_major?: boolean;
          field_size?: number | null;
          purse?: number | null;
          winnings_scoring_pct?: number;
          pick_lock_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tournaments"]["Insert"]>;
      };
      golfer_salaries: {
        Row: { tournament_id: string; golfer_id: string; salary: number };
        Insert: { tournament_id: string; golfer_id: string; salary: number };
        Update: Partial<Database["public"]["Tables"]["golfer_salaries"]["Insert"]>;
      };
      tournament_results: {
        Row: {
          tournament_id: string;
          golfer_id: string;
          winnings: number;
          made_cut: boolean;
          finish_position: string | null;
          entered_by: string | null;
          entered_at: string;
        };
        Insert: {
          tournament_id: string;
          golfer_id: string;
          winnings?: number;
          made_cut?: boolean;
          finish_position?: string | null;
          entered_by?: string | null;
          entered_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tournament_results"]["Insert"]>;
      };
      one_and_done_picks: {
        Row: {
          id: string;
          user_id: string;
          tournament_id: string;
          golfer_id: string;
          picked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tournament_id: string;
          golfer_id: string;
          picked_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["one_and_done_picks"]["Insert"]>;
      };
      major_lineups: {
        Row: {
          id: string;
          user_id: string;
          tournament_id: string;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tournament_id: string;
          submitted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["major_lineups"]["Insert"]>;
      };
      major_lineup_golfers: {
        Row: { lineup_id: string; golfer_id: string; salary_at_pick: number };
        Insert: { lineup_id: string; golfer_id: string; salary_at_pick: number };
        Update: Partial<Database["public"]["Tables"]["major_lineup_golfers"]["Insert"]>;
      };
    };
    Views: {
      tournament_result_points: {
        Row: {
          tournament_id: string;
          golfer_id: string;
          winnings: number;
          made_cut: boolean;
          finish_position: string | null;
          winnings_scoring_pct: number;
          points: number;
        };
      };
      one_and_done_pick_points: {
        Row: {
          pick_id: string;
          user_id: string;
          tournament_id: string;
          golfer_id: string;
          picked_at: string;
          points: number;
          made_cut: boolean | null;
          winnings: number | null;
        };
      };
      one_and_done_standings: {
        Row: {
          user_id: string;
          display_name: string;
          total_points: number;
          weeks_picked: number;
        };
      };
      major_lineup_points: {
        Row: {
          lineup_id: string;
          user_id: string;
          tournament_id: string;
          total_points: number;
        };
      };
      major_lineup_totals: {
        Row: {
          lineup_id: string;
          user_id: string;
          tournament_id: string;
          golfer_count: number;
          total_salary: number;
        };
      };
    };
    Functions: {
      fantasy_points: {
        Args: { p_winnings: number; p_made_cut: boolean; p_pct: number };
        Returns: number;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}
