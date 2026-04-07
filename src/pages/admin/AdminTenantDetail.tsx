import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Download, FileText, Trash2 } from 'lucide-react';
import { TENANT_STATUSES, APARTMENT_CATEGORIES } from '@/lib/constants';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

interface DocUploadRow {
  id: string;
  title: string;
  category_id: string;
  file: File | null;
}

function makeRow(): DocUploadRow {
  return { id: crypto.randomUUID(), title: '', category_id: '', file: null };
}

export default function AdminTenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [uploadRows, setUploadRows] = useState<DocUploadRow[]>([makeRow()]);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin-tenant', id],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('*, apartments(apartment_number, category, street, city)').eq('id', id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ['admin-tenant-documents', id],
    queryFn: async () => {
      const { data } = await supabase.from('documents')
        .select('*, document_categories(name)')
        .eq('tenant_id', id!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: categories } = useQuery({
    queryKey: ['document-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('document_categories').select('*').order('sort_order');
      return data ?? [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (rows: DocUploadRow[]) => {
      if (!user || !tenant) throw new Error('Fehler');
      for (const row of rows) {
        if (!row.file || !row.title) continue;
        const filePath = `${tenant.apartment_id || 'general'}/${Date.now()}_${row.file.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, row.file);
        if (uploadError) throw uploadError;
        const { error } = await supabase.from('documents').insert({
          title: row.title,
          file_path: filePath,
          file_size: row.file.size,
          file_type: row.file.name.split('.').pop() || null,
          apartment_id: tenant.apartment_id || null,
          tenant_id: tenant.id,
          category_id: row.category_id || null,
          uploaded_by: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-documents', id] });
      toast.success('Dokumente hochgeladen');
      setUploadRows([makeRow()]);
    },
    onError: (e: any) => toast.error('Fehler', { description: e.message }),
  });

  const updateRow = (rowId: string, updates: Partial<DocUploadRow>) => {
    setUploadRows(prev => {
      const updated = prev.map(r => {
        const merged = { ...r, ...updates };
        if (r.id === rowId && updates.category_id && (!r.title || categories?.some(c => c.id === r.category_id && c.name === r.title) || r.title === '')) {
          const cat = categories?.find(c => c.id === updates.category_id);
          if (cat) merged.title = cat.name;
        }
        return r.id === rowId ? merged : r;
      });
      const last = updated[updated.length - 1];
      if (last.file) {
        return [...updated, makeRow()];
      }
      return updated;
    });
  };

  const removeRow = (rowId: string) => {
    setUploadRows(prev => {
      const filtered = prev.filter(r => r.id !== rowId);
      return filtered.length === 0 ? [makeRow()] : filtered;
    });
  };

  const handleDownload = async (filePath: string, title: string) => {
    const { data } = await supabase.storage.from('documents').download(filePath);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = title;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleOpenDocument = async (filePath: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const validRows = uploadRows.filter(r => r.file && r.title);

  if (isLoading) return <div className="space-y-4 animate-fade-in">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>;
  if (!tenant) return <p className="text-muted-foreground text-sm p-4">Mieter nicht gefunden.</p>;

  const apt = (tenant as any).apartments;
  const statusLabel = TENANT_STATUSES.find(s => s.value === tenant.status)?.label ?? tenant.status;
  const categoryLabel = apt?.category ? APARTMENT_CATEGORIES.find(c => c.value === apt.category)?.label ?? apt.category : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tenants')}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{tenant.first_name} {tenant.last_name}</h1>
          <p className="text-muted-foreground text-sm">{tenant.email} · {statusLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="font-heading text-base">Kontaktdaten</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Telefon:</span> {tenant.phone || '–'}</p>
            <p><span className="text-muted-foreground">E-Mail:</span> {tenant.email}</p>
            <p><span className="text-muted-foreground">Mietbeginn:</span> {tenant.lease_start ? format(new Date(tenant.lease_start), 'dd.MM.yyyy') : '–'}</p>
            <p><span className="text-muted-foreground">Mietende:</span> {tenant.lease_end ? format(new Date(tenant.lease_end), 'dd.MM.yyyy') : '–'}</p>
          </CardContent>
        </Card>
        {apt && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="font-heading text-base">Apartment</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Nr.:</span> {apt.apartment_number}</p>
              {categoryLabel && <p><span className="text-muted-foreground">Kategorie:</span> {categoryLabel}</p>}
              {apt.street && <p><span className="text-muted-foreground">Adresse:</span> {apt.street}, {apt.city}</p>}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Dokumente hochladen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {uploadRows.map((row) => (
              <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end border border-border/50 rounded-lg p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Titel</Label>
                  <Input placeholder="Dokumenttitel" value={row.title} onChange={e => updateRow(row.id, { title: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kategorie</Label>
                  <Select value={row.category_id} onValueChange={v => updateRow(row.id, { category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                    <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Datei</Label>
                  <Input type="file" onChange={e => updateRow(row.id, { file: e.target.files?.[0] || null })} />
                </div>
                {uploadRows.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeRow(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button className="mt-4 w-full md:w-auto" onClick={() => uploadMutation.mutate(validRows)} disabled={uploadMutation.isPending || validRows.length === 0}>
            <Upload className="h-4 w-4 mr-2" />
            {uploadMutation.isPending ? 'Wird hochgeladen…' : validRows.length > 0 ? `${validRows.length} Dokument${validRows.length > 1 ? 'e' : ''} hochladen` : 'Dokumente hochladen'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Dokumente ({documents?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Noch keine Dokumente vorhanden.</p>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => {
                const cat = (doc as any).document_categories;
                return (
                  <div key={doc.id} className="flex items-center justify-between py-3 px-3 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleOpenDocument(doc.file_path)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {cat?.name && `${cat.name} · `}
                        {format(new Date(doc.created_at), 'dd.MM.yyyy')}
                        {doc.file_type && ` · ${doc.file_type.toUpperCase()}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleDownload(doc.file_path, doc.title); }}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
