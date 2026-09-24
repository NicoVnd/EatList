export interface UserProfile {
  id: string
  name: string
  email: string
  created_at: string
}

export interface Household {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface HouseholdMember {
  household_id: string
  user_id: string
  created_at: string
  user?: UserProfile
}

export interface ShoppingItem {
  id: string
  household_id: string
  name: string
  quantity: string | null
  checked: boolean
  added_by: string | null
  created_at: string
  updated_at: string
  author?: UserProfile | null
}

export interface Expense {
  id: string
  household_id: string
  amount: number
  paid_by: string
  description: string | null
  purchased_at: string
  created_at: string
  payer?: UserProfile | null
}

export interface MealPlan {
  id: string
  household_id: string
  date: string // YYYY-MM-DD
  lunch: string | null
  dinner: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MealIdea {
  id: string
  household_id: string
  title: string
  description: string | null
  added_by: string | null
  created_at: string
  author?: UserProfile | null
}

export interface Recipe {
  id: string
  household_id: string
  title: string
  description: string | null
  prep_time: string | null
  cook_time: string | null
  servings: number | null
  category: string | null
  ingredients: string[] | string | null
  instructions: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  author?: UserProfile | null
}
