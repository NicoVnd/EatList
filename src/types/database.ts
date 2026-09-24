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
      users: {
        Row: {
          id: string
          name: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          created_at?: string
        }
      }
      households: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
      }
      household_members: {
        Row: {
          household_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          household_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          household_id?: string
          user_id?: string
          created_at?: string
        }
      }
      shopping_items: {
        Row: {
          id: string
          household_id: string
          name: string
          quantity: string | null
          checked: boolean
          added_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          quantity?: string | null
          checked?: boolean
          added_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          quantity?: string | null
          checked?: boolean
          added_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          household_id: string
          amount: number
          paid_by: string
          description: string | null
          purchased_at: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          amount: number
          paid_by: string
          description?: string | null
          purchased_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          amount?: number
          paid_by?: string
          description?: string | null
          purchased_at?: string
          created_at?: string
        }
      }
      meal_plans: {
        Row: {
          id: string
          household_id: string
          date: string
          lunch: string | null
          dinner: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          date: string
          lunch?: string | null
          dinner?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          date?: string
          lunch?: string | null
          dinner?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meal_ideas: {
        Row: {
          id: string
          household_id: string
          title: string
          description: string | null
          added_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          title: string
          description?: string | null
          added_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          title?: string
          description?: string | null
          added_by?: string | null
          created_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          household_id: string
          title: string
          description: string | null
          prep_time: string | null
          cook_time: string | null
          servings: number | null
          category: string | null
          ingredients: Json | null
          instructions: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          title: string
          description?: string | null
          prep_time?: string | null
          cook_time?: string | null
          servings?: number | null
          category?: string | null
          ingredients?: Json | null
          instructions?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          title?: string
          description?: string | null
          prep_time?: string | null
          cook_time?: string | null
          servings?: number | null
          category?: string | null
          ingredients?: Json | null
          instructions?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
