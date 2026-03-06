import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Categories</h2>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Sort Order</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {categories.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No categories</TableCell></TableRow>}
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.sort_order}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
