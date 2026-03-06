import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";

export default function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")}
      className="h-7 px-2 text-xs font-semibold gap-1 border-border"
    >
      {currency === "USD" ? "$ USD" : "₹ INR"}
    </Button>
  );
}
