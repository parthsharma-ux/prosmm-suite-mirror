
ALTER TABLE public.public_services ADD COLUMN IF NOT EXISTS rate_inr numeric NOT NULL DEFAULT 0;
ALTER TABLE public.public_services ADD COLUMN IF NOT EXISTS rate_usdt numeric NOT NULL DEFAULT 0;
