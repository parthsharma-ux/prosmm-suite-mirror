import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { toast } from "sonner";

export default function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  const { profile } = useAuth();
  const walletCurrency = (profile as any)?.wallet_currency as string | null;
  const isLocked = !!walletCurrency;

  const handleToggle = () => {
    if (isLocked) {
      toast.error("Currency cannot be changed after adding funds");
      return;
    }
    setCurrency(currency === "USD" ? "INR" : "USD");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className={`h-8 px-2.5 text-xs font-semibold gap-1 ${isLocked ? "text-muted-foreground/50 cursor-not-allowed" : "text-muted-foreground hover:text-foreground"}`}
    >
      {isLocked && <Lock className="h-3 w-3" />}
      {currency === "USD" ? "$ USD" : "₹ INR"}
    </Button>
  );
}