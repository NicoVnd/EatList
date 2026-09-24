-- ==============================================================================
-- TABLE POUR LES RECETTES DU FOYER
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  prep_time TEXT,
  cook_time TEXT,
  servings INT DEFAULT 4,
  category TEXT DEFAULT 'Plat',
  ingredients JSONB DEFAULT '[]'::jsonb,
  instructions TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Activation du temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.recipes;

-- Sécurité RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members can view recipes" ON public.recipes;
CREATE POLICY "Household members can view recipes" ON public.recipes
  FOR SELECT USING (public.is_member_of_household(household_id));

DROP POLICY IF EXISTS "Household members can insert recipes" ON public.recipes;
CREATE POLICY "Household members can insert recipes" ON public.recipes
  FOR INSERT WITH CHECK (public.is_member_of_household(household_id));

DROP POLICY IF EXISTS "Household members can update recipes" ON public.recipes;
CREATE POLICY "Household members can update recipes" ON public.recipes
  FOR UPDATE USING (public.is_member_of_household(household_id));

DROP POLICY IF EXISTS "Household members can delete recipes" ON public.recipes;
CREATE POLICY "Household members can delete recipes" ON public.recipes
  FOR DELETE USING (public.is_member_of_household(household_id));
