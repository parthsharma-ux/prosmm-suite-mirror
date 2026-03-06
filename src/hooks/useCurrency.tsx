import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Currency = "USD" | "INR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  exchangeRate: number;
  convert: (usd: number) => number;
  symbol: string;
  format: (usd: number, decimals?: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: () => {},
  exchangeRate: 83.5,
  convert: (v) => v,
  symbol: "$",
  format: (v) => `$${v.toFixed(2)}`,
});

export const useCurrency = () => useContext(CurrencyContext);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem("currency") as Currency) || "USD";
  });
  const [exchangeRate, setExchangeRate] = useState(83.5);

  useEffect(() => {
    supabase
      .from("payment_settings")
      .select("setting_value")
      .eq("setting_key", "usd_to_inr_rate")
      .single()
      .then(({ data }) => {
        if (data) setExchangeRate(parseFloat(data.setting_value) || 83.5);
      });
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("currency", c);
  };

  const convert = (usd: number) => (currency === "INR" ? usd * exchangeRate : usd);
  const symbol = currency === "INR" ? "₹" : "$";
  const format = (usd: number, decimals = 2) => `${symbol}${convert(usd).toFixed(decimals)}`;

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, exchangeRate, convert, symbol, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}
