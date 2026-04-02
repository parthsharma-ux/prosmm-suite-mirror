import { useCurrency } from "@/hooks/useCurrency";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export default function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  const { profile } = useAuth();
  const walletCurrency = (profile as any)?.wallet_currency as string | null;
  const isLocked = !!walletCurrency;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => !isLocked && setCurrency(currency === "USD" ? "INR" : "USD")}
      disabled={isLocked}
      className={`h-8 px-2.5 text-xs font-semibold gap-1 ${isLocked ? "text-muted-foreground/50 cursor-not-allowed" : "text-muted-foreground hover:text-foreground"}`}
      title={isLocked ? `Currency locked to ${walletCurrency}` : "Toggle currency"}
    >
      {isLocked && <Lock className="h-3 w-3" />}
      {currency === "USD" ? "$ USD" : "₹ INR"}
    </Button>
  );
}
