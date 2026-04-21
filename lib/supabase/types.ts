// lib/supabase/types.ts
// Hand-written minimal Database type. Matches migrations 20260420000001 + 20260420000002.
// Phase 2 may regenerate via `pnpm exec supabase gen types typescript --local`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CluuMood = 'stoked' | 'content' | 'sleepy' | 'blue';
export type VerdictGrade = 'pass' | 'flair';
export type AttemptVerdict = 'pass' | 'flair' | 'fail';
export type CosmeticSlot = 'head' | 'body' | 'back' | 'eyes';
export type CosmeticSource = 'encounter_reward' | 'dlc_pack' | 'event';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
          last_active_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          last_active_at?: string;
        };
        Update: {
          email?: string | null;
          display_name?: string | null;
          last_active_at?: string;
        };
      };
      player_state: {
        Row: {
          user_id: string;
          cluu_mood: CluuMood;
          cluu_cosmetics: Json;
          island_progress: Json;
          unlocked_biomes: string[];
          migration_processed: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          cluu_mood?: CluuMood;
          cluu_cosmetics?: Json;
          island_progress?: Json;
          unlocked_biomes?: string[];
          migration_processed?: boolean;
          updated_at?: string;
        };
        Update: {
          cluu_mood?: CluuMood;
          cluu_cosmetics?: Json;
          island_progress?: Json;
          unlocked_biomes?: string[];
          migration_processed?: boolean;
          updated_at?: string;
        };
      };
      library_entries: {
        Row: {
          id: string;
          user_id: string;
          encounter_id: string;
          prompt_text: string;
          generated_response: string;
          grade: VerdictGrade;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          encounter_id: string;
          prompt_text: string;
          generated_response: string;
          grade: VerdictGrade;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          prompt_text?: string;
          generated_response?: string;
          grade?: VerdictGrade;
          tags?: string[];
        };
      };
      cosmetic_catalogue: {
        Row: {
          id: string;
          slot: CosmeticSlot;
          name: string;
          source: CosmeticSource;
          sprite_path: string;
          unlock_condition: Json;
        };
        Insert: {
          id: string;
          slot: CosmeticSlot;
          name: string;
          source: CosmeticSource;
          sprite_path: string;
          unlock_condition?: Json;
        };
        Update: Partial<{
          name: string;
          sprite_path: string;
          unlock_condition: Json;
        }>;
      };
      user_cosmetics: {
        Row: {
          user_id: string;
          cosmetic_id: string;
          acquired_at: string;
          acquisition_source: string | null;
        };
        Insert: {
          user_id: string;
          cosmetic_id: string;
          acquired_at?: string;
          acquisition_source?: string | null;
        };
        Update: never;
      };
      encounter_attempts: {
        Row: {
          id: string;
          user_id: string;
          encounter_id: string;
          verdict: AttemptVerdict;
          prompt_hash: string;
          tokens_used: number;
          cached: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          encounter_id: string;
          verdict: AttemptVerdict;
          prompt_hash: string;
          tokens_used?: number;
          cached?: boolean;
          created_at?: string;
        };
        Update: never;
      };
    };
    Enums: {
      cluu_mood: CluuMood;
      verdict_grade: VerdictGrade;
      attempt_verdict: AttemptVerdict;
      cosmetic_slot: CosmeticSlot;
      cosmetic_source: CosmeticSource;
    };
  };
};
