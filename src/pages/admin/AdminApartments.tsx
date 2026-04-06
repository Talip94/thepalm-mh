import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { APARTMENT_STATUSES, APARTMENT_CATEGORIES } from '@/lib/constants';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const DEFAULT_STREET = 'Leineweberstraße 65';
const DEFAULT_POSTAL = '45468';
const DEFAULT_CITY = 'Mülheim an der Ruhr';

export default function AdminApartments() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const defaultForm = { apartment_number: '', name: '', street: DEFAULT_STREET, city: DEFAULT_CITY, postal_code: DEFAULT_POSTAL, floor: '', category: 'micro', status: 'available' };
  const [form, setForm] = useState(defaultForm);

  const { data: apartments, isLoading } = useQuery({
    queryKey: ['admin-apartments'],
    queryFn: async () => {
      const { data } = await supabase.from('apartments').select('*').order('apartment_number');
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        apartment_number: data.apartment_number,
        name: data.name || null,
        street: data.street || null,
        city: data.city || null,
        postal_code: data.postal_code || null,
        floor: data.floor || null,
        category: data.category,
        rooms: 1,
        status: data.status,
      };
      if (editing) {
        const { error } = await supabase.from('apartments').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('apartments').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apartments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success(editing ? 'Apartment aktualisiert' : 'Apartment erstellt');
      setOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (e: any) => toast.error('Fehler', { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('apartments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apartments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Apartment gelöscht');
    },
    onError: (e: any) => toast.error('Fehler', { description: e.message }),
  });

  const resetForm = () => setForm(defaultForm);

  const openEdit = (apt: any) => {
    setEditing(apt);
    setForm({
      apartment_number: apt.apartment_number,
      name: apt.name || '',
      street: apt.street || DEFAULT_STREET,
      city: apt.city || DEFAULT_CITY,
      postal_code: apt.postal_code || DEFAULT_POSTAL,
      floor: apt.floor || '',
      category: apt.category || 'micro',
      status: apt.status,
    });
    setOpen(true);
  };

  const statusColor: Record<string, string> = {
    available: 'status-done', occupied: 'status-new', maintenance: 'status-progress', inactive: 'status-closed',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Apartments</h1>
          <p className="text-muted-foreground text-sm mt-1">{apartments?.length ?? 0} Apartments</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Apartment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">{editing ? 'Apartment bearbeiten' : 'Neues Apartment'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Nummer *</Label><Input value={form.apartment_number} onChange={e => setForm(f => ({ ...f, apartment_number: e.target.value }))} required /></div>
                <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Straße</Label><Input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">PLZ</Label><Input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Stadt</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Etage</Label><Input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} /></div>
                <div className="space-y-1">
                  <Label className="text-xs">Kategorie</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{APARTMENT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{APARTMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Wird gespeichert…' : 'Speichern'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : !apartments || apartments.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground text-sm">Noch keine Apartments angelegt.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {apartments.map(apt => {
            const statusLabel = APARTMENT_STATUSES.find(s => s.value === apt.status)?.label ?? apt.status;
            const categoryLabel = APARTMENT_CATEGORIES.find(c => c.value === apt.category)?.label ?? apt.category;
            return (
              <Card key={apt.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{apt.apartment_number} {apt.name && `– ${apt.name}`}</p>
                      <span className={`status-badge ${statusColor[apt.status] || 'status-closed'}`}>{statusLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{apt.street && `${apt.street}, `}{apt.postal_code} {apt.city} · {categoryLabel}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(apt)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Apartment löschen?</AlertDialogTitle>
                          <AlertDialogDescription>Das Apartment „{apt.apartment_number}" wird unwiderruflich gelöscht. Zugehörige Mieter verlieren die Zuordnung.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(apt.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Löschen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
