import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";

export default function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")}
      className="h-8 px-2.5 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
    >
      {currency === "USD" ? "$ USD" : "₹ INR"}
    </Button>
  );
}
