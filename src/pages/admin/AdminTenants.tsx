import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TENANT_STATUSES } from '@/lib/constants';
import { Users, Plus, Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminTenants() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', apartment_id: '', lease_start: '', lease_end: '', status: 'active' });

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('*, apartments(apartment_number)').order('last_name');
      return data ?? [];
    },
  });

  const { data: apartments } = useQuery({
    queryKey: ['admin-apartments-list'],
    queryFn: async () => {
      const { data } = await supabase.from('apartments').select('id, apartment_number').order('apartment_number');
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || null,
        apartment_id: data.apartment_id || null,
        lease_start: data.lease_start || null,
        lease_end: data.lease_end || null,
        status: data.status,
      };
      if (editing) {
        const { error } = await supabase.from('tenants').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tenants').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast.success(editing ? 'Mieter aktualisiert' : 'Mieter angelegt');
      setOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (e: any) => toast.error('Fehler', { description: e.message }),
  });

  const resetForm = () => setForm({ first_name: '', last_name: '', email: '', phone: '', apartment_id: '', lease_start: '', lease_end: '', status: 'active' });

  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      first_name: t.first_name,
      last_name: t.last_name,
      email: t.email,
      phone: t.phone || '',
      apartment_id: t.apartment_id || '',
      lease_start: t.lease_start || '',
      lease_end: t.lease_end || '',
      status: t.status,
    });
    setOpen(true);
  };

  const statusColor: Record<string, string> = { active: 'status-done', moved_out: 'status-closed', paused: 'status-progress' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Mieter</h1>
          <p className="text-muted-foreground text-sm mt-1">{tenants?.length ?? 0} Mieter</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Mieter</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">{editing ? 'Mieter bearbeiten' : 'Neuer Mieter'}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Vorname *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required /></div>
                <div className="space-y-1"><Label className="text-xs">Nachname *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">E-Mail *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
                <div className="space-y-1"><Label className="text-xs">Telefon</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Apartment</Label>
                <Select value={form.apartment_id} onValueChange={v => setForm(f => ({ ...f, apartment_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Apartment wählen" /></SelectTrigger>
                  <SelectContent>
                    {apartments?.map(a => <SelectItem key={a.id} value={a.id}>{a.apartment_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Mietbeginn</Label><Input type="date" value={form.lease_start} onChange={e => setForm(f => ({ ...f, lease_start: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Mietende</Label><Input type="date" value={form.lease_end} onChange={e => setForm(f => ({ ...f, lease_end: e.target.value }))} /></div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TENANT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
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
      ) : !tenants || tenants.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground text-sm">Noch keine Mieter angelegt.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tenants.map(t => {
            const statusLabel = TENANT_STATUSES.find(s => s.value === t.status)?.label ?? t.status;
            const apt = (t as any).apartments;
            return (
              <Card key={t.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{t.first_name} {t.last_name}</p>
                      <span className={`status-badge ${statusColor[t.status] || 'status-closed'}`}>{statusLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.email} {apt && `· ${apt.apartment_number}`}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
