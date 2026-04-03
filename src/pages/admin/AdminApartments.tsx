import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { APARTMENT_STATUSES } from '@/lib/constants';
import { Building2, Plus, Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function AdminApartments() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ apartment_number: '', name: '', street: '', city: 'Berlin', postal_code: '', floor: '', size_sqm: '', rooms: '1', status: 'available' });

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
        size_sqm: data.size_sqm ? parseFloat(data.size_sqm) : null,
        rooms: data.rooms ? parseInt(data.rooms) : 1,
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

  const resetForm = () => setForm({ apartment_number: '', name: '', street: '', city: 'Berlin', postal_code: '', floor: '', size_sqm: '', rooms: '1', status: 'available' });

  const openEdit = (apt: any) => {
    setEditing(apt);
    setForm({
      apartment_number: apt.apartment_number,
      name: apt.name || '',
      street: apt.street || '',
      city: apt.city || 'Berlin',
      postal_code: apt.postal_code || '',
      floor: apt.floor || '',
      size_sqm: apt.size_sqm?.toString() || '',
      rooms: apt.rooms?.toString() || '1',
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
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Etage</Label><Input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">m²</Label><Input type="number" value={form.size_sqm} onChange={e => setForm(f => ({ ...f, size_sqm: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Zimmer</Label><Input type="number" value={form.rooms} onChange={e => setForm(f => ({ ...f, rooms: e.target.value }))} /></div>
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
            return (
              <Card key={apt.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{apt.apartment_number} {apt.name && `– ${apt.name}`}</p>
                      <span className={`status-badge ${statusColor[apt.status] || 'status-closed'}`}>{statusLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{apt.street && `${apt.street}, `}{apt.postal_code} {apt.city} {apt.size_sqm && `· ${apt.size_sqm} m²`}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(apt)}><Pencil className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
