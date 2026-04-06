import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';

export default function TenantDocuments() {
  const { tenantInfo } = useAuth();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['tenant-documents', tenantInfo?.tenant_id],
    queryFn: async () => {
      const { data } = await supabase.from('documents').select('*, document_categories(name, sort_order)')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!tenantInfo,
  });

  const grouped = (documents ?? []).reduce<Record<string, typeof documents>>((acc, doc) => {
    const cat = (doc as any).document_categories?.name || 'Sonstige';
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(doc);
    return acc;
  }, {});

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

  const handleOpen = async (filePath: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Meine Dokumente</h1>
        <p className="text-muted-foreground text-sm mt-1">Alle Ihnen zugewiesenen Dokumente nach Kategorien</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">Noch keine Dokumente vorhanden.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, docs]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {docs!.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-3 px-3 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleOpen(doc.file_path)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), 'dd.MM.yyyy')}
                        {doc.file_type && ` · ${doc.file_type.toUpperCase()}`}
                        {doc.file_size && ` · ${(doc.file_size / 1024).toFixed(0)} KB`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleDownload(doc.file_path, doc.title); }}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
