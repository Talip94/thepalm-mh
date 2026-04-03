import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDocuments() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', apartment_id: '', tenant_id: '', category_id: '' });
  const [file, setFile] = useState<File | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['admin-documents'],
    queryFn: async () => {
      const { data } = await supabase.from('documents')
        .select('*, document_categories(name), apartments(apartment_number), tenants(first_name, last_name)')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: apartments } = useQuery({ queryKey: ['admin-apartments-list'], queryFn: async () => { const { data } = await supabase.from('apartments').select('id, apartment_number').order('apartment_number'); return data ?? []; } });
  const { data: tenants } = useQuery({ queryKey: ['admin-tenants-list'], queryFn: async () => { const { data } = await supabase.from('tenants').select('id, first_name, last_name').order('last_name'); return data ?? []; } });
  const { data: categories } = useQuery({ queryKey: ['document-categories'], queryFn: async () => { const { data } = await supabase.from('document_categories').select('*').order('sort_order'); return data ?? []; } });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !user) throw new Error('Datei fehlt');
      const filePath = `${form.apartment_id || 'general'}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error } = await supabase.from('documents').insert({
        title: form.title,
        file_path: filePath,
        file_size: file.size,
        file_type: file.name.split('.').pop() || null,
        apartment_id: form.apartment_id || null,
        tenant_id: form.tenant_id || null,
        category_id: form.category_id || null,
        uploaded_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      toast.success('Dokument hochgeladen');
      setOpen(false);
      setForm({ title: '', apartment_id: '', tenant_id: '', category_id: '' });
      setFile(null);
    },
    onError: (e: any) => toast.error('Fehler', { description: e.message }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dokumente</h1>
          <p className="text-muted-foreground text-sm mt-1">{documents?.length ?? 0} Dokumente</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Upload className="h-4 w-4 mr-1" /> Hochladen</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">Dokument hochladen</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); uploadMutation.mutate(); }} className="space-y-4">
              <div className="space-y-1"><Label className="text-xs">Titel *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
              <div className="space-y-1">
                <Label className="text-xs">Datei *</Label>
                <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Apartment</Label>
                  <Select value={form.apartment_id} onValueChange={v => setForm(f => ({ ...f, apartment_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>{apartments?.map(a => <SelectItem key={a.id} value={a.id}>{a.apartment_number}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mieter</Label>
                  <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>{tenants?.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kategorie</Label>
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Kategorie wählen" /></SelectTrigger>
                  <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={uploadMutation.isPending || !file}>
                {uploadMutation.isPending ? 'Wird hochgeladen…' : 'Hochladen'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : !documents || documents.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground text-sm">Noch keine Dokumente vorhanden.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const cat = (doc as any).document_categories;
            const apt = (doc as any).apartments;
            const tenant = (doc as any).tenants;
            return (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat?.name && `${cat.name} · `}{apt?.apartment_number && `${apt.apartment_number} · `}
                      {tenant && `${tenant.first_name} ${tenant.last_name} · `}{format(new Date(doc.created_at), 'dd.MM.yyyy')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    const { data } = await supabase.storage.from('documents').download(doc.file_path);
                    if (data) { const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = doc.title; a.click(); URL.revokeObjectURL(url); }
                  }}>
                    <Download className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
