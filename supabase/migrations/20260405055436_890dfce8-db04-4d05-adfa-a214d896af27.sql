-- Convert existing INR-locked users' wallet_balance from USD to INR (using market rate 93)
UPDATE public.profiles 
SET wallet_balance = wallet_balance * 93
WHERE wallet_currency = 'INR' AND wallet_balance > 0;