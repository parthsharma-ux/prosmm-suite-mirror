import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FolderOpen, Hash } from "lucide-react";
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
        <div className="page-header mb-0">
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize your services</p>
        </div>
        <Button size="sm" onClick={openAdd} className="font-semibold rounded-lg shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="ecom-card p-12 text-center">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No categories</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => (
            <div key={c.id} className="ecom-card-interactive p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <FolderOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm text-foreground truncate">{c.name}</h3>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    <span>Order: {c.sort_order}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="flex-1 h-8 text-xs rounded-lg">
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="icon" onClick={() => del(c.id)} className="h-8 w-8 shrink-0">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-bold">{editing ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-lg" /></div>
            <Button onClick={handleSave} className="w-full font-semibold rounded-xl">{editing ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
