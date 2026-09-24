-- ==============================================================================
-- AUTORISER LA SUPPRESSION DE FOYER PAR LE PROPRIÉTAIRE (AVEC CASCADE)
-- ET LA SUPPRESSION DE MEMBRES (QUITTER LE FOYER)
-- ==============================================================================

-- 1. Politique de suppression du foyer (uniquement le propriétaire / créateur)
DROP POLICY IF EXISTS "Owners can delete their household" ON public.households;
CREATE POLICY "Owners can delete their household" ON public.households
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- 2. Politique de suppression d'un membre (soi-même pour quitter, ou propriétaire du foyer)
DROP POLICY IF EXISTS "Members can leave household or owner remove" ON public.household_members;
CREATE POLICY "Members can leave household or owner remove" ON public.household_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.households
      WHERE households.id = household_members.household_id
      AND households.created_by = auth.uid()
    )
  );
