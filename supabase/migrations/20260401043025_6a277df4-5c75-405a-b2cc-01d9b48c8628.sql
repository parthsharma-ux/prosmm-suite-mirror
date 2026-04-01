
-- Fix payment_settings RLS: drop the ALL policy and create separate ones with proper WITH CHECK
DROP POLICY IF EXISTS "Admins can manage payment settings" ON public.payment_settings;

CREATE POLICY "Admins can select payment settings" ON public.payment_settings
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert payment settings" ON public.payment_settings
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payment settings" ON public.payment_settings
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete payment settings" ON public.payment_settings
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add wallet_currency column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_currency text DEFAULT NULL;
