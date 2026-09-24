-- ==============================================================================
-- SCHEMA INITIAL POUR GESTION-FOYER (SUPABASE)
-- ==============================================================================

-- 1. Table des utilisateurs (synchronisée avec auth.users ou profil public)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Table des foyers
CREATE TABLE IF NOT EXISTS public.households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Membres du foyer
CREATE TABLE IF NOT EXISTS public.household_members (
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (household_id, user_id)
);

-- 4. Articles de la liste de courses
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity TEXT,
  checked BOOLEAN DEFAULT FALSE NOT NULL,
  added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Dépenses de courses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  paid_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  description TEXT,
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- ACTIVATION DU TEMPS RÉEL (SUPABASE REALTIME)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;

-- ==============================================================================
-- RLS (ROW LEVEL SECURITY)
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Helper function pour savoir si un user appartient au foyer
CREATE OR REPLACE FUNCTION public.is_member_of_household(lookup_household_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = lookup_household_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politiques RLS: users
CREATE POLICY "Users can view profile of household peers" ON public.users
  FOR SELECT USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.household_members m1
      JOIN public.household_members m2 ON m1.household_id = m2.household_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = public.users.id
    )
  );

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Politiques RLS: households
CREATE POLICY "Members can view their households" ON public.households
  FOR SELECT USING (public.is_member_of_household(id));

CREATE POLICY "Users can create a household" ON public.households
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Politiques RLS: household_members
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT USING (public.is_member_of_household(household_id));

CREATE POLICY "Users can join households or creator adds members" ON public.household_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR public.is_member_of_household(household_id)
  );

-- Politiques RLS: shopping_items
CREATE POLICY "Household members can view shopping items" ON public.shopping_items
  FOR SELECT USING (public.is_member_of_household(household_id));

CREATE POLICY "Household members can add shopping items" ON public.shopping_items
  FOR INSERT WITH CHECK (public.is_member_of_household(household_id));

CREATE POLICY "Household members can update shopping items" ON public.shopping_items
  FOR UPDATE USING (public.is_member_of_household(household_id));

CREATE POLICY "Household members can delete shopping items" ON public.shopping_items
  FOR DELETE USING (public.is_member_of_household(household_id));

-- Politiques RLS: expenses
CREATE POLICY "Household members can view expenses" ON public.expenses
  FOR SELECT USING (public.is_member_of_household(household_id));

CREATE POLICY "Household members can add expenses" ON public.expenses
  FOR INSERT WITH CHECK (public.is_member_of_household(household_id));

CREATE POLICY "Household members can update expenses" ON public.expenses
  FOR UPDATE USING (public.is_member_of_household(household_id));

CREATE POLICY "Household members can delete expenses" ON public.expenses
  FOR DELETE USING (public.is_member_of_household(household_id));
