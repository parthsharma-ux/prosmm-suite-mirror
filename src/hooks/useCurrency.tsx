import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Currency = "USD" | "INR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  exchangeRate: number;
  marketRate: number;
  convert: (usd: number) => number;
  symbol: string;
  format: (usd: number, decimals?: number) => string;
  formatWallet: (usd: number, decimals?: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: () => {},
  exchangeRate: 83.5,
  marketRate: 93,
  convert: (v) => v,
  symbol: "$",
  format: (v) => `$${v.toFixed(2)}`,
  formatWallet: (v) => `$${v.toFixed(2)}`,
});

export const useCurrency = () => useContext(CurrencyContext);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem("currency") as Currency) || "USD";
  });
  const [exchangeRate, setExchangeRate] = useState(110);
  const [marketRate, setMarketRate] = useState(93);

  useEffect(() => {
    const fetchRates = async () => {
      const { data } = await supabase.from("payment_settings").select("method, details").in("method", ["exchange_rate", "market_rate"]);
      if (data) {
        for (const row of data) {
          const details = row.details as Record<string, string> || {};
          const rate = parseFloat(details.rate);
          if (!isNaN(rate) && rate > 0) {
            if (row.method === "exchange_rate") setExchangeRate(rate);
            if (row.method === "market_rate") setMarketRate(rate);
          }
        }
      }
    };
    fetchRates();
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("currency", c);
  };

  const convert = (usd: number) => (currency === "INR" ? usd * exchangeRate : usd);
  const symbol = currency === "INR" ? "₹" : "$";
  const format = (usd: number, decimals = 2) => `${symbol}${convert(usd).toFixed(decimals)}`;
  const formatWallet = (usd: number, decimals = 2) => {
    const val = currency === "INR" ? usd * marketRate : usd;
    return `${symbol}${val.toFixed(decimals)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, exchangeRate, marketRate, convert, symbol, format, formatWallet }}>
      {children}
    </CurrencyContext.Provider>
  );
}
