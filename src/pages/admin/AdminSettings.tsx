import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, FolderOpen, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['document-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('document_categories').select('*').order('sort_order');
      return data ?? [];
    },
  });

  const saveCatMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: catForm.name,
        description: catForm.description || null,
        sort_order: editingCat ? editingCat.sort_order : (categories?.length ?? 0) + 1,
      };
      if (editingCat) {
        const { error } = await supabase.from('document_categories').update(payload).eq('id', editingCat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('document_categories').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-categories'] });
      toast.success(editingCat ? 'Kategorie aktualisiert' : 'Kategorie erstellt');
      setCatOpen(false);
      setEditingCat(null);
      setCatForm({ name: '', description: '' });
    },
    onError: (e: any) => toast.error('Fehler', { description: e.message }),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-categories'] });
      toast.success('Kategorie gelöscht');
    },
    onError: (e: any) => toast.error('Fehler', { description: e.message }),
  });

  const openEditCat = (cat: any) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, description: cat.description || '' });
    setCatOpen(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Einstellungen</h1>
        <p className="text-muted-foreground text-sm mt-1">Systemkonfiguration und Verwaltung</p>
      </div>

      {/* Document Categories */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Dokumentkategorien
            </CardTitle>
            <Dialog open={catOpen} onOpenChange={(v) => { setCatOpen(v); if (!v) { setEditingCat(null); setCatForm({ name: '', description: '' }); } }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Kategorie</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-heading">{editingCat ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); saveCatMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Beschreibung</Label>
                    <Input value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <Button type="submit" className="w-full" disabled={saveCatMutation.isPending}>
                    {saveCatMutation.isPending ? 'Wird gespeichert…' : 'Speichern'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
          ) : categories && categories.length > 0 ? (
            <div className="space-y-1">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                    <div>
                      <p className="text-sm font-medium">{cat.name}</p>
                      {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => openEditCat(cat)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm('Kategorie wirklich löschen?')) deleteCatMutation.mutate(cat.id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Kategorien vorhanden.</p>
          )}
        </CardContent>
      </Card>

      {/* General Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Allgemein
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Weitere Einstellungen wie Statusverwaltung und Benachrichtigungskonfiguration werden in zukünftigen Updates verfügbar sein.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
