-- ==============================================================================
-- FIX RLS POUR LA CRÉATION DE FOYER ET GESTION DES MEMBRES
-- ==============================================================================

-- 1. Corriger la politique de sélection des foyers :
-- Un utilisateur doit pouvoir voir les foyers dont il est membre OU qu'il a créé.
DROP POLICY IF EXISTS "Members can view their households" ON public.households;
CREATE POLICY "Members and creators can view their households" ON public.households
  FOR SELECT USING (
    created_by = auth.uid() OR public.is_member_of_household(id)
  );

-- 2. Permettre à tout utilisateur connecté de créer un foyer avec auth.uid()
DROP POLICY IF EXISTS "Users can create a household" ON public.households;
CREATE POLICY "Users can create a household" ON public.households
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = created_by
  );

-- 3. Permettre aux membres ou créateurs de mettre à jour le foyer
DROP POLICY IF EXISTS "Creators or members can update household" ON public.households;
CREATE POLICY "Creators or members can update household" ON public.households
  FOR UPDATE USING (
    created_by = auth.uid() OR public.is_member_of_household(id)
  );

-- 4. Assurer que l'insertion dans household_members fonctionne bien pour soi-même
DROP POLICY IF EXISTS "Users can join households or creator adds members" ON public.household_members;
CREATE POLICY "Users can join households or creator adds members" ON public.household_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR public.is_member_of_household(household_id)
  );

DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_member_of_household(household_id)
  );
