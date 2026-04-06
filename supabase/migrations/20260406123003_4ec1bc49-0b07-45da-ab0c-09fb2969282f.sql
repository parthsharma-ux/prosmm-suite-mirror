UPDATE profiles 
SET wallet_balance = ROUND(wallet_balance * 105, 4) 
WHERE wallet_currency = 'INR' AND wallet_balance > 0;