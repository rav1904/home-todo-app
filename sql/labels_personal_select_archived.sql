-- Run in Supabase SQL editor.
-- Allow owners to SELECT their own personal labels whether active or archived.
-- Task pickers still filter active = true in the app.
-- Admin still cannot SELECT personal labels.
-- Other users still cannot SELECT another user's personal labels.

BEGIN;

DROP POLICY IF EXISTS "Users can view their own active personal labels"
  ON public.labels;

DROP POLICY IF EXISTS "Users can view their own personal labels"
  ON public.labels;

CREATE POLICY "Users can view their own personal labels"
  ON public.labels
  FOR SELECT
  TO authenticated
  USING (
    scope = 'personal'
    AND created_by = auth.uid()
  );

COMMIT;
