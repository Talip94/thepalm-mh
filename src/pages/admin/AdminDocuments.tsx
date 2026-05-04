import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, Upload, Download, Building2 } from 'lucide-react';
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

  // Group documents by apartment
  const groupedByApartment = (documents ?? []).reduce<Record<string, { label: string; docs: any[] }>>((acc, doc) => {
    const apt = (doc as any).apartments;
    const key = apt?.apartment_number ? `apt-${apt.apartment_number}` : 'unassigned';
    const label = apt?.apartment_number ? `Apartment ${apt.apartment_number}` : 'Ohne Apartment-Zuordnung';
    if (!acc[key]) acc[key] = { label, docs: [] };
    acc[key].docs.push(doc);
    return acc;
  }, {});

  const sortedGroups = Object.entries(groupedByApartment).sort(([a], [b]) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  const handleDownload = async (filePath: string, title: string) => {
    const { data } = await supabase.storage.from('documents').download(filePath);
    if (data) { const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = title; a.click(); URL.revokeObjectURL(url); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dokumente</h1>
          <p className="text-muted-foreground text-sm mt-1">{documents?.length ?? 0} Dokumente in {sortedGroups.length} Apartment-Gruppen</p>
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
        <Card>
          <CardContent className="p-2">
            <Accordion type="multiple" className="w-full">
              {sortedGroups.map(([key, group]) => (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger className="px-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{group.label}</span>
                      <span className="text-xs text-muted-foreground">({group.docs.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 px-2">
                      {group.docs.map(doc => {
                        const cat = (doc as any).document_categories;
                        const tenant = (doc as any).tenants;
                        return (
                          <div key={doc.id} className="flex items-center justify-between py-2 px-3 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{doc.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {cat?.name && `${cat.name} · `}
                                {tenant && `${tenant.first_name} ${tenant.last_name} · `}
                                {format(new Date(doc.created_at), 'dd.MM.yyyy')}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.file_path, doc.title)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
