-- ==============================================================================
-- SYNCHRONISER LES UTILISATEURS EXISTANTS DANS PUBLIC.USERS ET LIER DIRECTEMENT
-- ==============================================================================

-- 1. Insérer tous les utilisateurs auth.users qui ne sont pas encore dans public.users
INSERT INTO public.users (id, name, email)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(email, '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Améliorer la table households pour lier directement created_by à auth.users(id)
-- afin d'éviter tout blocage de clé étrangère
ALTER TABLE public.households 
  DROP CONSTRAINT IF EXISTS households_created_by_fkey;

ALTER TABLE public.households 
  ADD CONSTRAINT households_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Trigger automatique garanti à chaque nouvel utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
