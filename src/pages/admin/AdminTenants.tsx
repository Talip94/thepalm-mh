import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TENANT_STATUSES } from '@/lib/constants';
import { Users, Plus, Pencil, Trash2, RefreshCw, ChevronDown, ChevronRight, Eye, EyeOff, Key } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pw = '';
  for (let i = 0; i < length; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export default function AdminTenants() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', apartment_id: '', lease_start: '', lease_end: '', status: 'active', password: generatePassword() });

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
        const { data: newTenant, error } = await supabase.from('tenants').insert(payload).select().single();
        if (error) throw error;

        const { data: result, error: fnError } = await supabase.functions.invoke('admin-manage-tenant', {
          body: { action: 'create', email: data.email, password: data.password, tenant_id: newTenant.id },
        });
        if (fnError) throw fnError;
        if (result?.error) throw new Error(result.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin-apartments'] });
      toast.success(editing ? 'Mieter aktualisiert' : 'Mieter angelegt – Zugangsdaten erstellt');
      setOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (e: any) => toast.error('Fehler', { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data: result, error } = await supabase.functions.invoke('admin-manage-tenant', {
        body: { action: 'delete', tenant_id: tenantId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin-apartments'] });
      toast.success('Mieter gelöscht – Zugang entfernt');
    },
    onError: (e: any) => toast.error('Fehler', { description: e.message }),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ tenantId, password }: { tenantId: string; password: string }) => {
      const { data: result, error } = await supabase.functions.invoke('admin-manage-tenant', {
        body: { action: 'update_password', tenant_id: tenantId, password },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast.success('Passwort aktualisiert');
    },
    onError: (e: any) => toast.error('Fehler', { description: e.message }),
  });

  const resetForm = () => { setShowPassword(false); setForm({ first_name: '', last_name: '', email: '', phone: '', apartment_id: '', lease_start: '', lease_end: '', status: 'active', password: generatePassword() }); };

  const openEdit = (t: any) => {
    setEditing(t);
    setShowPassword(false);
    setForm({
      first_name: t.first_name,
      last_name: t.last_name,
      email: t.email,
      phone: t.phone || '',
      apartment_id: t.apartment_id || '',
      lease_start: t.lease_start || '',
      lease_end: t.lease_end || '',
      status: t.status,
      password: t.initial_password || '',
    });
    setOpen(true);
  };

  const activeTenants = (tenants ?? []).filter(t => t.status !== 'moved_out');
  const archivedTenants = (tenants ?? []).filter(t => t.status === 'moved_out');
  const statusColor: Record<string, string> = { active: 'status-done', moved_out: 'status-closed', paused: 'status-progress' };

  const renderTenantCard = (t: any) => {
    const statusLabel = TENANT_STATUSES.find(s => s.value === t.status)?.label ?? t.status;
    const apt = (t as any).apartments;
    return (
      <Card key={t.id} className="hover:border-primary/20 transition-colors cursor-pointer" onClick={() => navigate(`/admin/tenants/${t.id}`)}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">{t.first_name} {t.last_name}</p>
              <span className={`status-badge ${statusColor[t.status] || 'status-closed'}`}>{statusLabel}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.email} {apt && `· ${apt.apartment_number}`}
              {t.lease_start && ` · ab ${format(new Date(t.lease_start), 'dd.MM.yyyy')}`}
              {t.lease_end && ` – ${format(new Date(t.lease_end), 'dd.MM.yyyy')}`}
            </p>
          </div>
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mieter löschen?</AlertDialogTitle>
                  <AlertDialogDescription>„{t.first_name} {t.last_name}" wird unwiderruflich gelöscht und verliert den Zugang zum Portal.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Mieter</h1>
          <p className="text-muted-foreground text-sm mt-1">{activeTenants.length} aktiv{archivedTenants.length > 0 && ` · ${archivedTenants.length} archiviert`}</p>
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
                <Label className="text-xs">{editing ? 'Passwort' : 'Passwort (automatisch generiert)'}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      required={!editing}
                      placeholder={editing ? 'Aktuelles Passwort' : ''}
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {editing && editing.user_id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!form.password || updatePasswordMutation.isPending}
                      onClick={() => updatePasswordMutation.mutate({ tenantId: editing.id, password: form.password })}
                    >
                      <Key className="h-4 w-4 mr-1" />
                      {updatePasswordMutation.isPending ? '…' : 'Ändern'}
                    </Button>
                  )}
                </div>
                {editing && <p className="text-xs text-muted-foreground mt-1">Passwort generieren und mit „Ändern" speichern.</p>}
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
      ) : activeTenants.length === 0 && archivedTenants.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground text-sm">Noch keine Mieter angelegt.</p></CardContent></Card>
      ) : (
        <>
          <div className="space-y-2">
            {activeTenants.map(renderTenantCard)}
          </div>

          {archivedTenants.length > 0 && (
            <Collapsible open={showArchived} onOpenChange={setShowArchived}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground gap-2">
                  {showArchived ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Ausgezogene Mieter ({archivedTenants.length})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {archivedTenants.map(renderTenantCard)}
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
}
