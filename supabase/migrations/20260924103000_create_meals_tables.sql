-- ==============================================================================
-- TABLES POUR LES MENUS DE LA SEMAINE ET LES IDÉES DE REPAS
-- ==============================================================================

-- 1. Table des menus de la semaine (par date et par foyer)
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  lunch TEXT,
  dinner TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(household_id, date)
);

-- 2. Table des idées de repas (boîte à idées du foyer)
CREATE TABLE IF NOT EXISTS public.meal_ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- TEMPS RÉEL (SUPABASE REALTIME)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_ideas;

-- ==============================================================================
-- RLS (ROW LEVEL SECURITY)
-- ==============================================================================
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_ideas ENABLE ROW LEVEL SECURITY;

-- Politiques RLS: meal_plans
DROP POLICY IF EXISTS "Household members can view meal plans" ON public.meal_plans;
CREATE POLICY "Household members can view meal plans" ON public.meal_plans
  FOR SELECT USING (public.is_member_of_household(household_id));

DROP POLICY IF EXISTS "Household members can insert meal plans" ON public.meal_plans;
CREATE POLICY "Household members can insert meal plans" ON public.meal_plans
  FOR INSERT WITH CHECK (public.is_member_of_household(household_id));

DROP POLICY IF EXISTS "Household members can update meal plans" ON public.meal_plans;
CREATE POLICY "Household members can update meal plans" ON public.meal_plans
  FOR UPDATE USING (public.is_member_of_household(household_id));

DROP POLICY IF EXISTS "Household members can delete meal plans" ON public.meal_plans;
CREATE POLICY "Household members can delete meal plans" ON public.meal_plans
  FOR DELETE USING (public.is_member_of_household(household_id));

-- Politiques RLS: meal_ideas
DROP POLICY IF EXISTS "Household members can view meal ideas" ON public.meal_ideas;
CREATE POLICY "Household members can view meal ideas" ON public.meal_ideas
  FOR SELECT USING (public.is_member_of_household(household_id));

DROP POLICY IF EXISTS "Household members can insert meal ideas" ON public.meal_ideas;
CREATE POLICY "Household members can insert meal ideas" ON public.meal_ideas
  FOR INSERT WITH CHECK (public.is_member_of_household(household_id));

DROP POLICY IF EXISTS "Household members can update meal ideas" ON public.meal_ideas;
CREATE POLICY "Household members can update meal ideas" ON public.meal_ideas
  FOR UPDATE USING (public.is_member_of_household(household_id));

DROP POLICY IF EXISTS "Household members can delete meal ideas" ON public.meal_ideas;
CREATE POLICY "Household members can delete meal ideas" ON public.meal_ideas
  FOR DELETE USING (public.is_member_of_household(household_id));
