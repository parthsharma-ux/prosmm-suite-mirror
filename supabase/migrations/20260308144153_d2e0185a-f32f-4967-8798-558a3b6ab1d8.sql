CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tickets" ON public.tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all tickets" ON public.tickets FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all tickets" ON public.tickets FOR UPDATE USING (has_role(auth.uid(), 'admin'));