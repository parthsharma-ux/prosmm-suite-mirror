import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/types/database";

type Category = Tables<"categories">;

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => { setEditing(null); setName(""); setDialogOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setName(c.name); setDialogOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (editing) {
      const { error } = await supabase.from("categories").update({ name }).eq("id", editing.id);
      if (error) toast.error(error.message); else { toast.success("Updated"); setDialogOpen(false); fetchCategories(); }
    } else {
      const { error } = await supabase.from("categories").insert({ name });
      if (error) toast.error(error.message); else { toast.success("Added"); setDialogOpen(false); fetchCategories(); }
    }
  };

  const del = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("categories").delete().eq("id", id); toast.success("Deleted"); fetchCategories(); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organize your services</p>
        </div>
        <Button size="sm" onClick={openAdd} className="font-semibold"><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
      </div>
      <Card className="border-border bg-card overflow-hidden">
        <div className="table-wrapper">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-xs">Name</TableHead>
                <TableHead className="font-semibold text-xs">Sort Order</TableHead>
                <TableHead className="text-right font-semibold text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No categories</TableCell></TableRow>}
              {categories.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.sort_order}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => del(c.id)} className="h-8 w-8"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-bold">{editing ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" /></div>
            <Button onClick={handleSave} className="w-full font-semibold">{editing ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
