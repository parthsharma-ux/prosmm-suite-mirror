import { Card, CardContent } from "@/components/ui/card";

export default function AdminMapping() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold tracking-tight">API Mapping</h2>
      <Card className="border-border/50">
        <CardContent className="pt-6 text-center text-muted-foreground py-12">
          <p className="text-sm">Service-to-provider mapping will be available after syncing provider services.</p>
          <p className="text-xs mt-2">Go to Providers → Sync to fetch services from your API providers first.</p>
        </CardContent>
      </Card>
    </div>
  );
}