-- Existing expenses remain groceries; fuel is tracked separately.
ALTER TABLE public.expenses
  ADD COLUMN category TEXT NOT NULL DEFAULT 'groceries'
  CHECK (category IN ('groceries', 'fuel'));

CREATE INDEX expenses_household_category_date_idx
  ON public.expenses (household_id, category, purchased_at);
